<template>
  <transition name="pop">
    <Popup
      v-if="
        (popup.state && popup.content.title === 'About Legacy Scrobbler') ||
        (popup.state && !settingsMenu)
      "
      @handleConnect="handleConnect"
      @handleLogin="handleLogin"
    ></Popup>
  </transition>

  <transition name="pop">
    <ErrorPopup v-if="errorPopup.state"></ErrorPopup>
  </transition>

  <transition name="pop">
    <TrackStatusPopup v-if="trackStatuses.length > 0" :tracks="trackStatuses" />
  </transition>

  <div
    :class="{
      dragable: !settingsMenu,
      'dragable-small': settingsMenu
    }"
  ></div>
  <transition name="fade">
    <div class="defocus" v-if="settingsMenu"></div>
  </transition>

  <transition name="slide">
    <AppSettings
      v-if="settingsMenu"
      class="settings"
      @closeSettings="toggleSettings"
    />
  </transition>

  <div class="app">
    <AppMenu
      @getNewTracks="getTracklist"
      @clearPlayCounts="clearPlayCounts(true)"
      @scrobbleNewTracks="scrobbleNewTracks"
      @ejectDevice="handleEjectDevice"
      @openSettings="toggleSettings"
      :is-loading="isLoading"
      :is-uploading="isUploading"
      :is-ejecting="isEjecting"
    />
    <div class="content">
      <component :is="renderComponent.component" v-bind="renderComponent.props" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'

import AppMenu from './components/AppMenu.vue'
import AppSettings from './components/AppSettings.vue'
import NotConnected from './views/NotConnected.vue'
import ReadyToSync from './views/ReadyToSync.vue'
import LibraryScrobbled from './views/LibraryScrobbled.vue'
import UpToDate from './views/UpToDate.vue'
import RecentTracks from './views/RecentTracks.vue'
import LoadingView from './views/LoadingView.vue'
import UploadingView from './views/UploadingView.vue'
import Popup from './components/Popup.vue'
import ErrorPopup from './components/ErrorPopup.vue'
import TrackStatusPopup from './components/TrackStatusPopup.vue'

import { useStates } from './composables/useStates.js'

const {
  deviceState,
  popup,
  errorPopup,
  setDeviceState,
  showAccessPopup,
  showErrorPopup,
  showConnectPopup
} = useStates()

import { useTracklist } from './composables/useTracklist.js'
const {
  tracklist,
  selectedTracklist,
  scrobbled,
  scanSummary,
  lastSync,
  updateTracklist,
  clearScrobbled,
  setScrobbledSummary,
  setScanSummary,
  clearScanSummary,
  setLastSync,
  clearTracklist
} = useTracklist()

import { usePrefs } from './composables/usePrefs.js'
const { preferences, getPreferences, setPreferences } = usePrefs()

import { useTrackStatuses } from './composables/useTrackStatuses.js'
const { trackStatuses, addTrackStatus, updateTrackStatus } = useTrackStatuses()

import {
  updateProfile,
  scrobbleTracks,
  scrobbleTracksIndividually,
  login,
  connectLastFm,
  filterTracksForLedger,
  countAlreadySyncedPlays
} from './utils/lastfm.js'

const isLoading = ref(false)
const isUploading = ref(false)
const isEjecting = ref(false)
const settingsMenu = ref(false)

const processing = ref(false)
const missingDevicePathNotified = ref(false)
const ledgerCalloutDismissed = ref(false)

const debugEnabled = import.meta.env.DEV
const logDebug = (...args) => {
  if (debugEnabled) {
    console.log('[debug]', ...args)
  }
}
const toPlainObject = value => {
  try {
    return JSON.parse(JSON.stringify(value ?? {}))
  } catch (error) {
    console.error('Error serializing value:', error)
    return {}
  }
}

const path = ref()
let isPolling = false
const hasScanned = ref(false)
const scanStatus = ref('')
const uploadStatus = ref('')

const updatePathFromPrefs = () => {
  if (!preferences.devicePath) {
    path.value = ''
    return
  }
  const trimmed = preferences.devicePath.replace(/[\\/]+$/, '')
  path.value = `${trimmed}/iPod_Control/iTunes/`
  missingDevicePathNotified.value = false
}

