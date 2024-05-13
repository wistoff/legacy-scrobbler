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
const { existsSync } = fs
import { getRecentTracks } from './renderer/utils/readDB.js'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

const isWindows = process.platform === 'win32'

const createWindow = ({ width, height }) => {
  // Create the browser window.

  const mainWindow = new BrowserWindow({
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

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
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
      const libraryFolder = existsSync(path)
      const recentPlays = existsSync(path + '/Play Counts')
      if (!libraryFolder) {
        return 'not-connected'
      } else if (!recentPlays) {
        return 'no-plays'
      } else {
        return 'ready'
      }
    } else if (action === 'getLibrary') {
      const recentTracks = await getRecentTracks(path)
      return recentTracks
    }
  } catch (error) {
    console.error('Error:', error.message)
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
  console.log('Deleting file:', path)

  const playcountPath = path + '/Play Counts'
  fs.unlink(playcountPath, err => {
    if (err) {
      console.error('Error deleting file:', err)
      event.returnValue = { success: false, error: err.message }
    } else {
      console.log('File deleted successfully')
      event.returnValue = { success: true }
    }
  })
  return true
}
