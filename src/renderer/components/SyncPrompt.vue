<template>
  <div class="popup-container">
    <div class="popup">
      <img src="../assets/ls-logo.png" alt="Legacy Scrobbler" />
      <div class="content">
        <h1>iPod detected</h1>
        <p>
          Ready to start scrobbling? <br> Close iTunes or Apple Music first
          to avoid conflicts.
        </p>
      </div>
      <div class="actions">
        <button class="secondary" type="button" @click="emit('cancel')">
          Not now
        </button>
        <button class="primary" type="button" @click="emit('confirm')">
          Start scrobbling
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.popup {
  box-sizing: border-box;
  width: 420px;
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

.popup img {
  width: 72px;
  filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.11));
}

.content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
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
