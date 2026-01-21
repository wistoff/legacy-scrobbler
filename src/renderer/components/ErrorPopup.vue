<template>
  <div class="popup-container">
    <div class="popup">
      <div class="content">
        <h1>Error</h1>
        <div class="credits-container" v-html="errorPopup.msg"></div>
      </div>

      <button @click="closePopup">Close</button>
    </div>
  </div>
</template>

<script setup>
import { useStates } from '../composables/useStates.js'
const { errorPopup } = useStates()

function closePopup () {
    errorPopup.state = false
}
</script>

<style scoped>

.popup {
  box-sizing: border-box;
  width: 350px;
  min-height: 170px;
  border-radius: 15px;
  /* overflow-y: scroll; */
  background-color: var(--popup-bg);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.11), 0 1px 2px rgba(0, 0, 0, 0.11),
    0 2px 4px rgba(0, 0, 0, 0.11), 0 4px 8px rgba(0, 0, 0, 0.11),
    0 8px 16px rgba(0, 0, 0, 0.11), 0 16px 32px rgba(0, 0, 0, 0.11),
    0 0 64px rgba(0, 0, 0, 0.08), 0 0 128px rgba(0, 0, 0, 0.08);
  opacity: 1;
  border: var(--border-color-strong) 0.01px solid;
  padding: 25px 25px 25px 25px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  backdrop-filter: blur(18px);
}

.popup p {
  overflow: scroll;
}

.popup h1 {
  padding: 15px 0 4px 0;
}

</style>
