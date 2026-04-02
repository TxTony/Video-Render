/**
 * VideoRender — Main process entry point
 * Creates the Electron window and wires up IPC handlers and auto-updater.
 * @author TxTony
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc');
const { setupAutoUpdater } = require('./lib/updater');
const { cancelRender } = require('./lib/render');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'default',
    title: 'VideoRender'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  const { sendToRenderer } = registerIpcHandlers(mainWindow, __dirname);
  setupAutoUpdater(sendToRenderer);
});

app.on('window-all-closed', () => {
  cancelRender();
  app.quit();
});
