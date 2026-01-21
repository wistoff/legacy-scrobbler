const serverUrl = 'https://api.legacyscrobbler.software'
// const serverUrl = 'http://localhost:3000'
import axios from 'axios'

import { usePrefs } from '../composables/usePrefs.js'
const { preferences, setPreferences, getPreferences } = usePrefs()

const debugEnabled = import.meta.env.DEV
const logDebug = (...args) => {
  if (debugEnabled) {
    console.log('[debug]', ...args)
  }
}

const MIN_TRACK_SECONDS = 40
const SHORT_TRACK_SECONDS = 60
const DEFAULT_TRACK_SECONDS = 180
const SCROBBLE_BUFFER_SECONDS = 30

// Network connectivity check
export async function checkNetworkConnection () {
  try {
    await axios.get(`${serverUrl}/authenticate`, { timeout: 5000 })
    return { online: true, error: null }
  } catch (error) {
    const isNetworkError = error.code === 'ERR_NETWORK' ||
                           error.message === 'Network Error' ||
                           error.code === 'ENOTFOUND' ||
                           error.message.includes('ERR_INTERNET_DISCONNECTED')
    return {
      online: false,
      error: isNetworkError ? 'No internet connection' : error.message
    }
  }
}

function isNonEmptyString (value) {
  return typeof value === 'string' && value.trim().length > 0
}

function clampTimestampSeconds (timestamp) {
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return now
  }
  return Math.min(timestamp, now)
}

function getSpacingSeconds (trackLengthMs) {
  const lengthMs = Number.isFinite(trackLengthMs) && trackLengthMs > 0
    ? trackLengthMs
    : DEFAULT_TRACK_SECONDS * 1000
  let seconds = Math.floor(lengthMs / 1000)
  if (seconds < MIN_TRACK_SECONDS) {
    seconds = SHORT_TRACK_SECONDS
  }
  return seconds + SCROBBLE_BUFFER_SECONDS
}

function isValidTrackMeta (track) {
  return isNonEmptyString(track?.track) && isNonEmptyString(track?.artist)
}

function normalizePlayCount (playCount) {
  if (!Number.isFinite(playCount)) {
    return 0
  }
  return Math.max(0, Math.floor(playCount))
}

function normalizeLastPlayed (lastPlayed) {
  if (!Number.isFinite(lastPlayed)) {
    return 0
  }
  return Math.max(0, Math.floor(lastPlayed))
}

function buildTrackKey (track) {
  const id = Number.isFinite(track?.id) ? track.id : 'no-id'
  const name = track?.track || ''
  const artist = track?.artist || ''
  const album = track?.album || ''
  const length = Number.isFinite(track?.length) ? track.length : ''
  return `${id}::${name}::${artist}::${album}::${length}`
}

function resolveLedgerState (track, ledgerEntry) {
  const playCount = normalizePlayCount(track.playCount)
  const storedCount = normalizePlayCount(ledgerEntry?.count)
  const storedLastPlayed = normalizeLastPlayed(ledgerEntry?.lastPlayed)
  const lastPlayed = normalizeLastPlayed(track.lastPlayed)
  const resetDetected = playCount < storedCount
  const hasNewTimestamp = lastPlayed > storedLastPlayed
  const ignoreLedger = resetDetected && hasNewTimestamp
  const treatAsAlreadySynced = resetDetected && !hasNewTimestamp

  return {
    playCount,
    storedCount,
    storedLastPlayed,
    lastPlayed,
    resetDetected,
    hasNewTimestamp,
    previousCount: ignoreLedger ? 0 : storedCount,
    treatAsAlreadySynced
  }
}

function buildScrobbles (track, count, anchorTimestamp) {
  const safeTimestamp = clampTimestampSeconds(anchorTimestamp)
  if (count <= 1) {
    return [{ ...track, lastPlayed: safeTimestamp }]
  }

  const spacingSeconds = getSpacingSeconds(track.length)
  const scrobbles = []
  for (let i = count - 1; i >= 0; i--) {
    scrobbles.push({
      ...track,
      lastPlayed: safeTimestamp - (i * spacingSeconds)
    })
  }
  return scrobbles
}

