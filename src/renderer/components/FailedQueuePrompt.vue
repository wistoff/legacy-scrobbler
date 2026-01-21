<template>
  <div class="popup-container">
    <div class="popup">
      <div class="content">
        <h1>Previous sync incomplete</h1>
        <p>
          {{ trackCount }} track{{ trackCount === 1 ? '' : 's' }} failed to scrobble during your last session.
        </p>
        <div v-if="tracks.length > 0" class="track-list">
          <div v-for="(item, index) in displayTracks" :key="index" class="track-item">
            <span class="track-name">{{ item.track.track }}</span>
            <span class="track-artist">{{ item.track.artist }}</span>
          </div>
          <div v-if="tracks.length > 5" class="more-tracks">
            ...and {{ tracks.length - 5 }} more
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="secondary" type="button" @click="emit('dismiss')">
          Dismiss
        </button>
        <button class="primary" type="button" @click="emit('retry')">
          Retry now
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tracks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['retry', 'dismiss'])

const trackCount = computed(() => props.tracks.length)
const displayTracks = computed(() => props.tracks.slice(0, 5))
</script>

<style scoped>
.popup {
  box-sizing: border-box;
  width: 420px;
  max-height: 80vh;
  border-radius: 16px;
  background-color: var(--popup-bg);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.11), 0 1px 2px rgba(0, 0, 0, 0.11),
    0 2px 4px rgba(0, 0, 0, 0.11), 0 4px 8px rgba(0, 0, 0, 0.11),
    0 8px 16px rgba(0, 0, 0, 0.11), 0 16px 32px rgba(0, 0, 0, 0.11);
  border: 1px solid var(--border-color-strong);
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 18px;
  backdrop-filter: blur(12px);
}

.content {
  width: 100%;
}

.content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.track-list {
  margin-top: 16px;
  max-height: 200px;
  overflow-y: auto;
  text-align: left;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 8px;
}

.track-item {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
}

.track-item:last-child {
  border-bottom: none;
}

.track-name {
  display: block;
  font-family: 'Barlow-Bold', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more-tracks {
  padding: 8px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  font-style: italic;
}

.actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.actions button {
  flex: 1;
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  margin: 0;
  width: auto;
  min-height: 0;
}

.actions .secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color-strong);
}

.actions .primary {
  background: var(--red);
  color: white;
}

.actions .primary:hover {
  background-color: #d32f2f;
}
</style>
