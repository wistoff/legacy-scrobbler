<template>
  <div class="content-view">
    <img :src="check_solid" alt="Check" />
    <h1>iPod Library Scrobbled</h1>
    <p>{{ formattedPlaytime }} of Music saved.</p>
    <p>
      {{ selectedTracklist.length }}
      {{ selectedTracklist.length > 1 ? 'Tracks' : 'Track' }} submitted.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTracklist } from '../composables/useTracklist.js'
const { selectedTracklist, playtime } = useTracklist()

import check_solid from '../assets/icons/check-solid.svg'

const formatPlaytime = playtimeInSeconds => {
  const days = Math.floor(playtimeInSeconds / (3600 * 24))
  const hours = Math.floor((playtimeInSeconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((playtimeInSeconds % 3600) / 60)
  const seconds = playtimeInSeconds % 60

  let formattedTime = ''

  if (days > 0) {
    formattedTime += `${days} day${days > 1 ? 's' : ''}, `
  }

  if (hours > 0) {
    formattedTime += `${hours} hour${hours > 1 ? 's' : ''}, `
  }

  if (minutes > 0 || (days === 0 && hours === 0)) {
    formattedTime += `${minutes} minute${minutes > 1 ? 's' : ''}, `
  }

  formattedTime += `${seconds} second${seconds > 1 ? 's' : ''}`

  return formattedTime.trim()
}

const formattedPlaytime = computed(() => {
  return formatPlaytime(playtime.value)
})
</script>

<style scoped>
img {
  width: 150px;
  opacity: 0.1;
  padding: 10px;
}

span {
  font-weight: bold;
  opacity: 1;
}
</style>
