<template>
  <div class="sidebar">
    <div class="header">
      <img :src="ArrowRight" alt="Upload" @click="closeSettings" />
      <h1>Settings</h1>
    </div>
    <div class="content">
      <div v-if="preferences.lastFm.loggedIn" class="user">
        <div class="picture">
          <img :src="preferences.lastFm.profilePicture" alt="" />
        </div>
        <div class="account">
          <p class="username">{{ preferences.lastFm.username }}</p>
          <p class="usermeta">
            scrobbling since {{ formatDate(preferences.lastFm.registered) }}
          </p>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-item">
          <div class="settings-item-label">
            <p>Automatic Library Scan</p>
            <button
              class="info-button"
              type="button"
              aria-label="Automatic Library Scan information"
              aria-describedby="auto-scan-tooltip"
            >
              ?
              <span
                id="auto-scan-tooltip"
                role="tooltip"
                class="info-tooltip"
              >
                Periodically checks the iPod for new plays and refreshes the
                list automatically.
              </span>
            </button>
          </div>
          <label class="form-switch">
            <input
              type="checkbox"
              v-model="preferences.autoScan"
              @change="
                setPreferences('singleConfig', 'autoScan', preferences.autoScan)
              "
            />
            <i></i>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-item-label">
            <p>Automatic Delete</p>
            <button
              class="info-button"
              type="button"
              aria-label="Automatic Delete information"
              aria-describedby="auto-delete-tooltip"
            >
              ?
              <span
                id="auto-delete-tooltip"
                role="tooltip"
                class="info-tooltip"
              >
                Removes the Play Counts file after a successful sync. Leaving
                this off will not duplicate scrobbles in this app because it
                keeps a local ledger. Only enable this if you want to stop
                iTunes or other scrobblers from importing old plays.
              </span>
            </button>
          </div>
          <label class="form-switch">
            <input
              type="checkbox"
              v-model="preferences.autoDelete"
              @change="
                setPreferences(
                  'singleConfig',
                  'autoDelete',
                  preferences.autoDelete
                )
              "
            />
            <i></i>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-item-label">
            <p>Automatic Upload</p>
            <button
              class="info-button"
              type="button"
              aria-label="Automatic Upload information"
              aria-describedby="auto-upload-tooltip"
            >
              ?
              <span
                id="auto-upload-tooltip"
                role="tooltip"
                class="info-tooltip"
              >
                Starts scrobbling automatically after a scan finds new plays.
              </span>
            </button>
          </div>
          <label class="form-switch">
            <input
              type="checkbox"
              v-model="preferences.autoUpload"
              @change="
                setPreferences(
                  'singleConfig',
                  'autoUpload',
                  preferences.autoUpload
                )
              "
            />
            <i></i>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-item-label">
            <p>Scrobble Repeat Plays</p>
            <button
              class="info-button"
              type="button"
              aria-label="Repeat plays limitation"
              aria-describedby="repeat-plays-tooltip"
            >
              ?
              <span
                id="repeat-plays-tooltip"
                role="tooltip"
                class="info-tooltip"
              >
                Uses the iPod play count to submit repeat scrobbles for the
                same track. The count is accurate, but the iPod only stores one
                timestamp, so we estimate the others by spacing them out. Exact
                timing and order may be approximate.
              </span>
            </button>
          </div>
          <label class="form-switch">
            <input
              type="checkbox"
              v-model="preferences.repeatScrobbles"
              @change="
                setPreferences(
                  'singleConfig',
                  'repeatScrobbles',
                  preferences.repeatScrobbles
                )
              "
            />
            <i></i>
          </label>
        </div>
      </div>

      <div class="param-button" @click="openDialog()">
        <p>Device Path</p>
        <p>{{ preferences.devicePath }}</p>
      </div>

      <div
        v-if="preferences.lastFm.loggedIn"
        class="settings-button"
        @click="signOut()"
      >
        <p>Sign-Out</p>
      </div>

      <div class="settings-button" @click="resetPrefs()">
        <p>Reset Configuration</p>
      </div>

      <div class="settings-button" @click="showAboutPopup()">
        <p>About</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import ArrowRight from '../assets/icons/a-right.svg'
import { onMounted } from 'vue'

import { useStates } from '../composables/useStates.js'
const { showAboutPopup, showAccessPopup } = useStates()

import { usePrefs } from '../composables/usePrefs.js'
const { preferences, setPreferences } = usePrefs()

const emit = defineEmits(['closeSettings'])

function closeSettings () {
  emit('closeSettings')
}

