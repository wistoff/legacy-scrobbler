<template>
    <div class="popup-container">
      <div class="popup">
        <div class="content">
          <h1>Scrobbling Status</h1>
          <table>
            <tr v-for="(item, index) in tracks" :key="index">
              <td class="track">{{ item.track.track }}</td>
              <td class="artist">{{ item.track.artist }}</td>
              <td class="status" :class="item.status">
                <span v-if="item.status === 'success'">✅</span>
                <span v-else-if="item.status === 'failed'">❌</span>
                <span v-else>🔄</span>
              </td>
            </tr>
          </table>
        </div>
  
        <button @click="closePopup">Close</button>
      </div>
    </div>
  </template>
  
  <script setup>
  
  const props = defineProps({
    tracks: Array
  })
  import { useTrackStatuses } from '../composables/useTrackStatuses.js'

  const { clearTrackStatuses } = useTrackStatuses()

  import { useTracklist } from '../composables/useTracklist.js'

  const {
    clearTracklist
  } = useTracklist()
  
  
  const closePopup = async () => {
    clearTrackStatuses()
    await clearTracklist()
  }
  </script>
  
  <style scoped>
  .popup {
    box-sizing: border-box;
    min-width: 350px;
    min-height: 170px;
    border-radius: 15px;
    background-color: rgba(255, 255, 250, 0.3);
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.11),
      0 1px 2px rgba(0, 0, 0, 0.11),
      0 2px 4px rgba(0, 0, 0, 0.11),
      0 4px 8px rgba(0, 0, 0, 0.11);
    padding: 25px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    backdrop-filter: blur(18px);
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Barlow-Regular', sans-serif;
    font-size: small;
    margin-top: 10px;
  }
  
  td {
    max-width: 80vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 4px 8px;
    text-align: left;
  }
  
  .track {
    font-family: 'Barlow-Bold', sans-serif;
    flex: 2;
  }
  
  .artist {
    opacity: 0.6;
    flex: 2;
  }
  
  .status {
    text-align: right;
    flex: 0.5;
    font-size: 16px;
  }
  
  .status.success {
    color: green;
  }
  
  .status.failed {
    color: red;
  }
  
  .status.pending {
    color: orange;
  }
  
  button {
    margin-top: 15px;
    cursor: pointer;
  }
  </style>
  