<template>
  <div class="popup-container">
    <div class="popup">
      <img src="../assets/ls-logo.png" alt="" />
      <div class="content">
        <h1>{{ popup.content.title }}</h1>
        <div class="credits-container" v-html="popup.content.message"></div>
      </div>

      <button @click="popUpAction">{{ popup.content.button }}</button>
    </div>
  </div>
</template>

<script setup>
import { useStates } from '../composables/useStates.js'
const { popup } = useStates()

const emit = defineEmits(['handleLogin'])

function popUpAction () {
  if (popup.content.button === 'Allow Access') {
    emit('handleLogin')
  } else {
    popup.state = false
  }
}
</script>

<style scoped>
.popup {
  box-sizing: border-box;
  width: 400px;
  min-height: 340px;
  border-radius: 15px;
  /* overflow-y: scroll; */
  background-color: rgba(255, 255, 250, 0.3);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.11), 0 1px 2px rgba(0, 0, 0, 0.11),
    0 2px 4px rgba(0, 0, 0, 0.11), 0 4px 8px rgba(0, 0, 0, 0.11),
    0 8px 16px rgba(0, 0, 0, 0.11), 0 16px 32px rgba(0, 0, 0, 0.11),
    0 0 64px rgba(0, 0, 0, 0.08), 0 0 128px rgba(0, 0, 0, 0.08);
  opacity: 1;
  border: rgb(0, 0, 0, 0.2) 0.01px solid;
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

.credits-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.popup img {
  width: 80px;
  filter: drop-shadow(2px 2px 2px rgb(0, 0, 0, 0.11));
}

.popup h1 {
  padding: 15px 0 4px 0;
}


</style>
