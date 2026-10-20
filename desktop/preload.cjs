const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('memeDesktop', {
  openMemesFolder: () => ipcRenderer.invoke('memes:open-folder'),
  getOverlayState: () => ipcRenderer.invoke('desktop:get-state'),
  setOverlayVisible: (visible, displayId) => ipcRenderer.invoke('desktop:set-visible', visible, displayId)
});