const ensureDevicePath = () => {
  if (!preferences.devicePath || !path.value) {
    if (!missingDevicePathNotified.value) {
      showErrorPopup('Device path not set. Please select your iPod in Settings.')
      missingDevicePathNotified.value = true
      settingsMenu.value = true
    }
    setDeviceState('not-connected')
    return false
  }
  return true
}

const showScrobbleSummary = computed(() => {
  if (scrobbled.state) {
    return true
  }
  if (!hasScanned.value) {
    return false
  }
  if (lastSync.tracks <= 0) {
    return false
  }
  if (!scanSummary.scannedAt) {
    return true
  }
  return lastSync.syncedAt >= scanSummary.scannedAt
})

const dismissLedgerCallout = reason => {
  ledgerCalloutDismissed.value = true
  logDebug('ledger callout dismissed', { reason })
}

const resetLedgerCallout = () => {
  ledgerCalloutDismissed.value = false
}

const handleClearPlayCounts = async () => {
  dismissLedgerCallout('clear')
  logDebug('clear play counts requested')
  await clearPlayCounts(false)
}

const handleEjectDevice = async () => {
  if (isEjecting.value) {
    return
  }
  if (!ensureDevicePath()) {
    return
  }
  isEjecting.value = true
  processing.value = true
  logDebug('eject device start')
  try {
    const result = await window.ipc.ejectDevice(preferences.devicePath)
    if (!result?.status) {
      showErrorPopup(result?.message || 'Unable to eject the iPod.')
      return
    }
    logDebug('eject device success')
  } catch (error) {
    console.error('Error ejecting device:', error)
    showErrorPopup('Unable to eject the iPod.')
  } finally {
    isEjecting.value = false
    processing.value = false
    await getDeviceState()
  }
}

const getDeviceKey = () => {
  if (!preferences.devicePath) {
    logDebug('deviceKey missing devicePath')
    return ''
  }
  return preferences.devicePath.replace(/[\\/]+$/, '')
}

const getDeviceLedger = () => {
  const deviceKey = getDeviceKey()
  if (!deviceKey) {
    logDebug('getDeviceLedger no deviceKey')
    return {}
  }
  return preferences.syncLedger?.[deviceKey]?.tracks || {}
}

const updateDeviceLedger = async ledgerUpdates => {
  if (!ledgerUpdates || Object.keys(ledgerUpdates).length === 0) {
    logDebug('updateDeviceLedger no updates')
    return
  }
  const deviceKey = getDeviceKey()
  if (!deviceKey) {
    logDebug('updateDeviceLedger missing deviceKey')
    return
  }
  const syncLedger = preferences.syncLedger || {}
  const deviceLedger = syncLedger[deviceKey]?.tracks || {}
  const updatedAt = Math.floor(Date.now() / 1000)
  const updatedTracks = {
    ...toPlainObject(deviceLedger),
    ...toPlainObject(ledgerUpdates)
  }
  logDebug('updateDeviceLedger', {
    deviceKey,
    updates: Object.keys(ledgerUpdates).length,
    total: Object.keys(updatedTracks).length
  })
  try {
    await setPreferences('singleConfig', 'syncLedger', {
      [deviceKey]: { tracks: updatedTracks, updatedAt }
    })
  } catch (error) {
    console.error('Error updating sync ledger:', error)
    showErrorPopup(
      'Scrobbles sent, but the local ledger could not be updated. You may see duplicates next sync.'
    )
  }
}

const clearDeviceLedger = async () => {
  const deviceKey = getDeviceKey()
  if (!deviceKey) {
    logDebug('clearDeviceLedger missing deviceKey')
    return
  }
  const updatedAt = Math.floor(Date.now() / 1000)
  logDebug('clearDeviceLedger', { deviceKey })
  try {
    await setPreferences('singleConfig', 'syncLedger', {
      [deviceKey]: { tracks: {}, updatedAt }
    })
  } catch (error) {
    console.error('Error clearing sync ledger:', error)
  }
}

const calculatePlaytimeFromScrobbles = scrobbles => {
  return scrobbles.reduce((acc, track) => {
    if (!Number.isFinite(track.length)) {
      return acc
    }
    return acc + Math.floor(track.length / 1000)
  }, 0)
}

