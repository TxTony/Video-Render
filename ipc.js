/**
 * VideoRender — IPC handler registration
 * Bridges Electron's main process IPC with the lib modules.
 * @author TxTony
 */

const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const { resolveFFmpegPath, resolveFFprobePath, probeMediaMetadata, probeMediaDuration } = require('./lib/ffmpeg');
const { render, cancelRender } = require('./lib/render');
const { convertAudio, cancelConvert } = require('./lib/convert');

/**
 * Register all IPC handlers for the renderer process.
 * @param {BrowserWindow} mainWindow - The main Electron window
 * @param {string} appDir - The application root directory (__dirname)
 * @returns {{ sendToRenderer: function, cancelRender: function }}
 */
function registerIpcHandlers(mainWindow, appDir) {
  const ffmpegPath = resolveFFmpegPath(appDir);
  const ffprobePath = resolveFFprobePath(appDir);

  function sendToRenderer(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  }

  ipcMain.handle('probe-metadata', async (event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return {};
    return probeMediaMetadata(ffprobePath, filePath);
  });

  ipcMain.handle('pick-output', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save video as',
      defaultPath: 'output.mp4',
      filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
    });
    return result.canceled ? null : result.filePath;
  });

  ipcMain.handle('cancel-render', () => {
    cancelRender();
  });

  ipcMain.handle('render', async (event, opts) => {
    return render(opts, {
      ffmpegPath,
      ffprobePath,
      onProgress: (seconds) => sendToRenderer('render-progress', { seconds })
    });
  });

  ipcMain.handle('pick-convert-output', async (event, format) => {
    const extMap = {
      mp3: 'mp3', wav: 'wav', flac: 'flac',
      ogg: 'ogg', aac: 'm4a', wma: 'wma'
    };
    const nameMap = {
      mp3: 'MP3 Audio', wav: 'WAV Audio', flac: 'FLAC Audio',
      ogg: 'OGG Audio', aac: 'AAC Audio', wma: 'WMA Audio'
    };
    const ext = extMap[format] || format;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save converted audio as',
      defaultPath: `output.${ext}`,
      filters: [{ name: nameMap[format] || 'Audio', extensions: [ext] }]
    });
    return result.canceled ? null : result.filePath;
  });

  ipcMain.handle('convert-audio', async (event, opts) => {
    return convertAudio(opts, {
      ffmpegPath,
      onProgress: (seconds) => sendToRenderer('convert-progress', { seconds })
    });
  });

  ipcMain.handle('cancel-convert', () => {
    cancelConvert();
  });

  ipcMain.handle('probe-duration', async (event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return 0;
    return probeMediaDuration(ffprobePath, filePath);
  });

  return { sendToRenderer, cancelRender };
}

module.exports = { registerIpcHandlers };
