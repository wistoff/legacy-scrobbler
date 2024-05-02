import { reactive } from 'vue'

export const globalPreferences = reactive({})

export const usePrefs = () => {
  const getPreferences = async (action, key) => {
    const receivedConfig = await window.ipc.readConfig(action, key)
    Object.assign(globalPreferences, receivedConfig)
    return receivedConfig
  }

  const setPreferences = async (action, key, param) => {
    const wroteConfig = await window.ipc.writeConfig(action, key, param)
    Object.assign(globalPreferences, wroteConfig)
    return wroteConfig
  }

  return {
    preferences: globalPreferences,
    getPreferences,
    setPreferences
  }
}