// render the component based on the current state
const renderComponent = computed(() => {
  logDebug('renderComponent', {
    deviceState: deviceState.value,
    isLoading: isLoading.value,
    isUploading: isUploading.value,
    trackCount: tracklist.length,
    scrobbledTracks: scrobbled.tracks,
    scrobbledState: scrobbled.state,
    hasScanned: hasScanned.value
  })
  if (isLoading.value) {
    return {
      component: LoadingView,
      props: { message: scanStatus.value }
    }
  } else if (isUploading.value) {
    return {
      component: UploadingView,
      props: { message: uploadStatus.value }
    }
  } else {
    if (deviceState.value === 'not-connected') {
      return {
        component: NotConnected,
        props: {}
      }
    } else if (deviceState.value === 'ready') {
      if (tracklist.length > 0) {
        return {
          component: RecentTracks,
          props: {}
        }
      } else if (showScrobbleSummary.value) {
        return {
          component: LibraryScrobbled,
          props: {
            onClearPlayCounts: handleClearPlayCounts,
            onDismissLedgerCallout: () => dismissLedgerCallout('keep'),
            calloutDismissed: ledgerCalloutDismissed.value
          }
        }
      } else {
        return {
          component: hasScanned.value ? UpToDate : ReadyToSync,
          props: hasScanned.value
            ? {
                onClearPlayCounts: handleClearPlayCounts,
                onDismissLedgerCallout: () => dismissLedgerCallout('keep'),
                calloutDismissed: ledgerCalloutDismissed.value
              }
            : {}
        }
      }
    } else if (deviceState.value === 'no-plays') {
      if (showScrobbleSummary.value) {
        return {
          component: LibraryScrobbled,
          props: {
            onClearPlayCounts: handleClearPlayCounts,
            onDismissLedgerCallout: () => dismissLedgerCallout('keep'),
            calloutDismissed: ledgerCalloutDismissed.value
          }
        }
      } else {
        return {
          component: UpToDate,
          props: {
            onClearPlayCounts: handleClearPlayCounts,
            onDismissLedgerCallout: () => dismissLedgerCallout('keep'),
            calloutDismissed: ledgerCalloutDismissed.value
          }
        }
      }
    }
  }
  return {
    component: LoadingView,
    props: { message: scanStatus.value }
  }
})

// get the tracklist from the iPod
const getTracklist = async () => {
  if (processing.value || isLoading.value || isUploading.value) {
    logDebug('getTracklist skipped', {
      processing: processing.value,
      isLoading: isLoading.value,
      isUploading: isUploading.value
    })
    return
  }
  if (!ensureDevicePath()) {
    processing.value = false
    return
  }
  console.log('Getting Tracklist')
  logDebug('getTracklist start', { deviceState: deviceState.value })
  processing.value = true
  await getDeviceState()
  await clearTracklist()
  await clearScrobbled()
  clearScanSummary()
  try {
    if (deviceState.value !== 'ready') {
      const scannedAt = Math.floor(Date.now() / 1000)
      setScanSummary(0, 0, scannedAt, false)
      hasScanned.value = true
      logDebug('getTracklist no plays or not ready', {
        deviceState: deviceState.value,
        scannedAt
      })
      processing.value = false
      return
    }
    // only get the library when the device is ready and not loading
    if (!isLoading.value && deviceState.value === 'ready') {
      isLoading.value = true
      scanStatus.value = 'Reading iPod database...'
      const receivedRecentTracks = await window.ipc.readFile(
        path.value,
        'getLibrary'
      )
      const scannedAt = Math.floor(Date.now() / 1000)
      logDebug('getTracklist readLibrary', {
        receivedTracks: receivedRecentTracks?.length || 0
      })
      scanStatus.value = 'Checking plays against ledger...'
      const deviceLedger = getDeviceLedger()
      const filteredTracks = filterTracksForLedger(
        receivedRecentTracks,
        deviceLedger
      )
      updateTracklist(filteredTracks)
      const alreadySyncedPlays = countAlreadySyncedPlays(
        receivedRecentTracks,
        deviceLedger
      )
      setScanSummary(alreadySyncedPlays, filteredTracks.length, scannedAt, true)
      logDebug('getTracklist summary', {
        filteredTracks: filteredTracks.length,
        alreadySyncedPlays,
        scannedAt
      })
      const trackCount = filteredTracks.length
      scanStatus.value = trackCount > 0
        ? `Found ${trackCount} track${trackCount !== 1 ? 's' : ''} to sync.`
        : 'No new plays found.'
      hasScanned.value = true
      logDebug('getTracklist complete', {
        hasScanned: hasScanned.value,
        autoUpload: preferences.autoUpload
      })
      // if (tracklist.length === 0) {
      //   processing.value = false
      // }
      isLoading.value = false
      // if the autoUpload is enabled, scrobble the new tracks
      if (preferences.autoUpload && filteredTracks.length > 0) {
        await scrobbleNewTracks()
      } else {
        processing.value = false
      }
    } else {
      processing.value = false
    }
  } catch (error) {
    console.error('Error getting tracklist:', error)
    showErrorPopup(
      'Error getting Tracks from device. Maybe the Play Count file is corrupted?'
    )
    isLoading.value = false
    processing.value = false
  }
}