const openDialog = async () => {
  const filePath = await window.ipc.openFile()
  setPreferences('singleConfig', 'devicePath', filePath)
  console.log(preferences.devicePath)
}

const formatDate = unixtime => {
  const date = new Date(unixtime * 1000)
  const options = { day: '2-digit', month: 'short', year: 'numeric' }
  return new Intl.DateTimeFormat('en-UK', options).format(date)
}

const resetPrefs = async () => {
  setPreferences('resetConfig')
  closeSettings()
  showAccessPopup()
}

async function signOut () {
  await setPreferences('singleConfig', 'lastFm', {
    loggedIn: false,
    apiKey: '',
    userToken: '',
    sessionKey: '',
    username: '',
    registered: ''
  })
  closeSettings()
  showAccessPopup()
}

onMounted(async () => {})
</script>

<style scoped>
@import '../assets/switch.css';
.sidebar {
  width: 330px;
  height: 100vh;
  background-color: var(--bg-primary);
  box-shadow: -5px -5px 20px var(--shadow-color);
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.header {
  position: relative;
  height: 50px;
  border-bottom: 1.5px solid var(--border-color);
  margin: 0 15px 0 15px;
  display: flex;
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 10px;
  align-items: center;
}

.header img {
  height: 25px;
  cursor: pointer;
  position: absolute;
  opacity: 0.5;
  filter: var(--icon-filter);
}

.header img:hover {
  opacity: 1;
}

.header h1 {
  margin: 0;
  flex: 1;
  text-align: center;
}

.content {
  padding: 15px;
}

.log {
  padding: 15px;
  text-align: center;
  color: red;
  opacity: 0;
  transition: opacity 0.5s;
}

.fade-out {
  opacity: 1;
  animation: fadeOut 4s forwards;
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.user {
  display: flex;
  align-items: center;
  padding: 5px;
  border-radius: 10px;
}

.picture {
  width: 50px;
  height: 50px;
  background-color: rgb(11, 18, 21, 1);
  border-radius: 25px;
}

.picture img {
  width: 100%;
  height: 100%;
  border-radius: 25px;
}

.account {
  padding-left: 15px;
}

.username {
  font-family: 'Barlow-Bold', sans-serif;
  font-size: 20px;
  margin: 0;
}

.usermeta {
  font-size: 12px;
  margin: 0;
  padding-top: 4px;
  opacity: 0.5;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 34px;
  padding: 6px 0;
  background-color: var(--bg-secondary);
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 14px;
  border-bottom: 1px solid var(--border-color);
}

.settings-item-label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-button {
  position: relative;
  appearance: none;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  border: 1px solid var(--info-btn-border);
  background: var(--info-btn-bg);
  color: var(--info-btn-text);
  font-size: 11px;
  line-height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: help;
  font-family: 'Barlow-Regular', sans-serif;
}

.info-button:hover {
  border-color: var(--border-color-strong);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.info-button:focus-visible {
  outline: 2px solid rgba(1, 125, 199, 0.4);
  outline-offset: 2px;
}

.info-tooltip {
  position: absolute;
  top: 28px;
  left: 50%;
  transform: translate(-50%, 6px);
  min-width: 200px;
  max-width: 260px;
  padding: 8px 10px;
  border-radius: 8px;
  background-color: var(--tooltip-bg);
  color: var(--tooltip-text);
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 12px;
  line-height: 1.3;
  text-align: left;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, transform 0.15s ease;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 8px 20px rgba(11, 18, 21, 0.25);
}

.info-tooltip::after {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: transparent transparent rgb(11, 18, 21) transparent;
}

.info-button:hover .info-tooltip,
.info-button:focus-visible .info-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
}

.settings-group .settings-item:last-child {
  border-bottom: none;
}

.settings-group {
  margin: 10px 0 0 0;
  padding: 6px 15px 6px 15px;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border-radius: 10px;
}

.settings-button {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 27px;
  padding: 4px 15px 4px 15px;
  margin: 10px 0 0 0;
  background-color: var(--bg-secondary);
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 14px;
}

p {
  overflow: hidden;
  text-overflow: ellipsis;
}

.settings-button:hover {
  background-color: var(--bg-tertiary);
}

.param-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 27px;
  padding: 8px 15px 8px 15px;
  margin: 10px 0 0 0;
  background-color: var(--bg-secondary);
  border-radius: 10px;
  cursor: pointer;
}

.param-button p:first-child {
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 14px;
}

.param-button p:last-child {
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 14px;
  color: var(--text-muted);
}

.param-button:hover {
  background-color: var(--bg-tertiary);
}
</style>
