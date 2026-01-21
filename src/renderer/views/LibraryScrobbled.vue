<template>
  <div class="summary">
    <img :src="check_solid" alt="Check" />
    <h1>iPod Library Scrobbled</h1>
    <p>{{ formattedPlaytime }} of Music saved.</p>
    <p>
      {{ submittedCount }} scrobble{{ submittedCount !== 1 ? 's' : '' }}
      submitted.
    </p>
    <p>
      {{ uniqueTrackCount }} unique track{{ uniqueTrackCount !== 1 ? 's' : '' }}
      in this sync.
    </p>
    <p v-if="skippedCount > 0">
      {{ skippedCount }} track{{ skippedCount !== 1 ? 's' : '' }} skipped
      (missing metadata).
    </p>
  </div>

  <div v-if="sortedSubmitted.length > 0" class="list-section">
    <div class="section-title">Submitted Scrobbles</div>
    <table>
      <tr v-for="(track, index) in sortedSubmitted" :key="index">
        <td class="track">{{ track.track }}</td>
        <td class="artist">{{ track.artist }}</td>
        <td class="album">{{ track.album || '-' }}</td>
        <td class="time">{{ formatTimestamp(track.lastPlayed) }}</td>
      </tr>
    </table>
  </div>

  <div v-if="sortedSkipped.length > 0" class="list-section">
    <div class="section-title">Skipped Tracks</div>
    <table>
      <tr v-for="(track, index) in sortedSkipped" :key="index">
        <td class="track">{{ track.track || 'Unknown Track' }}</td>
        <td class="artist">{{ track.artist || 'Unknown Artist' }}</td>
        <td class="album">{{ track.album || '-' }}</td>
      </tr>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTracklist } from '../composables/useTracklist.js'
const { scrobbled, lastSync } = useTracklist()

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

const syncSummary = computed(() => {
  return scrobbled.submitted.length > 0 ? scrobbled : lastSync
})

const formattedPlaytime = computed(() => {
  return formatPlaytime(syncSummary.value.playtime)
})

const submittedCount = computed(() => syncSummary.value.submitted.length)

const skippedCount = computed(() => syncSummary.value.skipped.length)

const uniqueTrackCount = computed(() => {
  const unique = new Set()
  syncSummary.value.submitted.forEach(track => {
    unique.add(`${track.track}::${track.artist}::${track.album || ''}`)
  })
  return unique.size
})

const sortedSubmitted = computed(() => {
  return syncSummary.value.submitted
    .slice()
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
})

const sortedSkipped = computed(() => {
  return syncSummary.value.skipped.slice()
})

const formatTimestamp = timestamp => {
  const date = new Date(timestamp * 1000)
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  return new Intl.DateTimeFormat('en-UK', options).format(date)
}
</script>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 10px 10px 10px;
}

img {
  width: 150px;
  opacity: 0.1;
  padding: 10px;
  filter: var(--icon-filter);
}

p {
  margin: 4px 0;
}

.list-section {
  margin: 10px 15px 20px 15px;
  background-color: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-family: 'Barlow-Bold', sans-serif;
  font-size: 14px;
  text-align: left;
  padding: 0 15px 10px 15px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 13px;
}

tr:hover {
  background-color: var(--row-hover-bg);
  color: var(--row-hover-text);
}

td {
  max-width: 35vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 6px 10px;
}

.track {
  font-family: 'Barlow-Bold', sans-serif;
}

.artist,
.album {
  opacity: 0.7;
}

.time {
  text-align: right;
  opacity: 0.6;
  min-width: 140px;
}
</style>
