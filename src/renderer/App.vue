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
      @openSettings="toggleSettings"
      :is-loading="isLoading"
      :is-uploading="isUploading"
    />
    <div class="content">
      <component :is="renderComponent.component" />
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
  playtime,
  scrobbled,
  updateTracklist,
  clearScrobbled,
  clearTracklist
} = useTracklist()

import { usePrefs } from './composables/usePrefs.js'
const { preferences, getPreferences } = usePrefs()

import {
  updateProfile,
  scrobbleTracks,
  login,
  connectLastFm
} from './utils/lastfm.js'

const isLoading = ref(false)
const isUploading = ref(false)
const settingsMenu = ref(false)

const processing = ref(false)

const path = ref()

// render the component based on the current state
const renderComponent = computed(() => {
  if (isLoading.value) {
    return {
      component: LoadingView
    }
  } else if (isUploading.value) {
    return {
      component: UploadingView
    }
  } else {
    if (deviceState.value === 'not-connected') {
      return {
        component: NotConnected
      }
    } else if (deviceState.value === 'ready') {
      if (tracklist.length === 0 && scrobbled.tracks === 0) {
        return {
          component: ReadyToSync
        }
      } else if (tracklist.length > 0) {
        return {
          component: RecentTracks
        }
      } else if (scrobbled.state) {
        return {
          component: LibraryScrobbled
        }
      }
    } else if (deviceState.value === 'no-plays') {
      if (scrobbled.state) {
        return {
          component: LibraryScrobbled
        }
      } else {
        return {
          component: UpToDate
        }
      }
    }
  }
  return {
    component: LoadingView
  }
})

// get the tracklist from the iPod
const getTracklist = async () => {
  console.log('Getting Tracklist')
  processing.value = true
  await getDeviceState()
  await clearTracklist()
  await clearScrobbled()
  try {
    // only get the library when the device is ready and not loading
    if (!isLoading.value && deviceState.value === 'ready') {
      isLoading.value = true
      const receivedRecentTracks = await window.ipc.readFile(
        path.value,
        'getLibrary'
      )
      updateTracklist(receivedRecentTracks)
      // if (tracklist.length === 0) {
      //   processing.value = false
      // }
      isLoading.value = false
      // if the autoUpload is enabled, scrobble the new tracks
      if (preferences.autoUpload) {
        scrobbleNewTracks()
      }
    } else {
      processing.value = false
    }
  } catch (error) {
    showErrorPopup(
      'Error getting Tracks from device. Maybe the Play Count file is corrupted?'
    )
  }
}

const clearPlayCounts = async resetScrobbled => {
  console.log('Clearing Playcounts')
  const deletedFile = await window.ipc.deletePlaycount(path.value)
  if (deletedFile) {
    console.log('Deleted Playcounts')
    await clearTracklist()
    if (resetScrobbled) {
      await clearScrobbled()
    }
    await getDeviceState()
  } else {
    showErrorPopup('Error deleting Play Count file')
  }
}

const getDeviceState = async () => {
  // previousDeviceState is used to check if the device state has changed
  const previousDeviceState = deviceState.value
  const receivedDeviceState = await window.ipc.readFile(
    path.value,
    'getDeviceState'
  )
  if (receivedDeviceState === 'not-connected') {
    setDeviceState('not-connected')
  } else if (receivedDeviceState === 'no-plays') {
    setDeviceState('no-plays')
    // if the device state changed from ready to no-plays
    // that means the PlayCount file was deleted by synchronizing the iPod using another App -> clear the playcounts back to default
    if (previousDeviceState === 'ready' && scrobbled.state === true) {
      console.log('iPod was synchronized with another App')
      await clearPlayCounts(true)
    }
  } else if (receivedDeviceState === 'ready') {
    setDeviceState('ready')
  }
  // only console.log the device state if it has changed
  if (receivedDeviceState !== previousDeviceState) {
    console.log('Device-State: ', receivedDeviceState)
  }
}

const toggleSettings = () => {
  settingsMenu.value = !settingsMenu.value
}

const scrobbleNewTracks = async () => {
  console.log('Uploading New Tracks');
  isUploading.value = true;
  processing.value = true;

  // Add missing 'artist' and 'album' fields to tracks
  const fixedTracklist = selectedTracklist.map(track => ({
    ...track,
    artist: track.artist || "Unknown Artist", // Default to "Unknown Artist" if missing
    album: track.album || "Unknown Album",   // Default to "Unknown Album" if missing
  }));

  try {
    // Send the entire fixed tracklist
    const { status, message } = await scrobbleTracks(fixedTracklist);

    if (status) {
      console.log('Tracks Scrobbled Successfully');
      scrobbled.tracks = fixedTracklist.length;
      scrobbled.playtime = fixedTracklist.reduce((sum, track) => sum + track.length, 0);
      await clearTracklist(); // Clear the tracklist

      // If autoDelete is enabled, clear play counts
      if (preferences.autoDelete) {
        await clearPlayCounts(false);
      }
    } else {
      console.error('Failed to scrobble tracks:', message);
      showErrorPopup(`Failed to scrobble tracks: ${message}`);
    }
  } catch (error) {
    console.error('Error scrobbling tracks:', error);
    showErrorPopup(`An error occurred while scrobbling: ${error.message}`);
  } finally {
    isUploading.value = false;
    processing.value = false;
    scrobbled.state = true;
  }
};

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

  await checkProfile()
  path.value = preferences.devicePath + '/iPod_Control/iTunes/'

  let intervalId = null

  const stopInterval = intervalId => {
    clearInterval(intervalId)
  }

  const startInterval = () => {
    intervalId = setInterval(() => {
      if (!settingsMenu.value && !processing.value) {
        if (
          deviceState.value === 'not-connected' ||
          deviceState.value === 'no-plays'
        ) {
          getDeviceState()
        } else if (deviceState.value === 'ready' && preferences.autoScan) {
          if (scrobbled.state === false) {
            getTracklist()
          } else {
            getDeviceState()
          }
        }
      }
    }, 2500)
  }

  startInterval()

  watch(settingsMenu, () => {
    stopInterval(intervalId)
    startInterval()
  })
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
