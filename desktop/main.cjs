// Desktop wrapper: provides a real Windows executable while retaining the LIVE Studio browser overlay.
const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');

app.setAppUserModelId('com.cyberspectraa.memebuddies');
const gotLock = app.requestSingleInstanceLock();
let dashboard;
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (dashboard && !dashboard.isDestroyed()) {
      if (dashboard.isMinimized()) dashboard.restore();
      dashboard.focus();
    }
  });
  app.whenReady().then(async () => {
    // Portable EXE: the PNG folder is beside the downloaded EXE.
    // Developer mode: the PNG folder is inside the repository.
    const root = process.env.PORTABLE_EXECUTABLE_DIR ||
      (app.isPackaged ? app.getPath('userData') : path.resolve(__dirname, '..'));
    const memesDir = path.join(root, 'memes');
    fs.mkdirSync(memesDir, { recursive: true });
    process.env.MEMES_DIR = memesDir;

    ipcMain.handle('memes:open-folder', async () => shell.openPath(memesDir));
    try {
      const { server } = await import('../server.js');
      if (!server.listening) await once(server, 'listening');
      dashboard = new BrowserWindow({
        width: 1100,
        height: 800,
        minWidth: 700,
        minHeight: 560,
        title: 'Meme Buddies',
        show: false,
        backgroundColor: '#10101c',
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      });
      dashboard.webContents.setWindowOpenHandler(({ url }) => {
        if (url === 'http://127.0.0.1:3927/overlay') return { action: 'allow' };
        if (url === 'https://tikfinity.com/' || url.startsWith('https://tikfinity.com/')) {
          void shell.openExternal(url);
        }
        return { action: 'deny' };
      });
      dashboard.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('http://127.0.0.1:3927/')) event.preventDefault();
      });
      await dashboard.loadURL('http://127.0.0.1:3927/');
      dashboard.show();
    } catch (error) {
      dialog.showErrorBox('Meme Buddies could not start',
        String(error?.message || error) + '\n\nMake sure another copy is not using port 3927.');
      app.quit();
    }
  }).catch(error => {
    dialog.showErrorBox('Meme Buddies failed', String(error?.message || error));
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
}
