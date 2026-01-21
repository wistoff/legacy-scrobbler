const {
  app,
  BrowserWindow,
  session,
  shell,
  ipcMain,
  dialog,
  Tray,
  Menu,
  Notification,
  nativeImage
} = require('electron')
const path = require('path')
const store = require('./store')
const fs = require('fs')
const { execFile, spawn } = require('child_process')
const { existsSync } = fs
import { getRecentTracks } from './renderer/utils/readDB.js'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Inlined from electron-squirrel-startup to avoid bundling issues
const handleSquirrelEvent = () => {
  if (process.platform !== 'win32') {
    return false
  }
  const squirrelCommand = process.argv[1]
  if (!squirrelCommand) {
    return false
  }
  const target = path.basename(process.execPath)
  const updateDotExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe')

  const executeSquirrelCommand = (args, done) => {
    spawn(updateDotExe, args, { detached: true }).on('close', done)
  }

  switch (squirrelCommand) {
    case '--squirrel-install':
    case '--squirrel-updated':
      executeSquirrelCommand(['--createShortcut=' + target], app.quit)
      return true
    case '--squirrel-uninstall':
      executeSquirrelCommand(['--removeShortcut=' + target], app.quit)
      return true
    case '--squirrel-obsolete':
      app.quit()
      return true
  }
  return false
}

if (handleSquirrelEvent()) {
  // Don't run the app, squirrel is handling it
}

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')

const isWindows = process.platform === 'win32'
const isDev = !app.isPackaged || Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL)
const logDebug = (...args) => {
  if (isDev) {
    console.log('[debug]', ...args)
  }
}
let lastDeviceStateLog = null
let mainWindow = null
let tray = null
let isQuitting = false
let backgroundDeviceState = 'not-connected'
let backgroundMonitor = null
let pendingSyncPrompt = false

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    createTray()
    updateTrayTooltip()
  })
}

