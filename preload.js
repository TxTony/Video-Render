/**
 * VideoRender — Preload script
 * Exposes a safe API from the main process to the renderer via contextBridge.
 * @author TxTony
 */

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  pickOutput: () => ipcRenderer.invoke('pick-output'),
  render: (opts) => ipcRenderer.invoke('render', opts),
  cancelRender: () => ipcRenderer.invoke('cancel-render'),
  probeMetadata: (filePath) => ipcRenderer.invoke('probe-metadata', filePath),
  onProgress: (callback) => ipcRenderer.on('render-progress', (_, data) => callback(data)),
  getFilePath: (file) => webUtils.getPathForFile(file),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_, msg) => callback(msg))
});
