<template>
  <div class="content-view">
    <img class="spinning" :src="refreshIcon" />
  </div>
</template>

<script setup>
import refreshIcon from '../assets/icons/refresh.svg'
</script>

<style scoped>
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 2s linear infinite;
}

img {
  width: 150px;
  opacity: 0.05;
}
</style>
