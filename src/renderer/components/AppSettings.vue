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
          <p>Automatic Library Scan</p>
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
          <p>Automatic Delete</p>
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
          <p>Automatic Upload</p>
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
  background-color: #f2f2f7;
  box-shadow: -5px -5px 20px rgb(11, 18, 21, 0.2);
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.header {
  position: relative;
  height: 50px;
  border-bottom: 1.5px solid rgb(11, 18, 21, 0.1);
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
  min-height: 27px;
  padding: 4px 0 4px 0;
  background-color: white;
  font-family: 'Barlow-Regular', sans-serif;
  font-size: 14px;
  border-bottom: 1px solid var(--lightgrey); /* Add this line */
}

.settings-group .settings-item:last-child {
  border-bottom: none;
}

.settings-group {
  margin: 10px 0 0 0;
  padding: 6px 15px 6px 15px;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 10px;
}

.settings-button {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 27px;
  padding: 4px 15px 4px 15px;
  margin: 10px 0 0 0;
  background-color: white;
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
  background-color: var(--lightgrey);
}

.param-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 27px;
  padding: 8px 15px 8px 15px;
  margin: 10px 0 0 0;
  background-color: white;
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
  color: var(--grey);
}

.param-button:hover {
  background-color: var(--lightgrey);
}
</style>
