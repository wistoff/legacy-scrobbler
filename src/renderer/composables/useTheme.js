import { ref, watch } from 'vue'
import { usePrefs } from './usePrefs.js'

const isDarkMode = ref(false)

export const useTheme = () => {
  const { preferences, setPreferences } = usePrefs()

  const initTheme = () => {
    isDarkMode.value = preferences.darkMode || false
    applyTheme()
  }

  const applyTheme = () => {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }

  const toggleTheme = async () => {
    isDarkMode.value = !isDarkMode.value
    applyTheme()
    await setPreferences('singleConfig', 'darkMode', isDarkMode.value)
  }

  const setDarkMode = async (value) => {
    isDarkMode.value = value
    applyTheme()
    await setPreferences('singleConfig', 'darkMode', value)
  }

  // Watch for changes to preferences.darkMode (in case it's changed elsewhere)
  watch(() => preferences.darkMode, (newValue) => {
    if (newValue !== isDarkMode.value) {
      isDarkMode.value = newValue
      applyTheme()
    }
  })

  return {
    isDarkMode,
    initTheme,
    toggleTheme,
    setDarkMode
  }
}
