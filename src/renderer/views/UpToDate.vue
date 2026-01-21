<template>
  <div class="content-view">
    <img :src="ipod_uptodate" alt="Connect" class="device" />
    <p v-if="alreadySyncedPlays > 0">
      {{ alreadySyncedPlays }} play{{ alreadySyncedPlays !== 1 ? 's' : '' }}
      found. All already synced. Your iPod is up to date.
    </p>
    <p v-else>No plays found on your iPod.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTracklist } from '../composables/useTracklist.js'
const { scanSummary } = useTracklist()
import ipod_uptodate from '../assets/icons/ipod_uptodate.svg'

const alreadySyncedPlays = computed(() => scanSummary.alreadySyncedPlays)
</script>
