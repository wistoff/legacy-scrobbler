const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ipc', {
  readFile: (path, action) => ipcRenderer.invoke('read:file', { path, action }),
  deletePlaycount: (path) => ipcRenderer.invoke('delete:file', { path }),
  ejectDevice: (path) => ipcRenderer.invoke('device:eject', { path }),
  showWindow: () => ipcRenderer.invoke('window:show'),
  showNotification: (title, body) =>
    ipcRenderer.invoke('notify:sync', { title, body }),
  onSyncPrompt: (handler) => ipcRenderer.on('sync:prompt', handler),
  onScanProgress: (handler) => ipcRenderer.on('scan:progress', handler),
  readConfig: (action, key) =>
    ipcRenderer.invoke('read:config', { action, key }),
  writeConfig: (action, key, value) =>
    ipcRenderer.invoke('write:config', { action, key, value }),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
})
