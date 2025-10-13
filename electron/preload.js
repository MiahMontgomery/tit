const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Dialog operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  
  // Project operations
  createProject: (projectData) => ipcRenderer.invoke('create-project', projectData),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  
  // Voice operations
  generateVoice: (projectId, text, voiceId) => ipcRenderer.invoke('generate-voice', { projectId, text, voiceId }),
  
  // Screenshot operations
  takeScreenshot: (projectId) => ipcRenderer.invoke('take-screenshot', { projectId }),
  
  // Update operations
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Menu event listeners
  onMenuNewProject: (callback) => ipcRenderer.on('menu-new-project', callback),
  onMenuOpenProject: (callback) => ipcRenderer.on('menu-open-project', callback),
  onMenuExportProject: (callback) => ipcRenderer.on('menu-export-project', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Platform detection
  platform: process.platform,
  isElectron: true
});

// Expose a minimal Node.js API for the renderer process
contextBridge.exposeInMainWorld('nodeAPI', {
  path: {
    join: (...args) => require('path').join(...args),
    dirname: (path) => require('path').dirname(path),
    basename: (path) => require('path').basename(path),
    extname: (path) => require('path').extname(path),
    resolve: (...args) => require('path').resolve(...args)
  },
  os: {
    platform: () => require('os').platform(),
    arch: () => require('os').arch(),
    homedir: () => require('os').homedir(),
    tmpdir: () => require('os').tmpdir()
  },
  fs: {
    existsSync: (path) => require('fs').existsSync(path),
    statSync: (path) => require('fs').statSync(path),
    readdirSync: (path) => require('fs').readdirSync(path)
  }
});
