const { app } = require('electron')
const path = require('path')
const fs = require('fs')

const userDataPath = app.getPath('userData')
const configFilePath = path.join(userDataPath, 'preferences.json')

const defaults = {
  windowBounds: { width: 640, height: 480 },
  autoScan: true,
  autoDelete: true,
  autoUpload: false,
  devicePath: '/Volumes/iPod',
  lastFm: {
    loggedIn: false,
    apiKey: '',
    sessionKey: '',
    username: '',
    profilePicture: '',
    registered: ''
  }
}

function readConfigFile () {
  try {
    const config = JSON.parse(fs.readFileSync(configFilePath))
    return config
  } catch (error) {
    return defaults
  }
}

function writeConfigFile (config) {
  // console.log('writing config file', config)
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config))
  } catch (error) {
    console.error('Error writing config file:', error)
  }
}

function getConfig (key) {
  const config = readConfigFile()
  return config[key]
}

function getFullConfig () {
  const config = readConfigFile()
  return config
}

function setConfig (key, value) {
  const config = readConfigFile()

  if (typeof value === 'object') {
    config[key] = { ...config[key], ...value }
  } else {
    config[key] = value
  }

  writeConfigFile(config)
  return config
}

function setFullConfig (newConfig) {
  writeConfigFile(newConfig)
  return newConfig
}

module.exports = {
  getConfig,
  getFullConfig,
  setConfig,
  setFullConfig,
  defaults
}