const execFileAsync = (file, args) => {
  return new Promise((resolve, reject) => {
    execFile(file, args, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

const resolveMacVolumePath = devicePath => {
  if (typeof devicePath !== 'string' || devicePath.length === 0) {
    return ''
  }
  const normalized = path.posix.normalize(devicePath)
  if (!normalized.startsWith('/Volumes/')) {
    return normalized
  }
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length < 2) {
    return ''
  }
  return `/${parts[0]}/${parts[1]}`
}

const getTrayIconPath = () => {
  // macOS menu bar needs a small template image, not the full app icon
  const iconName = process.platform === 'darwin' ? 'trayTemplate.png' : 'icon.ico'
  const appPathIcon = path.join(app.getAppPath(), 'images', iconName)
  if (existsSync(appPathIcon)) {
    return appPathIcon
  }
  // Fallback to resources path for packaged app
  const resourcesIcon = path.join(process.resourcesPath, 'images', iconName)
  if (existsSync(resourcesIcon)) {
    return resourcesIcon
  }
  // Final fallback to regular icon
  const fallbackName = process.platform === 'darwin' ? 'icon.icns' : 'icon.ico'
  const fallbackPath = path.join(app.getAppPath(), 'images', fallbackName)
  if (existsSync(fallbackPath)) {
    return fallbackPath
  }
  return path.join(process.resourcesPath, 'images', fallbackName)
}

const getTrayIcon = () => {
  const iconPath = getTrayIconPath()
  let icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    logDebug('tray icon missing or invalid', { iconPath })
  }
  // Mark as template image for macOS (allows automatic dark/light mode adaptation)
  if (process.platform === 'darwin') {
    const retinaPath = iconPath.replace(/\.png$/i, '@2x.png')
    if (retinaPath !== iconPath && existsSync(retinaPath)) {
      const retinaIcon = nativeImage.createFromPath(retinaPath)
      if (!retinaIcon.isEmpty()) {
        if (icon.isEmpty()) {
          icon = retinaIcon
        } else {
          icon.addRepresentation({
            scaleFactor: 2,
            dataURL: retinaIcon.toDataURL()
          })
        }
      } else {
        logDebug('retina tray icon missing or invalid', { retinaPath })
      }
    }
    icon.setTemplateImage(true)
  }
  return icon
}

const ensureWindow = () => {
  if (mainWindow) {
    return { window: mainWindow, created: false }
  }
  const { width, height } = store.getConfig('windowBounds')
  createWindow({ width, height })
  return { window: mainWindow, created: true }
}

const showMainWindow = () => {
  const { window, created } = ensureWindow()
  if (!window) {
    return
  }
  if (window.isMinimized()) {
    window.restore()
  }
  window.show()
  window.focus()
  if (pendingSyncPrompt) {
    const sendPrompt = () => {
      window.webContents.send('sync:prompt', { source: 'device' })
    }
    if (created) {
      window.webContents.once('did-finish-load', sendPrompt)
    } else {
      sendPrompt()
    }
    pendingSyncPrompt = false
  }
}

const sendSyncPrompt = source => {
  const { window, created } = ensureWindow()
  if (!window) {
    return
  }
  pendingSyncPrompt = false
  const sendPrompt = () => {
    window.webContents.send('sync:prompt', { source })
  }
  if (created) {
    window.webContents.once('did-finish-load', sendPrompt)
  } else {
    sendPrompt()
  }
  showMainWindow()
}

const createWindow = ({ width, height }) => {
  // Create the browser window.

  mainWindow = new BrowserWindow({
    titleBarStyle: isWindows ? false : 'hidden',
    frame: isWindows,
    autoHideMenuBar: true,
    width: width,
    height: height,
    minWidth: 660,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      devTools: isDev,
      preload: path.resolve(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url) // Open URL in user's browser.
    return { action: 'deny' } // Prevent the app from opening the URL.
  })

  mainWindow.on('resize', () => {
    // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
    // the height, width, and x and y coordinates.
    let { width, height } = mainWindow.getBounds()
    // Now that we have them, save them using the `set` method.
    store.setConfig('windowBounds', { width, height })
  })

  // Open the DevTools in dev mode.
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('close', event => {
    if (isQuitting) {
      return
    }
    event.preventDefault()
    mainWindow.destroy()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const createTray = () => {
  if (tray) {
    return
  }
  const icon = getTrayIcon()
  tray = new Tray(icon.isEmpty() ? getTrayIconPath() : icon)
  updateTrayTooltip()

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => showMainWindow()
    },
    {
      label: 'Start Scrobbling',
      click: () => {
        sendSyncPrompt('tray')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // On Windows, clicking tray icon opens the window
  // On macOS, clicking shows the context menu (default behavior)
  if (process.platform !== 'darwin') {
    tray.on('click', () => {
      showMainWindow()
    })
  }
}

const buildDeviceBasePath = devicePath => {
  if (typeof devicePath !== 'string' || devicePath.length === 0) {
    return ''
  }
  const trimmed = devicePath.replace(/[\\/]+$/, '')
  return path.join(trimmed, 'iPod_Control', 'iTunes')
}

const getDeviceStateForBasePath = basePath => {
  const normalized = typeof basePath === 'string'
    ? basePath.replace(/[\\/]+$/, '')
    : ''
  if (!normalized) {
    return 'not-connected'
  }
  const libraryFolder = existsSync(normalized)
  if (!libraryFolder) {
    return 'not-connected'
  }
  const playCountsPath = path.join(normalized, 'Play Counts')
  const recentPlays = existsSync(playCountsPath)
  return recentPlays ? 'ready' : 'no-plays'
}

const showDeviceNotification = () => {
  if (!Notification.isSupported()) {
    return
  }
  const icon = getTrayIcon()
  const notification = new Notification({
    title: 'iPod detected',
    body: 'Close iTunes or Apple Music, then click Start Scrobbling.',
    icon: icon.isEmpty() ? getTrayIconPath() : icon
  })
  notification.on('click', () => {
    showMainWindow()
  })
  notification.show()
}

const formatLastSyncTooltip = lastSyncAt => {
  if (!lastSyncAt) {
    return 'Last scrobbled: never'
  }
  const date = new Date(lastSyncAt * 1000)
  return `Last scrobbled: ${date.toLocaleString()}`
}

const updateTrayTooltip = () => {
  if (!tray) {
    return
  }
  const preferences = store.getFullConfig()
  const lastSyncAt = preferences?.lastSyncAt || 0
  tray.setToolTip(formatLastSyncTooltip(lastSyncAt))
}

const startBackgroundMonitor = () => {
  if (backgroundMonitor) {
    return
  }
  backgroundMonitor = setInterval(() => {
    const preferences = store.getFullConfig()
    const devicePath = preferences?.devicePath
    const basePath = buildDeviceBasePath(devicePath)
    const state = getDeviceStateForBasePath(basePath)
    updateTrayTooltip()
    if (state !== backgroundDeviceState) {
      logDebug('background device state', {
        previous: backgroundDeviceState,
        current: state
      })
    }
    if (backgroundDeviceState === 'not-connected' && state !== 'not-connected') {
      showDeviceNotification()
      pendingSyncPrompt = true
    }
    if (state === 'not-connected') {
      pendingSyncPrompt = false
    }
    backgroundDeviceState = state
  }, 5000)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (!gotSingleInstanceLock) {
    return
  }
  ipcMain.handle('read:file', handleReadFile)
  ipcMain.handle('read:config', handleReadConfig)
  ipcMain.handle('write:config', handleWriteConfig)
  ipcMain.handle('dialog:openFile', handleFileOpen)
  ipcMain.handle('delete:file', handleDeleteFile)
  ipcMain.handle('device:eject', handleEjectDevice)
  ipcMain.handle('window:show', () => {
    showMainWindow()
  })
  ipcMain.handle('notify:sync', (event, { title, body }) => {
    if (!Notification.isSupported()) {
      return { status: false }
    }
    const icon = getTrayIcon()
    const notification = new Notification({
      title: title || 'Legacy Scrobbler',
      body: body || '',
      icon: icon.isEmpty() ? getTrayIconPath() : icon
    })
    notification.on('click', () => {
      pendingSyncPrompt = true
    })
    notification.show()
    return { status: true }
  })

  if (isWindows) {
    app.setAppUserModelId('LegacyScrobbler')
    if (app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: true })
    }
  }

  createTray()
  startBackgroundMonitor()

  // Show window on first launch
  showMainWindow()

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['<all_urls>'] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "script-src 'self' https://api.legacyscrobbler.software"
          ]
        }
      })
    }
  )
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    return
  }
  if (isQuitting) {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  if (backgroundMonitor) {
    clearInterval(backgroundMonitor)
    backgroundMonitor = null
  }
})

