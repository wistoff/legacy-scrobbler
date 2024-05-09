const serverUrl = 'https://api.legacyscrobbler.software'
// const serverUrl = 'http://localhost:3000'
import axios from 'axios'

import { usePrefs } from '../composables/usePrefs.js'
const { preferences, setPreferences } = usePrefs()

import { ref } from 'vue'

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

export async function login () {
  try {
    const { apiKey, userToken } = await fetchCreds()

    const url = await constructUrl(apiKey, userToken)

    window.open(url, '_blank')
    // Waiting for the user to come back to the window
    await new Promise(resolve => {
      const checkWindowFocus = setInterval(() => {
        if (windowFocus.value) {
          clearInterval(checkWindowFocus)
          resolve()
        }
      }, 200)
    })
    const sessionKey = await fetchSessionKey(userToken)
    if (sessionKey === 'failed') {
      return {
        status: false,
        message: 'Please return to your Browser and allow Legacy Scrobbler to access your profile.'
      }
    } else {
      await setPreferences('singleConfig', 'lastFm', {
        apiKey: apiKey,
        sessionKey: sessionKey
      })
      return { status: true, message: '' }
    }
  } catch (error) {
    return {
      status: false,
      message: 'Legacy Scrobbler service seems to be offline. Sorry.'
    }
  }
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

export async function scrobbleTracks (tracklist) {
  console.log('tracklist', tracklist)
  try {
    const response = await axios.post(
      `${serverUrl}/scrobble`,
      { tracklist: tracklist, sessionKey: preferences.lastFm.sessionKey },
      {
        headers: {
          Authorization: `Bearer ${preferences.lastFm.sessionKey}`
        }
      }
    )
    console.log('response', response)
    if (response.data.success) {
      return { status: true, message: '' }
    }
  } catch (error) {
    console.error('Error:', error.message)
    return { status: false, message: 'Failed to scrobble Tracks' }
  }
}

const windowFocus = ref(true)

window.ipc.onUpdateCounter(value => {
  windowFocus.value = value
})
