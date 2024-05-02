<template>
  <div class="content-view">
    <img :src="CloudIcon" />
    <img class="arrow uploading" :src="ArrowIcon" />
  </div>
</template>

<script setup>
import CloudIcon from '../assets/icons/upload-non.svg'
import ArrowIcon from '../assets/icons/upload-arrow.svg'
</script>

<style scoped>
@keyframes spin {
  0% {
    transform: translateY(42px);
    opacity: 0.1;
  }
  80% {
    transform: translateY(0px);
    opacity: 0;
  }
  100% {
    transform: translateY(0px);
    opacity: 0;
  }
}

.arrow {
  position: absolute;
  left: calc(50% - 75px);
  top: calc(50% - 75px);
}

.content-view img {
  opacity: 0.1;
}

.uploading {
  animation: spin 2s linear infinite;
}

img {
  width: 150px;
}
</style>
