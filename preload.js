const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  convertImages: (filePaths, config) => ipcRenderer.invoke('convert-images', filePaths, config),
  convertImagesFromBuffer: (fileData, config) => ipcRenderer.invoke('convert-images-from-buffer', fileData, config),
  getConvertedImages: () => ipcRenderer.invoke('get-converted-images'),
  openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),
  deleteConvertedImage: (filePath) => ipcRenderer.invoke('delete-converted-image', filePath)
});