const clearPlayCounts = async resetScrobbled => {
  if (!ensureDevicePath()) {
    return
  }
  console.log('Clearing Playcounts')
  logDebug('clearPlayCounts start', { resetScrobbled })
  const deletedFile = await window.ipc.deletePlaycount(path.value)
  if (deletedFile) {
    console.log('Deleted Playcounts')
    logDebug('clearPlayCounts success')
    await clearTracklist()
    await clearDeviceLedger()
    clearScanSummary()
    if (resetScrobbled) {
      await clearScrobbled()
    }
    await getDeviceState()
  } else {
    showErrorPopup('Error deleting Play Count file')
  }
}

const getDeviceState = async () => {
  if (!ensureDevicePath()) {
    return
  }
  // previousDeviceState is used to check if the device state has changed
  const previousDeviceState = deviceState.value
  const receivedDeviceState = await window.ipc.readFile(
    path.value,
    'getDeviceState'
  )
  logDebug('getDeviceState', { previousDeviceState, receivedDeviceState })
  if (receivedDeviceState === 'not-connected') {
    setDeviceState('not-connected')
    if (previousDeviceState !== 'not-connected') {
      logDebug('device disconnected, clearing state')
      await clearTracklist()
      await clearScrobbled()
      hasScanned.value = false
      clearScanSummary()
    }
  } else if (receivedDeviceState === 'no-plays') {
    setDeviceState('no-plays')
    if (previousDeviceState === 'not-connected') {
      const scannedAt = Math.floor(Date.now() / 1000)
      setScanSummary(0, 0, scannedAt, false)
      hasScanned.value = true
      logDebug('device no-plays after connect', { scannedAt })
    }
    if (previousDeviceState === 'ready') {
      logDebug('device no-plays, clearing tracklist')
      await clearTracklist()
    }
  } else if (receivedDeviceState === 'ready') {
    setDeviceState('ready')
    if (previousDeviceState !== 'ready') {
      logDebug('device ready, resetting scan state')
      await clearTracklist()
      await clearScrobbled()
      hasScanned.value = false
      clearScanSummary()
    }
  }
  // only console.log the device state if it has changed
  if (receivedDeviceState !== previousDeviceState) {
    console.log('Device-State: ', receivedDeviceState)
  }
}

const toggleSettings = () => {
  settingsMenu.value = !settingsMenu.value
}

const pollDeviceState = async () => {
  if (isPolling) {
    logDebug('pollDeviceState skipped, already polling')
    return
  }
  isPolling = true
  try {
    await getDeviceState()
    if (deviceState.value === 'ready' && preferences.autoScan) {
      if (
        !hasScanned.value &&
        !isLoading.value &&
        !isUploading.value &&
        tracklist.length === 0 &&
        scrobbled.state === false
      ) {
        logDebug('pollDeviceState triggering autoScan')
        await getTracklist()
      } else {
        logDebug('pollDeviceState autoScan skipped', {
          hasScanned: hasScanned.value,
          isLoading: isLoading.value,
          isUploading: isUploading.value,
          trackCount: tracklist.length,
          scrobbledState: scrobbled.state
        })
      }
    } else {
      logDebug('pollDeviceState autoScan disabled or not ready', {
        deviceState: deviceState.value,
        autoScan: preferences.autoScan
      })
    }
  } finally {
    isPolling = false
  }
}