function prepareScrobbles (tracklist, allowRepeat, ledger, now) {
  const scrobbles = []
  const skipped = []
  const ledgerUpdates = {}
  let validTrackCount = 0
  let deltaPlayCount = 0
  let repeatResetCount = 0
  let repeatResetWithNewTimestamp = 0

  tracklist.forEach(track => {
    if (!isValidTrackMeta(track)) {
      skipped.push(track)
      return
    }
    validTrackCount += 1

    const key = buildTrackKey(track)
    const state = resolveLedgerState(track, ledger?.[key])
    if (state.playCount <= 0) {
      return
    }

    if (state.resetDetected) {
      repeatResetCount += 1
      if (state.hasNewTimestamp) {
        repeatResetWithNewTimestamp += 1
      }
    }

    if (state.treatAsAlreadySynced) {
      return
    }
    const deltaCount = allowRepeat
      ? Math.max(0, state.playCount - state.previousCount)
      : (state.playCount > state.previousCount ? 1 : 0)

    if (deltaCount <= 0) {
      return
    }

    const anchorTimestamp = state.previousCount > 0 ? now : state.lastPlayed
    scrobbles.push(...buildScrobbles(track, deltaCount, anchorTimestamp))
    deltaPlayCount += deltaCount
    ledgerUpdates[key] = {
      count: state.playCount,
      lastPlayed: state.lastPlayed,
      syncedAt: now
    }
  })

  logDebug('prepareScrobbles', {
    inputTracks: tracklist.length,
    validTrackCount,
    scrobbles: scrobbles.length,
    skipped: skipped.length,
    ledgerUpdates: Object.keys(ledgerUpdates).length,
    allowRepeat,
    deltaPlayCount,
    repeatResetCount,
    repeatResetWithNewTimestamp
  })

  return {
    scrobbles: deconflictScrobbles(scrobbles),
    skipped,
    ledgerUpdates
  }
}

function deconflictScrobbles (scrobbles) {
  if (scrobbles.length <= 1) {
    return scrobbles
  }

  const sorted = scrobbles
    .slice()
    .sort((a, b) => b.lastPlayed - a.lastPlayed)

  let previousTimestamp = Math.floor(Date.now() / 1000) + 1
  return sorted.map(scrobble => {
    let timestamp = clampTimestampSeconds(scrobble.lastPlayed)
    if (timestamp >= previousTimestamp) {
      timestamp = previousTimestamp - 1
    }
    previousTimestamp = timestamp
    return { ...scrobble, lastPlayed: timestamp }
  })
}

export function filterTracksForLedger (tracklist, ledger) {
  const filtered = tracklist.filter(track => {
    const key = buildTrackKey(track)
    const state = resolveLedgerState(track, ledger?.[key])
    if (state.playCount <= 0) {
      return false
    }
    if (state.treatAsAlreadySynced) {
      return false
    }
    return state.playCount > state.previousCount
  })
  logDebug('filterTracksForLedger', {
    inputTracks: tracklist.length,
    filteredTracks: filtered.length
  })
  return filtered
}

export function countAlreadySyncedPlays (tracklist, ledger) {
  const total = tracklist.reduce((totalPlays, track) => {
    const key = buildTrackKey(track)
    const state = resolveLedgerState(track, ledger?.[key])
    if (state.playCount <= 0) {
      return totalPlays
    }
    if (state.treatAsAlreadySynced) {
      return totalPlays + state.playCount
    }
    if (state.previousCount <= 0) {
      return totalPlays
    }
    return totalPlays + Math.min(state.playCount, state.previousCount)
  }, 0)
  logDebug('countAlreadySyncedPlays', {
    inputTracks: tracklist.length,
    alreadySynced: total
  })
  return total
}

