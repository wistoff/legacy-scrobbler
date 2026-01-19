const {
  app,
  BrowserWindow,
  session,
  shell,
  ipcMain,
  dialog
} = require('electron')
const path = require('path')
const store = require('./store')
const fs = require('fs')
const { execFile } = require('child_process')
const { existsSync } = fs
import { getRecentTracks } from './renderer/utils/readDB.js'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

const isWindows = process.platform === 'win32'
const isDev = !app.isPackaged || Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL)
const logDebug = (...args) => {
  if (isDev) {
    console.log('[debug]', ...args)
  }
}
let lastDeviceStateLog = null

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

const createWindow = ({ width, height }) => {
  // Create the browser window.

  const mainWindow = new BrowserWindow({
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
      devTools: false,
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
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  const { width, height } = store.getConfig('windowBounds')

  ipcMain.handle('read:file', handleReadFile)
  ipcMain.handle('read:config', handleReadConfig)
  ipcMain.handle('write:config', handleWriteConfig)
  ipcMain.handle('dialog:openFile', handleFileOpen)
  ipcMain.handle('delete:file', handleDeleteFile)
  ipcMain.handle('device:eject', handleEjectDevice)

  createWindow({ width, height })

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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  const { width, height } = store.getConfig('windowBounds')
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow({ width, height })
  }
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
      const recentTracks = await getRecentTracks(path)
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
      await execFileAsync('mountvol.exe', [driveLetter, '/p'])
    }
    return { status: true, message: '' }
  } catch (error) {
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
