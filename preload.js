const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appAPI", {
  pickHtml: () => ipcRenderer.invoke("dialog:pickHtml"),
  loginInstagram: () => ipcRenderer.invoke("worker:login"),
  startWorker: (options) => ipcRenderer.invoke("worker:start", options),
  retryFailed: (options) => ipcRenderer.invoke("worker:retryFailed", options),
  retrySelectedFailed: (options) => ipcRenderer.invoke("worker:retrySelectedFailed", options),
  stopWorker: () => ipcRenderer.invoke("worker:stop"),

  getState: () => ipcRenderer.invoke("state:get"),
  clearState: () => ipcRenderer.invoke("state:clear"),

  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),

  getReports: () => ipcRenderer.invoke("reports:get"),
  clearReports: () => ipcRenderer.invoke("reports:clear"),

  openFailedUsers: () => ipcRenderer.invoke("file:openFailedUsers"),
  openRunLog: () => ipcRenderer.invoke("file:openRunLog"),

  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggleMaximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  isWindowMaximized: () => ipcRenderer.invoke("window:isMaximized"),

  onLog: (callback) => ipcRenderer.on("worker:log", (_event, data) => callback(data)),
  onStats: (callback) => ipcRenderer.on("worker:stats", (_event, data) => callback(data)),
  onStatus: (callback) => ipcRenderer.on("worker:status", (_event, data) => callback(data)),
  onPreview: (callback) => ipcRenderer.on("worker:preview", (_event, data) => callback(data)),
  onDone: (callback) => ipcRenderer.on("worker:done", (_event, data) => callback(data)),
  onAutoStopped: (callback) => ipcRenderer.on("worker:autoStopped", (_event, data) => callback(data)),
  onStateUpdated: (callback) => ipcRenderer.on("state:updated", (_event, data) => callback(data)),
  onSettingsUpdated: (callback) => ipcRenderer.on("settings:updated", (_event, data) => callback(data)),
  onReportsUpdated: (callback) => ipcRenderer.on("reports:updated", (_event, data) => callback(data)),
  onLatestReport: (callback) => ipcRenderer.on("report:latest", (_event, data) => callback(data))
});