<template>
  <div class="content-view">
    <img :src="ipod_uptodate" alt="Connect" class="device" />
    <p>No recent plays. Your iPod is up to date.</p>
    <p v-if="showScanComplete" class="scan-complete">
      Scan complete. No new plays found.
    </p>
    <p v-if="alreadySyncedPlays > 0">
      {{ alreadySyncedPlays }} play{{ alreadySyncedPlays !== 1 ? 's' : '' }}
      already synced.
    </p>
    <div v-if="lastSyncCount > 0" class="last-sync">
      <p>
        Last sync: {{ lastSyncCount }} scrobble{{
          lastSyncCount !== 1 ? 's' : ''
        }} submitted.
      </p>
      <div class="last-sync-list">
        <table>
          <tr v-for="(track, index) in lastSyncList" :key="index">
            <td class="track">{{ track.track }}</td>
            <td class="artist">{{ track.artist }}</td>
            <td class="time">{{ formatTimestamp(track.lastPlayed) }}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTracklist } from '../composables/useTracklist.js'
const { scanSummary, lastSync } = useTracklist()
import ipod_uptodate from '../assets/icons/ipod_uptodate.svg'

const alreadySyncedPlays = computed(() => scanSummary.alreadySyncedPlays)
const showScanComplete = computed(() => {
  return scanSummary.scannedAt > 0 && scanSummary.foundTracks === 0
})
const lastSyncCount = computed(() => lastSync.tracks)

const lastSyncList = computed(() => {
  return lastSync.submitted
    .slice()
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
})

const formatTimestamp = timestamp => {
  const date = new Date(timestamp * 1000)
  const options = {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }
  return new Intl.DateTimeFormat('en-UK', options).format(date)
}
</script>

<style scoped>
.last-sync {
  margin-top: 12px;
  width: 100%;
  max-width: 420px;
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 12px;
}

.last-sync-list {
  margin-top: 8px;
  max-height: 180px;
  overflow-y: auto;
  border-top: 1px solid var(--border-color);
  padding-top: 6px;
}

.last-sync-list::-webkit-scrollbar {
  width: 6px;
}

.last-sync-list::-webkit-scrollbar-thumb {
  background: var(--border-color-strong);
  border-radius: 999px;
}

.last-sync-list::-webkit-scrollbar-track {
  background: transparent;
}

td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 4px 6px;
  max-width: 120px;
}

.track {
  font-family: 'Barlow-Bold', sans-serif;
}

.artist {
  opacity: 0.7;
}

.time {
  text-align: right;
  opacity: 0.6;
}

.scan-complete {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

</style>
