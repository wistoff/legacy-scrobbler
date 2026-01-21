<template>
  <div class="header">
    <img
      v-if="deviceState.value === 'ready'"
      :src="eraseIcon"
      alt="Erase"
      title="Delete Play Counts file on the iPod"
      @click="clearPlayCounts"
      :class="{
        disabled:
          isUploading ||
          isEjecting ||
          isLoading ||
          preferences.lastFm.apiKey === '' ||
          selectedTracklist.length === 0
      }"
    />
    <div class="refresh-container">
      <img
        ref="refreshIconRef"
        :src="refreshIcon"
        title="Scan iPod for new plays"
        @click="loadNewTracks"
        @animationend="resetIsRefreshing"
        :class="{
          spinning: isLoading,
          'spin-once': isRefreshing,
          disabled:
            deviceState.value === 'not-connected' ||
            isUploading ||
            isEjecting ||
            preferences.lastFm.apiKey === ''
        }"
        alt="Refresh"
      />
    </div>
    <img
      :src="ejectIcon"
      alt="Eject"
      title="Safely eject iPod"
      @click="ejectDevice"
      :class="{
        disabled:
          deviceState.value === 'not-connected' ||
          isLoading ||
          isUploading ||
          isEjecting
      }"
    />
    <img
      :src="uploadIcon"
      alt="Upload"
      title="Upload selected plays to Last.fm"
      @click="scrobbleNewTracks"
      :class="{
        disabled:
          tracklist.length === 0 ||
          !preferences.lastFm.loggedIn ||
          selectedTracklist.length === 0 ||
          isEjecting
      }"
    />
    <img
      :src="isDarkMode ? sunIcon : moonIcon"
      :alt="isDarkMode ? 'Light mode' : 'Dark mode'"
      :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="toggleTheme"
    />
    <img
      :src="settingsIcon"
      alt="Settings"
      title="Open settings"
      @click="openSettings"
      :class="{ disabled: isLoading || isUploading || isEjecting }"
    />
  </div>
</template>

<script setup>
import refreshIcon from '../assets/icons/refresh.svg'
import settingsIcon from '../assets/icons/settings.svg'
import uploadIcon from '../assets/icons/upload.svg'
import eraseIcon from '../assets/icons/erase.svg'
import ejectIcon from '../assets/icons/eject.svg'
import sunIcon from '../assets/icons/sun.svg'
import moonIcon from '../assets/icons/moon.svg'
import { ref, watch } from 'vue'

import { usePrefs } from '../composables/usePrefs.js'
const { preferences } = usePrefs()

import { useStates } from '../composables/useStates.js'
const { deviceState } = useStates()

import { useTracklist } from '../composables/useTracklist.js'
const { tracklist, selectedTracklist } = useTracklist()

import { useTheme } from '../composables/useTheme.js'
const { isDarkMode, toggleTheme } = useTheme()

// Define props
const props = defineProps({
  isLoading: Boolean,
  isUploading: Boolean,
  isEjecting: Boolean
})

const emit = defineEmits([
  'getNewTracks',
  'openSettings',
  'scrobbleNewTracks',
  'clearPlayCounts',
  'ejectDevice'
])

const isLoading = ref(props.isLoading)
const isUploading = ref(props.isUploading)
const isEjecting = ref(props.isEjecting)
const isRefreshing = ref(false)

function resetIsRefreshing() {
  isRefreshing.value = false;
}

function loadNewTracks () {
  if (isLoading.value || isUploading.value) {
    return
  }
  if (isEjecting.value) {
    return
  }
  isRefreshing.value = true 
  if (
    deviceState.value !== 'not-connected' &&
    preferences.lastFm.apiKey !== ''
  ) {
    emit('getNewTracks')
  }
}

function openSettings () {
  if (isLoading.value === false && isEjecting.value === false) {
    emit('openSettings')
  }
}

function clearPlayCounts () {
  if (
    isLoading.value === false &&
    isEjecting.value === false &&
    preferences.lastFm.apiKey !== ''
  ) {
    emit('clearPlayCounts')
  }
}

function scrobbleNewTracks () {
  if (
    tracklist.length !== 0 &&
    preferences.lastFm.apiKey !== '' &&
    isEjecting.value === false
  ) {
    emit('scrobbleNewTracks')
  }
}

function ejectDevice () {
  if (
    deviceState.value !== 'not-connected' &&
    !isLoading.value &&
    !isUploading.value &&
    !isEjecting.value
  ) {
    emit('ejectDevice')
  }
}

watch(
  [() => props.isLoading, () => props.isUploading, () => props.isEjecting],
  ([newIsLoading, newIsUploading, newIsEjecting]) => {
    isLoading.value = newIsLoading
    isUploading.value = newIsUploading
    isEjecting.value = newIsEjecting
  }
)
</script>

<style scoped>
.header {
  height: 50px;
  border-bottom: 1.5px solid var(--border-color);
  margin: 0 5px 0 5px;
  padding: 0 0 0 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.header img {
  height: 23px;
  margin: 10px 10px 10px 0;
  filter: var(--icon-filter);
}

.header img:not(.disabled) {
  height: 23px;
  margin: 10px 10px 10px 0;
  opacity: 0.5;
  cursor: pointer;
}

.header img:hover:not(.disabled) {
  opacity: 1;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin-once {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

.spin-once {
  animation: spin-once 1s linear forwards;
}

.refresh-container {
  position: relative;
}

.disabled {
  cursor: default;
  opacity: 0.1;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