const scrobbleNewTracks = async () => {
  if (isLoading.value || isUploading.value) {
    logDebug('scrobbleNewTracks skipped', {
      isLoading: isLoading.value,
      isUploading: isUploading.value
    })
    return
  }
  console.log('Uploading New Tracks')
  processing.value = true
  isUploading.value = true
  const trackCount = selectedTracklist.length
  uploadStatus.value = `Sending ${trackCount} track${trackCount !== 1 ? 's' : ''} to Last.fm...`
  logDebug('scrobbleNewTracks start', { trackCount })

  try {
    const deviceLedger = getDeviceLedger()
    logDebug('scrobbleNewTracks ledger', {
      ledgerTracks: Object.keys(deviceLedger).length
    })
    const { status, scrobbles, skipped, ledgerUpdates } = await scrobbleTracks(
      selectedTracklist,
      deviceLedger
    )
    logDebug('scrobbleNewTracks batchResult', {
      status,
      scrobbles: scrobbles.length,
      skipped: skipped.length,
      ledgerUpdates: Object.keys(ledgerUpdates).length
    })

    if (status) {
      console.log('Tracks Scrobbled')
      uploadStatus.value = 'Finalizing sync...'
      resetLedgerCallout()
      setScrobbledSummary(scrobbles, skipped)
      scrobbled.playtime = calculatePlaytimeFromScrobbles(scrobbles)
      setLastSync(scrobbles, skipped, scrobbled.playtime)
      await updateDeviceLedger(ledgerUpdates)
      await clearTracklist()
      if (preferences.autoDelete) {
        await clearPlayCounts(false)
      }
    } else {
      if (scrobbles.length === 0 && skipped.length > 0) {
        showErrorPopup('No valid tracks to scrobble. Missing track metadata.')
        setScrobbledSummary([], skipped)
        scrobbled.playtime = 0
        scrobbled.state = false
        return
      }
      uploadStatus.value = 'Retrying tracks individually...'
      selectedTracklist.forEach(track => {
        addTrackStatus(track, 'pending')
      })
      const {
        failedTracks,
        scrobbles: submittedScrobbles,
        skipped: skippedTracks,
        ledgerUpdates: fallbackLedgerUpdates
      } = await scrobbleTracksIndividually(
        selectedTracklist,
        updateTrackStatus,
        deviceLedger
      )
      logDebug('scrobbleNewTracks fallbackResult', {
        failed: failedTracks.length,
        scrobbles: submittedScrobbles.length,
        skipped: skippedTracks.length,
        ledgerUpdates: Object.keys(fallbackLedgerUpdates).length
      })
      console.log('Some tracks failed', failedTracks)
      resetLedgerCallout()
      setScrobbledSummary(submittedScrobbles, skippedTracks)
      scrobbled.playtime = calculatePlaytimeFromScrobbles(submittedScrobbles)
      setLastSync(submittedScrobbles, skippedTracks, scrobbled.playtime)
      await updateDeviceLedger(fallbackLedgerUpdates)

      failedTracks.forEach((track) => {
        const index = selectedTracklist.findIndex(
          (t) => t.track === track.track && t.artist === track.artist
        )
        if (index !== -1) {
          selectedTracklist.splice(index, 1)
        }
      })

      const hasFailures = failedTracks.length > 0 || skippedTracks.length > 0
      if (preferences.autoDelete && !hasFailures) {
        await clearPlayCounts(false)
      }
    }
  } catch (error) {
    console.error('Error uploading tracks:', error)
    showErrorPopup('Error uploading tracks. Please try again.')
  } finally {
    logDebug('scrobbleNewTracks finalize', {
      scrobbledTracks: scrobbled.tracks,
      scrobbledState: scrobbled.state
    })
    isUploading.value = false
    processing.value = false
    scrobbled.state = scrobbled.tracks > 0
  }
}

async function checkProfile () {
  const login = await updateProfile()
  if (login) {
    preferences.lastFm.loggedIn = true
    console.log('Logged in')
  } else {
    preferences.lastFm.loggedIn = false
    showAccessPopup()
  }
}

async function handleConnect () {
  await connectLastFm()
  showConnectPopup()
}

