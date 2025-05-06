const serverUrl = 'https://api.legacyscrobbler.software'
// const serverUrl = 'http://localhost:3000'
import axios from 'axios'

import { usePrefs } from '../composables/usePrefs.js'
const { preferences, setPreferences } = usePrefs()

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

export async function scrobbleTracks(tracklist) {
  console.log("tracklist", tracklist)

  if (await sendScrobbleRequest(tracklist)) {
      return { status: true }
  }

  return { status: false }
}

export async function scrobbleTracksIndividually(tracklist, updateTrackStatus) {
  const failedTracks = []

  const promises = tracklist.map(async (track, index) => {
      try {
          const success = await sendScrobbleRequest([track], 30000)
          if (success) {
              updateTrackStatus(index, "success")
          } else {
              updateTrackStatus(index, "failed")
              failedTracks.push(track)
          }
      } catch (error) {
          console.error("Error scrobbling track", track, error)
          updateTrackStatus(index, "failed")
          failedTracks.push(track)
      }
  })

  await Promise.all(promises)

  return failedTracks
}

async function sendScrobbleRequest(tracklist, timeout = 0) {
  try {
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