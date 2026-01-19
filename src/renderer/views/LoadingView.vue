<template>
  <div class="content-view">
    <img class="spinning" :src="refreshIcon" />
    <p v-if="displayMessage" class="status-text">{{ displayMessage }}</p>
  </div>
</template>

<script setup>
import refreshIcon from '../assets/icons/refresh.svg'
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: ''
  }
})

const baseMessage = 'Reading iPod database...'
const rotationMessages = [
  'Converting your life to AAC...',
  'De-fraying the white earbuds...',
  'Asking iTunes to stop opening by itself...',
  'Buffering in 128kbps...',
  'Rewinding the iPod commercials...',
  'Peeling the Apple sticker...',
  'Waking the iPod from its nap...',
  'Consulting the Genius Bar (2004 edition)...',
  "Syncing like it's 2005...",
  "Opening the iPod's brain...",
  'Buffering the LimeWire memories...',
  'Queueing up the iPod shuffle chaos...',
  'Waiting for iTunes to stop bouncing...',
  'Dusting off the iTunes library shelves...',
  'Re-ripping your library in 192kbps...',
  'Searching for that one lost White Stripes track...'
]

const displayMessage = ref(props.message)
let rotationTimer = null
let lastRotationIndex = -1

const clearRotation = () => {
  if (rotationTimer) {
    clearTimeout(rotationTimer)
    rotationTimer = null
  }
}

const scheduleRotation = () => {
  clearRotation()
  if (props.message !== baseMessage) {
    return
  }
  const minMs = 5000
  const maxMs = 7000
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  rotationTimer = setTimeout(() => {
    let nextIndex = Math.floor(Math.random() * rotationMessages.length)
    if (rotationMessages.length > 1 && nextIndex === lastRotationIndex) {
      nextIndex = (nextIndex + 1) % rotationMessages.length
    }
    lastRotationIndex = nextIndex
    displayMessage.value = rotationMessages[nextIndex]
    scheduleRotation()
  }, delay)
}

watch(
  () => props.message,
  newMessage => {
    displayMessage.value = newMessage
    scheduleRotation()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearRotation()
})
</script>

<style scoped>
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 2s linear infinite;
}

img {
  width: 150px;
  opacity: 0.05;
}

.status-text {
  margin-top: 16px;
  font-size: 14px;
  color: var(--grey);
  text-align: center;
}
</style>
