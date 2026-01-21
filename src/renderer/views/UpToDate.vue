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
    <div v-if="showLedgerCallout" class="ledger-callout">
      <div class="callout-text">
        <div class="callout-title">Want faster scans?</div>
        <p>
          Keeping Play Counts on your iPod means we compare every play against
          the local ledger, which can slow down future scans. You can clear it
          now to speed things up, or keep it so iTunes or other scrobblers can
          import your plays.
        </p>
      </div>
      <div class="callout-actions">
        <button class="callout-button secondary" type="button" @click="dismissCallout">
          Keep for iTunes
        </button>
        <button class="callout-button primary" type="button" @click="clearPlayCounts">
          Clear Play Counts
        </button>
      </div>
    </div>
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
import { usePrefs } from '../composables/usePrefs.js'
const { preferences } = usePrefs()
const { scanSummary, lastSync } = useTracklist()
import ipod_uptodate from '../assets/icons/ipod_uptodate.svg'

const props = defineProps({
  onClearPlayCounts: {
    type: Function,
    default: null
  },
  onDismissLedgerCallout: {
    type: Function,
    default: null
  },
  calloutDismissed: {
    type: Boolean,
    default: false
  }
})

const dismissCallout = () => {
  console.log('[debug] dismiss ledger callout (keep)')
  if (props.onDismissLedgerCallout) {
    props.onDismissLedgerCallout()
  }
}

const clearPlayCounts = () => {
  console.log('[debug] clear play counts clicked')
  if (props.onDismissLedgerCallout) {
    props.onDismissLedgerCallout()
  }
  if (props.onClearPlayCounts) {
    props.onClearPlayCounts()
  }
}

const alreadySyncedPlays = computed(() => scanSummary.alreadySyncedPlays)
const showScanComplete = computed(() => {
  return scanSummary.scannedAt > 0 && scanSummary.foundTracks === 0
})
const showLedgerCallout = computed(() => {
  if (props.calloutDismissed) {
    return false
  }
  if (preferences.autoDelete) {
    return false
  }
  return scanSummary.scannedAt > 0 && scanSummary.playCountsPresent
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

.ledger-callout {
  margin: 16px auto 0;
  width: 100%;
  max-width: 480px;
  background: #fff6e0;
  border: 1px solid rgba(237, 175, 80, 0.5);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  text-align: left;
}

:root.dark-mode .ledger-callout {
  background: #3d3520;
  border-color: rgba(237, 175, 80, 0.3);
}

.callout-title {
  font-family: 'Barlow-Bold', sans-serif;
  font-size: 14px;
  margin-bottom: 4px;
}

.ledger-callout p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.callout-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.callout-button {
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.callout-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.callout-button.secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color-strong);
}

.callout-button.primary {
  background: rgba(237, 175, 80, 0.9);
  color: #2d1d00;
}
</style>
