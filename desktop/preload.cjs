const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('memeDesktop', {
  openMemesFolder: () => ipcRenderer.invoke('memes:open-folder')
});