app.on('activate', () => {
  createTray()
  updateTrayTooltip()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

async function handleReadFile (event, { path, action }) {
  try {
    if (action === 'getDeviceState') {
      const basePath = typeof path === 'string' ? path.replace(/[\\/]+$/, '') : ''
      const libraryFolder = basePath ? existsSync(basePath) : false
      const playCountsPath = basePath ? `${basePath}/Play Counts` : 'Play Counts'
      const recentPlays = basePath ? existsSync(playCountsPath) : false
      if (!libraryFolder) {
        const logEntry = { basePath, state: 'not-connected', playCountsPath }
        if (JSON.stringify(lastDeviceStateLog) !== JSON.stringify(logEntry)) {
          logDebug('device state check', logEntry)
          lastDeviceStateLog = logEntry
        }
        return 'not-connected'
      } else if (!recentPlays) {
        const logEntry = {
          basePath,
          state: 'no-plays',
          playCountsPath,
          playCountsExists: recentPlays
        }
        if (JSON.stringify(lastDeviceStateLog) !== JSON.stringify(logEntry)) {
          logDebug('device state check', logEntry)
          lastDeviceStateLog = logEntry
        }
        return 'no-plays'
      } else {
        const logEntry = {
          basePath,
          state: 'ready',
          playCountsPath,
          playCountsExists: recentPlays
        }
        if (JSON.stringify(lastDeviceStateLog) !== JSON.stringify(logEntry)) {
          logDebug('device state check', logEntry)
          lastDeviceStateLog = logEntry
        }
        return 'ready'
      }
    } else if (action === 'getLibrary') {
      logDebug('getLibrary', { path })
      const onProgress = progress => {
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('scan:progress', progress)
        }
      }
      const recentTracks = await getRecentTracks(path, onProgress)
      return recentTracks
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

async function handleEjectDevice (event, { path: devicePath }) {
  if (!isWindows && process.platform !== 'darwin') {
    return {
      status: false,
      message: 'Safe eject is only supported on Windows and macOS for now.'
    }
  }

  const safePath = typeof devicePath === 'string' ? devicePath : ''
  const trimmedPath = safePath.replace(/[\\/]+$/, '')

  if (process.platform === 'darwin') {
    const volumePath = resolveMacVolumePath(trimmedPath)
    if (!volumePath) {
      return {
        status: false,
        message: 'Invalid device path. Please reselect your iPod.'
      }
    }
    logDebug('eject device requested', { devicePath: trimmedPath, volumePath })
    try {
      await execFileAsync('diskutil', ['eject', volumePath])
      return { status: true, message: '' }
    } catch (error) {
      if (!existsSync(volumePath)) {
        logDebug('eject error but volume already gone', { volumePath })
        return { status: true, message: '' }
      }
      console.error('Error ejecting device:', error)
      return {
        status: false,
        message: 'Unable to eject the iPod. Please try again.'
      }
    }
  }

  const root = trimmedPath ? path.parse(trimmedPath).root : ''
  const driveLetter = root ? root.replace(/[\\/]+$/, '') : ''
  if (!driveLetter) {
    return {
      status: false,
      message: 'Invalid device path. Please reselect your iPod.'
    }
  }

  const drivePath = `${driveLetter}\\`
  logDebug('eject device requested', { devicePath: trimmedPath, driveLetter })

  try {
    const script = [
      `$drive='${drivePath}'`,
      '$shell=New-Object -ComObject Shell.Application',
      '$item=$shell.Namespace(17).ParseName($drive)',
      'if ($null -eq $item) { exit 2 }',
      '$item.InvokeVerb(\"Eject\")'
    ].join('; ')
    await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script])
    await new Promise(resolve => setTimeout(resolve, 500))
    if (existsSync(drivePath)) {
      logDebug('eject verb returned but drive still mounted', { drivePath })
      try {
        await execFileAsync('mountvol.exe', [driveLetter, '/p'])
      } catch (error) {
        if (existsSync(drivePath)) {
          throw error
        }
        logDebug('mountvol failed but drive already gone', { drivePath })
      }
    }
    return { status: true, message: '' }
  } catch (error) {
    if (!existsSync(drivePath)) {
      logDebug('eject error but drive already gone', { drivePath })
      return { status: true, message: '' }
    }
    console.error('Error ejecting device:', error)
    return {
      status: false,
      message: 'Unable to eject the iPod. Please try again.'
    }
  }
}

async function handleFileOpen (event) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    buttonLabel: 'Select iPod',
    properties: ['openDirectory']
  })
  if (!canceled) {
    return filePaths[0]
  }
}

async function handleReadConfig (event, { action, key }) {
  if (action === 'singleConfig') {
    const config = store.getConfig(key)
    return config
  } else if (action === 'fullConfig') {
    const config = store.getFullConfig()
    return config
  }
}

async function handleWriteConfig (event, { action, key, value }) {
  if (action === 'singleConfig') {
    const config = await store.setConfig(key, value)
    return config
  } else if (action === 'fullConfig') {
    const config = await store.setFullConfig(value)
    return config
  } else if (action === 'resetConfig') {
    const config = await store.setFullConfig(store.defaults)
    return config
  }
}

async function handleDeleteFile (event, { path }) {
  const basePath = typeof path === 'string' ? path.replace(/[\\/]+$/, '') : ''
  const playcountPath = basePath ? `${basePath}/Play Counts` : 'Play Counts'
  console.log('Deleting file:', playcountPath)

  try {
    await fs.promises.unlink(playcountPath)
    console.log('File deleted successfully')
    return true
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Play Counts already deleted')
      return true
    }
    console.error('Error deleting file:', error)
    return false
  }
}