async function handleLogin () {
  const userToken = preferences.lastFm.userToken
  const { status, message } = await login(userToken)
  console.log(status, message)
  if (status) {
    console.log('Logged in')
    preferences.lastFm.loggedIn = true
    popup.state = false
    updateProfile()
    settingsMenu.value = true
  } else {
    showErrorPopup(message)
    preferences.lastFm.loggedIn = false
  }
}

onMounted(async () => {
  await getPreferences('fullConfig')
  updatePathFromPrefs()
  ensureDevicePath()

  await checkProfile()
  await pollDeviceState()

  let intervalId = null

  const stopInterval = intervalId => {
    clearInterval(intervalId)
  }

  const startInterval = () => {
    intervalId = setInterval(() => {
      if (!settingsMenu.value && !processing.value) {
        pollDeviceState()
      }
    }, 2500)
  }

  startInterval()

  watch(settingsMenu, () => {
    stopInterval(intervalId)
    startInterval()
  })

  watch(
    () => preferences.devicePath,
    () => {
      updatePathFromPrefs()
      if (!preferences.devicePath) {
        ensureDevicePath()
      }
    }
  )
})
</script>

<style>
:root {
  --off-white: #f2f2f7;
  --lightgrey: #e6e6e6;
  --grey: rgba(11, 18, 21, 0.5);
  --red: #ec2d25;
}

@font-face {
  font-family: 'Barlow-Regular';
  src: url('./assets/fonts/Barlow-Regular.otf') format('opentype');
}

@font-face {
  font-family: 'Barlow-Bold';
  src: url('./assets/fonts/Barlow-Bold.otf') format('opentype');
}

@font-face {
  font-family: 'Barlow-Light';
  src: url('./assets/fonts/Barlow-Light.otf') format('opentype');
}

body {
  font-family: 'Barlow', sans-serif;
  user-select: none;
  overflow: hidden;
  background-color: var(--off-white);
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

p {
  margin: 0px;
  font-family: 'Barlow', sans-serif;
  user-select: none;
  overflow: hidden;
}

h1 {
  margin: 0px;
  font-size: 20px;
  font-family: 'Barlow-Bold', sans-serif;
  user-select: none;
}

button {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 35px;
  width: 100%;
  padding: 8px 15px 8px 15px;
  margin: 25px 0 0 0;
  color: white;
  border: none;
  background-color: var(--red);
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 16px;
}

button:hover {
  background-color: #d32f2f;
}

.dragable {
  position: absolute;
  width: calc(100vw - 25px * 4 - 55px);
  height: 50px;
  -webkit-app-region: drag;
}

.dragable-small {
  position: absolute;
  width: calc(100vw - 330px);
  height: 50px;
  -webkit-app-region: drag;
}

.bold {
  font-family: 'Barlow-Bold', sans-serif;
}

.thin {
  font-family: 'Barlow-Thin', sans-serif;
}

.defocus {
  position: absolute;
  width: 100vw;
  height: 100vh;
  background-color: black;
  opacity: 0.1;
  z-index: 10;
  transition: background-color 0.5s;
}

.settings {
  position: absolute;
  right: 0;
  top: 0;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  display: flex;
  flex-grow: 1;
  overflow-y: auto;
  flex-direction: column;
}

.content-view {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  flex-grow: 1;
  font-size: 16px;
  text-align: center;
}

.content-view p {
  color: var(--grey);
}

.device {
  width: 150px;
  opacity: 0.2;
  margin-bottom: 20px;
}

.popup-container {
  position: absolute;
  width: 100vw;
  height: 100vh;
  z-index: 30;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgb(0, 0, 0, 0.1);
}

.credits {
  padding-top: 10px;
  font-size: 12px;
  width: 100%;
}

.popup p b {
  font-family: 'Barlow-Bold', sans-serif;
}

.slide-enter-active {
  transition: transform 0.4s ease;
}

.slide-leave-active {
  transition: transform 0.4s ease;
}

.slide-leave-to,
.slide-enter-from {
  transform: translateX(330px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.pop-enter-active {
  transition: transform 0.1s ease, opacity 0.1s ease 0.1s;
}

.pop-enter-from {
  transform: scale(0.8);
  opacity: 0;
}

.pop-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease 0.1s;
}

.pop-leave-to {
  transform: scale(0.8);
  opacity: 0;
}
</style>
