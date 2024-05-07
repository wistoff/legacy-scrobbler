<template>
  <div class="header">
    <img
      v-if="deviceState.value === 'ready'"
      :src="eraseIcon"
      alt="Erase"
      @click="clearPlayCounts"
      :class="{
        disabled:
          isUploading ||
          isLoading ||
          preferences.lastFm.apiKey === '' ||
          selectedTracklist.length === 0
      }"
    />
    <div class="refresh-container">
      <img
        ref="refreshIconRef"
        :src="refreshIcon"
        @click="loadNewTracks"
        @animationend="resetIsRefreshing"
        :class="{
          spinning: isLoading,
          'spin-once': isRefreshing,
          disabled:
            deviceState.value === 'not-connected' ||
            isUploading ||
            preferences.lastFm.apiKey === ''
        }"
        alt="Refresh"
      />
    </div>
    <img
      :src="uploadIcon"
      alt="Upload"
      @click="scrobbleNewTracks"
      :class="{
        disabled:
          tracklist.length === 0 ||
          !preferences.lastFm.loggedIn ||
          selectedTracklist.length === 0
      }"
    />
    <img
      :src="settingsIcon"
      alt="Settings"
      @click="openSettings"
      :class="{ disabled: isLoading || isUploading }"
    />
  </div>
</template>

<script setup>
import refreshIcon from '../assets/icons/refresh.svg'
import settingsIcon from '../assets/icons/settings.svg'
import uploadIcon from '../assets/icons/upload.svg'
import eraseIcon from '../assets/icons/erase.svg'
import { ref, watch } from 'vue'

import { usePrefs } from '../composables/usePrefs.js'
const { preferences } = usePrefs()

import { useStates } from '../composables/useStates.js'
const { deviceState } = useStates()

import { useTracklist } from '../composables/useTracklist.js'
const { tracklist, selectedTracklist } = useTracklist()

// Define props
const props = defineProps({
  isLoading: Boolean,
  isUploading: Boolean
})

const emit = defineEmits([
  'getNewTracks',
  'openSettings',
  'scrobbleNewTracks',
  'clearPlayCounts'
])

const isLoading = ref(props.isLoading)
const isUploading = ref(props.isUploading)
const isRefreshing = ref(false)

function resetIsRefreshing() {
  isRefreshing.value = false;
}

function loadNewTracks () {
  isRefreshing.value = true 
  if (
    deviceState.value !== 'not-connected' &&
    preferences.lastFm.apiKey !== ''
  ) {
    emit('getNewTracks')
  }
}

function openSettings () {
  if (isLoading.value === false) {
    emit('openSettings')
  }
}

function clearPlayCounts () {
  if (isLoading.value === false && preferences.lastFm.apiKey !== '') {
    emit('clearPlayCounts')
  }
}

function scrobbleNewTracks () {
  if (tracklist.length !== 0 && preferences.lastFm.apiKey !== '') {
    emit('scrobbleNewTracks')
  }
}

watch(
  [() => props.isLoading, () => props.isUploading],
  ([newIsLoading, newIsUploading]) => {
    isLoading.value = newIsLoading
    isUploading.value = newIsUploading
  }
)
</script>

<style scoped>
.header {
  height: 50px;
  border-bottom: 1.5px solid rgb(11, 18, 21, 0.1);
  margin: 0 5px 0 5px;
  padding: 0 0 0 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.header img {
  height: 23px;
  margin: 10px 10px 10px 0;
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