export async function fetchCreds () {
  try {
    const response = await axios.get(`${serverUrl}/authenticate`)
    const apiKey = response.data[0]
    const userToken = response.data[1]
    return { apiKey, userToken }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

export async function constructUrl (apiKey, userToken) {
  const url = `http://www.last.fm/api/auth/?api_key=${apiKey}&token=${userToken}`
  return url
}

export async function fetchSessionKey (userToken) {
  try {
    const response = await axios.get(`${serverUrl}/session`, {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    })
    if (response.data.length === 0) {
      return 'failed'
    } else {
      return response.data
    }
  } catch (error) {
    console.error('Error:', error.message)
    return 'failed'
  }
}

export async function fetchUserInfo (sessionKey) {
  try {
    const response = await axios.get(`${serverUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${sessionKey}`
      }
    })
    return response.data
  } catch (error) {
    console.error('Error:', error.message)
    return 'failed'
  }
}

export async function login (userToken) {
  try {
    const sessionKey = await fetchSessionKey(userToken)
    if (sessionKey === 'failed') {
      return {
        status: false,
        message:
          'Please return to your Browser and allow Legacy Scrobbler to access your profile.'
      }
    } else {
      await setPreferences('singleConfig', 'lastFm', {
        sessionKey: sessionKey
      })
      return { status: true, message: '' }
    }
  } catch (error) {
    console.log(error)
    return {
      status: false,
      message: 'Legacy Scrobbler service seems to be offline. Sorry.'
    }
  }
}

export async function connectLastFm () {
  const creds = await fetchCreds()
  if (!creds || !creds.apiKey || !creds.userToken) {
    return { success: false, error: 'Unable to connect. Check your internet connection.' }
  }
  const { apiKey, userToken } = creds
  const url = await constructUrl(apiKey, userToken)
  window.open(url, '_blank')
  await setPreferences('singleConfig', 'lastFm', {
    apiKey: apiKey,
    userToken: userToken
  })
  return { success: true, error: null }
}

export async function updateProfile () {
  const receivedUserData = await fetchUserInfo(preferences.lastFm.sessionKey)
  if (receivedUserData === 'failed') {
    return false
  } else {
    await setPreferences('singleConfig', 'lastFm', {
      loggedIn: true,
      username: receivedUserData.user.name,
      profilePicture: receivedUserData.user.image[2]['#text'],
      registered: receivedUserData.user.registered.unixtime
    })
  }
  return true
}

export async function scrobbleTracks (tracklist, ledger = {}) {
  const now = Math.floor(Date.now() / 1000)
  const { scrobbles, skipped, ledgerUpdates } = prepareScrobbles(
    tracklist,
    preferences.repeatScrobbles,
    ledger,
    now
  )
  logDebug('scrobbleTracks', {
    tracklist: tracklist.length,
    scrobbles: scrobbles.length,
    skipped: skipped.length,
    ledgerUpdates: Object.keys(ledgerUpdates).length
  })

  if (scrobbles.length === 0) {
    return { status: false, scrobbles, skipped, ledgerUpdates: {} }
  }

  if (await sendScrobbleRequest(scrobbles)) {
    logDebug('scrobbleTracks success')
    return { status: true, scrobbles, skipped, ledgerUpdates }
  }

  logDebug('scrobbleTracks failed')
  return { status: false, scrobbles, skipped, ledgerUpdates: {} }
}

