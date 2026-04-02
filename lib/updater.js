/**
 * VideoRender — Auto-update manager
 * Checks GitHub Releases for new versions and downloads updates silently.
 * @author TxTony
 */

const { autoUpdater } = require('electron-updater');

/**
 * Initialize the auto-updater. Downloads updates silently and installs on app quit.
 * @param {function(string, string): void} sendToRenderer - Function to send IPC messages to the renderer (channel, data)
 */
function setupAutoUpdater(sendToRenderer) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    sendToRenderer('update-status', 'Downloading update...');
  });

  autoUpdater.on('update-downloaded', () => {
    sendToRenderer('update-status', 'Update ready — will install on restart');
  });

  autoUpdater.on('error', () => {});

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

module.exports = { setupAutoUpdater };
