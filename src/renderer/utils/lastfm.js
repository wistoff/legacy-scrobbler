const serverUrl = 'https://api.legacyscrobbler.software'
// const serverUrl = 'http://localhost:3000'
import axios from 'axios'

import { usePrefs } from '../composables/usePrefs.js'
const { preferences, setPreferences } = usePrefs()

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
  const { apiKey, userToken } = await fetchCreds()
  const url = await constructUrl(apiKey, userToken)
  window.open(url, '_blank')
  await setPreferences('singleConfig', 'lastFm', {
    apiKey: apiKey,
    userToken: userToken
  })
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
