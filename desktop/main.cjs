// Meme Buddies for Windows: local control panel plus optional click-through desktop overlay.
const { app, BrowserWindow, dialog, shell, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');

app.setAppUserModelId('com.cyberspectraa.memebuddies');
const gotLock = app.requestSingleInstanceLock();
let dashboard = null;
let desktopOverlay = null;
let selectedDisplayId = null;
const BASE_URL = 'http://127.0.0.1:3927';

function displays() {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((display, index) => ({
    id: String(display.id),
    label: (display.label || 'Display ' + (index + 1))
      + (display.id === primaryId ? ' (Primary)' : '')
      + ' — ' + display.bounds.width + '×' + display.bounds.height,
    primary: display.id === primaryId
  }));
}
function chosenDisplay() {
  const all = screen.getAllDisplays();
  return all.find(display => String(display.id) === selectedDisplayId) || screen.getPrimaryDisplay();
}
function desktopState() {
  return {
    available: true,
    visible: Boolean(desktopOverlay && !desktopOverlay.isDestroyed() && desktopOverlay.isVisible()),
    displayId: selectedDisplayId || String(screen.getPrimaryDisplay().id),
    displays: displays()
  };
}
function placeOverlay() {
  if (!desktopOverlay || desktopOverlay.isDestroyed()) return;
  desktopOverlay.setBounds(chosenDisplay().bounds, false);
}
async function showDesktopOverlay() {
  if (desktopOverlay && !desktopOverlay.isDestroyed()) {
    placeOverlay();
    desktopOverlay.showInactive();
    return;
  }
  const display = chosenDisplay();
  desktopOverlay = new BrowserWindow({
    ...display.bounds,
    title: 'Meme Buddies Desktop Overlay',
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    fullscreenable: false,
    resizable: false,
    movable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false
    }
  });
  const window = desktopOverlay;
  window.setAlwaysOnTop(true, 'screen-saver');
  // Do not steal mouse clicks from games, chat, or LIVE Studio.
  window.setIgnoreMouseEvents(true, { forward: true });
  window.on('closed', () => { if (desktopOverlay === window) desktopOverlay = null; });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  try {
    await window.loadURL(BASE_URL + '/overlay');
    if (desktopOverlay === window && !window.isDestroyed()) {
      window.showInactive();
    }
  } catch (error) {
    if (!window.isDestroyed()) window.destroy();
    throw error;
  }
}
function hideDesktopOverlay() {
  if (desktopOverlay && !desktopOverlay.isDestroyed()) desktopOverlay.destroy();
  desktopOverlay = null;
}

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
    const root = process.env.PORTABLE_EXECUTABLE_DIR ||
      (app.isPackaged ? app.getPath('userData') : path.resolve(__dirname, '..'));
    const memesDir = path.join(root, 'memes');
    fs.mkdirSync(memesDir, { recursive: true });
    process.env.MEMES_DIR = memesDir;

    const isDashboard = event => dashboard && !dashboard.isDestroyed() && event.sender === dashboard.webContents;
    ipcMain.handle('memes:open-folder', async event => {
      if (!isDashboard(event)) throw new Error('Access denied');
      return shell.openPath(memesDir);
    });
    ipcMain.handle('desktop:get-state', event => {
      if (!isDashboard(event)) throw new Error('Access denied');
      return desktopState();
    });
    ipcMain.handle('desktop:set-visible', async (event, visible, displayId) => {
      if (!isDashboard(event)) throw new Error('Access denied');
      if (displayId !== undefined && displayId !== null) {
        const id = String(displayId);
        if (!screen.getAllDisplays().some(display => String(display.id) === id)) {
          throw new Error('The selected monitor is no longer connected');
        }
        selectedDisplayId = id;
      }
      if (visible === true) await showDesktopOverlay();
      else if (visible === false) hideDesktopOverlay();
      else throw new Error('Invalid overlay visibility');
      return desktopState();
    });

    screen.on('display-metrics-changed', placeOverlay);
    screen.on('display-added', placeOverlay);
    screen.on('display-removed', placeOverlay);

    try {
      const { server } = await import('../server.js');
      if (!server.listening) await once(server, 'listening');
      dashboard = new BrowserWindow({
        width: 1100,
        height: 830,
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
      dashboard.on('closed', () => { dashboard = null; hideDesktopOverlay(); app.quit(); });
      dashboard.webContents.setWindowOpenHandler(({ url }) => {
        if (url === BASE_URL + '/overlay') return { action: 'allow' };
        if (url === 'https://tikfinity.com/' || url.startsWith('https://tikfinity.com/')) {
          void shell.openExternal(url);
        }
        return { action: 'deny' };
      });
      dashboard.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith(BASE_URL + '/')) event.preventDefault();
      });
      await dashboard.loadURL(BASE_URL + '/');
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
  app.on('before-quit', hideDesktopOverlay);
  app.on('window-all-closed', () => app.quit());
}
