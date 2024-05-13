const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ipc', {
  readFile: (path, action) => ipcRenderer.invoke('read:file', { path, action }),
  deletePlaycount: (path) => ipcRenderer.invoke('delete:file', { path }),
  readConfig: (action, key) =>
    ipcRenderer.invoke('read:config', { action, key }),
  writeConfig: (action, key, value) =>
    ipcRenderer.invoke('write:config', { action, key, value }),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
})