export async function scrobbleTracksIndividually (tracklist, updateTrackStatus, ledger = {}) {
  const failedTracks = []
  const submittedScrobbles = []
  const skipped = []
  const ledgerUpdates = {}
  const now = Math.floor(Date.now() / 1000)
  logDebug('scrobbleTracksIndividually', { tracklist: tracklist.length })

  const promises = tracklist.map(async (track, index) => {
    try {
      if (!isValidTrackMeta(track)) {
        updateTrackStatus(index, 'failed')
        skipped.push(track)
        failedTracks.push(track)
        return
      }

    const playCount = normalizePlayCount(track.playCount)
    const key = buildTrackKey(track)
    const state = resolveLedgerState(track, ledger?.[key])
    const previousCount = state.treatAsAlreadySynced ? state.playCount : state.previousCount
    const deltaCount = preferences.repeatScrobbles
      ? Math.max(0, state.playCount - previousCount)
      : (state.playCount > previousCount ? 1 : 0)

    if (deltaCount <= 0) {
      updateTrackStatus(index, 'success')
      return
    }

    const anchorTimestamp = previousCount > 0 ? now : state.lastPlayed
    const scrobbleList = buildScrobbles(track, deltaCount, anchorTimestamp)
    const success = await sendScrobbleRequest(scrobbleList, 30000)
    if (success) {
      updateTrackStatus(index, 'success')
      submittedScrobbles.push(...scrobbleList)
      ledgerUpdates[key] = {
        count: state.playCount,
        lastPlayed: state.lastPlayed,
        syncedAt: now
      }
      } else {
        updateTrackStatus(index, 'failed')
        failedTracks.push(track)
      }
    } catch (error) {
      console.error('Error scrobbling track', track, error)
      updateTrackStatus(index, 'failed')
      failedTracks.push(track)
    }
  })

  await Promise.all(promises)

  return {
    failedTracks,
    scrobbles: submittedScrobbles,
    skipped,
    ledgerUpdates
  }
}

async function sendScrobbleRequest(tracklist, timeout = 0) {
  try {
      logDebug('sendScrobbleRequest', { tracklist: tracklist.length, timeout })
      const response = await axios.post(
          `${serverUrl}/scrobble`,
          { tracklist, sessionKey: preferences.lastFm.sessionKey },
          {
              headers: {
                  Authorization: `Bearer ${preferences.lastFm.sessionKey}`,
              },
              timeout,
          }
      )
      return response.data.success
  } catch (error) {
      console.error("Error scrobbling:", error.message)
      return false
  }
}

// --- Failed Scrobble Queue ---

export async function addToFailedQueue (tracks) {
  if (!tracks || tracks.length === 0) return

  const queuedAt = Math.floor(Date.now() / 1000)
  const queueItems = tracks.map(track => ({
    track: {
      track: track.track,
      artist: track.artist,
      album: track.album || '',
      length: track.length || 0,
      playCount: track.playCount || 1,
      lastPlayed: track.lastPlayed || queuedAt
    },
    queuedAt,
    attempts: 0
  }))

  const currentQueue = preferences.failedScrobbleQueue || []
  const newQueue = [...currentQueue, ...queueItems]

  await setPreferences('singleConfig', 'failedScrobbleQueue', newQueue)
  logDebug('addToFailedQueue', { added: tracks.length, queueSize: newQueue.length })
}

export function getFailedQueueCount () {
  return (preferences.failedScrobbleQueue || []).length
}

export async function clearFailedQueue () {
  await setPreferences('singleConfig', 'failedScrobbleQueue', [])
  logDebug('clearFailedQueue')
}

export async function retryFailedQueue (updateTrackStatus) {
  const queue = preferences.failedScrobbleQueue || []
  if (queue.length === 0) {
    return { succeeded: 0, failed: 0, remaining: 0 }
  }

  logDebug('retryFailedQueue start', { queueSize: queue.length })

  const succeeded = []
  const stillFailed = []

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]
    const scrobbleList = [{ ...item.track, lastPlayed: item.track.lastPlayed }]

    if (updateTrackStatus) {
      updateTrackStatus(i, 'pending')
    }

    const success = await sendScrobbleRequest(scrobbleList, 30000)

    if (success) {
      succeeded.push(item)
      if (updateTrackStatus) {
        updateTrackStatus(i, 'success')
      }
    } else {
      stillFailed.push({
        ...item,
        attempts: (item.attempts || 0) + 1
      })
      if (updateTrackStatus) {
        updateTrackStatus(i, 'failed')
      }
    }
  }

  // Update queue with only the still-failed items
  await setPreferences('singleConfig', 'failedScrobbleQueue', stillFailed)

  logDebug('retryFailedQueue complete', {
    succeeded: succeeded.length,
    stillFailed: stillFailed.length
  })

  return {
    succeeded: succeeded.length,
    failed: stillFailed.length,
    remaining: stillFailed.length
  }
}
