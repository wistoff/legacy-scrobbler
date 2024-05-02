<template>
  <div v-if="tracklist">
    <table>
      <tr
        v-for="track in tracklist"
        :key="track.id"
        :class="{ disabled: track.disabled }"
        @click="toggleTrack(track)"
      >
        <td class="track">{{ track.track }}</td>
        <td>{{ track.artist }}</td>
        <td class="time">{{ calculateDifference(track.lastPlayed) }}</td>
        <!-- <td class="count">
          <div class="bubble">{{ track.playCount }}</div>
        </td> -->
      </tr>
    </table>
  </div>
</template>

<script setup>
import { useTracklist } from '../composables/useTracklist.js'
const { tracklist, selectedTracklist, toggleTrackSelection } = useTracklist()

const toggleTrack = track => {
  track.disabled = !track.disabled
  console.log('toggle Track for ID', track.id)
  toggleTrackSelection(track.id)
  console.log(selectedTracklist)
}
const calculateDifference = timestamp => {
  const lastPlayedDate = new Date(timestamp * 1000)
  const currentDate = new Date()
  const differenceInSeconds = Math.abs(
    Math.floor((currentDate - lastPlayedDate) / 1000)
  )
  const differenceInMinutes = Math.floor(differenceInSeconds / 60)
  const differenceInHours = Math.floor(differenceInMinutes / 60)
  const differenceInDays = Math.floor(differenceInHours / 24)

  if (differenceInDays > 0) {
    return `${differenceInDays} day${differenceInDays > 1 ? 's' : ''} ago`
  } else if (differenceInHours > 0) {
    return `${differenceInHours} hour${differenceInHours > 1 ? 's' : ''} ago`
  } else {
    return `${differenceInMinutes} minute${
      differenceInMinutes !== 1 ? 's' : ''
    } ago`
  }
}
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Barlow-Regular', sans-serif;
  font-size: medium;
  margin: 2px 0 2px 0;
}

tr:hover {
  background-color: rgb(1, 125, 199);
  color: white;
}

tr:hover .bubble {
  border-color: white;
}

td {
  max-width: 80vw;
  height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.count {
  font-size: small;
  text-align: center;
  opacity: 0.3;
  padding: 0 18px 0 15px;
  width: 18px;
}

.track {
  font-family: 'Barlow-Bold', sans-serif;
  padding: 0 0 0 15px;
}

.time {
  font-size: small;
  opacity: 0.5;
  text-align: right;
  padding: 0 18px 0 0;
}

.bubble {
  border: 1px solid rgb(11, 18, 21);
  border-radius: 20px;
  max-width: 40px;
  padding: 0 3px 0 3px;
}

.disabled {
  background-color: #ddd;
  color: #666;
  opacity: 0.3;
}
</style>
