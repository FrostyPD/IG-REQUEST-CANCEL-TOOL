const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const { parsePendingHtml } = require("./src/parser");
const { InstagramCancellerWorker } = require("./src/worker");
const {
  loadState,
  saveState,
  clearState,
  loadSettings,
  saveSettings,
  loadReports,
  addReport,
  clearReports
} = require("./src/state");

let mainWindow = null;
let parsedUsers = [];
let worker = null;

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function showDesktopNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 980,
    minWidth: 1180,
    minHeight: 820,
    backgroundColor: "#f6eeea",
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function pushSettings() {
  sendToRenderer("settings:updated", loadSettings());
}

function pushReports() {
  sendToRenderer("reports:updated", loadReports());
}

function buildAndStoreReport(status) {
  const state = loadState();
  if (!worker) return;

  const report = worker.getRunReport(status, state);
  if (!report) return;

  addReport(report);
  pushReports();

  return report;
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", async () => {
  if (worker) {
    try {
      await worker.stop();
    } catch {}
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

function getWorker() {
  if (!worker) {
    worker = new InstagramCancellerWorker({
      onLog: (message) => sendToRenderer("worker:log", message),
      onStats: (stats) => sendToRenderer("worker:stats", stats),
      onStatus: (status) => {
        sendToRenderer("worker:status", status);

        if (status === "Tamamlandı") {
          const state = loadState();
          const report = buildAndStoreReport("Tamamlandı");

          showDesktopNotification(
            "İşlem tamamlandı",
            `Başarılı: ${state.stats?.success || 0} | Başarısız: ${state.stats?.fail || 0}`
          );

          sendToRenderer("worker:done", state.stats || {});
          sendToRenderer("state:updated", state);
          if (report) sendToRenderer("report:latest", report);
        }

        if (status === "Otomatik durduruldu") {
          const report = buildAndStoreReport("Otomatik durduruldu");
          showDesktopNotification(
            "İşlem durduruldu",
            "Başarısız oranı yükseldiği için işlem otomatik durduruldu."
          );
          sendToRenderer("worker:autoStopped", {});
          sendToRenderer("state:updated", loadState());
          if (report) sendToRenderer("report:latest", report);
        }

        if (status === "Durduruldu") {
          const report = buildAndStoreReport("Elle durduruldu");
          sendToRenderer("state:updated", loadState());
          if (report) {
            pushReports();
            sendToRenderer("report:latest", report);
          }
        }
      },
      onPreview: (preview) => sendToRenderer("worker:preview", preview),
      onStateUpdate: (state) => sendToRenderer("state:updated", state)
    });
  }
  return worker;
}

ipcMain.handle("window:minimize", () => {
  if (mainWindow) mainWindow.minimize();
  return { ok: true };
});

ipcMain.handle("window:toggleMaximize", () => {
  if (!mainWindow) return { ok: false };

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return { ok: true, isMaximized: false };
  } else {
    mainWindow.maximize();
    return { ok: true, isMaximized: true };
  }
});

ipcMain.handle("window:close", () => {
  if (mainWindow) mainWindow.close();
  return { ok: true };
});

ipcMain.handle("window:isMaximized", () => {
  return { ok: true, isMaximized: !!mainWindow?.isMaximized() };
});

ipcMain.handle("dialog:pickHtml", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "HTML Files", extensions: ["html", "htm"] }]
  });

  if (result.canceled || !result.filePaths.length) {
    return { ok: false, message: "Dosya seçilmedi." };
  }

  const filePath = result.filePaths[0];

  if (!fs.existsSync(filePath)) {
    return { ok: false, message: "Dosya bulunamadı." };
  }

  try {
    const users = parsePendingHtml(filePath);
    parsedUsers = users;

    const old = loadState();
    const newState = {
      ...old,
      selectedFilePath: filePath,
      users,
      stats: {
        ...old.stats,
        total: users.length,
        remaining: Math.max(users.length - (old.processed?.length || 0), 0)
      }
    };

    saveState(newState);
    sendToRenderer("state:updated", newState);

    return {
      ok: true,
      filePath,
      totalUsers: users.length
    };
  } catch (err) {
    return {
      ok: false,
      message: `HTML okunamadı: ${err.message}`
    };
  }
});

ipcMain.handle("worker:login", async () => {
  try {
    const w = getWorker();
    await w.initBrowser();
    await w.openInstagramHome();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
});

ipcMain.handle("worker:start", async (_event, options) => {
  try {
    const persisted = loadState();
    const settings = loadSettings();
    const users = parsedUsers.length ? parsedUsers : (persisted.users || []);

    if (!users.length) {
      return { ok: false, message: "Önce bir HTML dosyası seç." };
    }

    const w = getWorker();
    await w.initBrowser();

    w.start({
      users,
      speed: options?.speed || settings.defaultSpeed || "normal",
      resumeState: persisted,
      failStopThreshold: options?.failStopThreshold ?? settings.defaultFailStopThreshold ?? 35,
      settings
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
});

ipcMain.handle("worker:retryFailed", async (_event, options) => {
  try {
    const persisted = loadState();
    const settings = loadSettings();
    const failedUsers = persisted.failedUsers || [];

    if (!failedUsers.length) {
      return { ok: false, message: "Tekrar denenecek başarısız kullanıcı yok." };
    }

    const retryState = {
      ...persisted,
      users: failedUsers,
      processed: [],
      failedUsers: [],
      failedDetails: [],
      currentIndex: 0,
      stats: {
        total: failedUsers.length,
        current: 0,
        success: 0,
        fail: 0,
        remaining: failedUsers.length
      }
    };

    saveState(retryState);
    sendToRenderer("state:updated", retryState);

    const w = getWorker();
    await w.initBrowser();

    w.start({
      users: failedUsers,
      speed: options?.speed || settings.defaultSpeed || "normal",
      resumeState: retryState,
      failStopThreshold: options?.failStopThreshold ?? settings.defaultFailStopThreshold ?? 35,
      settings
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
});

ipcMain.handle("worker:retrySelectedFailed", async (_event, options) => {
  try {
    const selectedUsers = options?.users || [];
    const settings = loadSettings();

    if (!selectedUsers.length) {
      return { ok: false, message: "Önce en az bir başarısız kullanıcı seç." };
    }

    const retryState = {
      selectedFilePath: null,
      users: selectedUsers,
      processed: [],
      failedUsers: [],
      failedDetails: [],
      currentIndex: 0,
      stats: {
        total: selectedUsers.length,
        current: 0,
        success: 0,
        fail: 0,
        remaining: selectedUsers.length
      }
    };

    saveState(retryState);
    sendToRenderer("state:updated", retryState);

    const w = getWorker();
    await w.initBrowser();

    w.start({
      users: selectedUsers,
      speed: options?.speed || settings.defaultSpeed || "normal",
      resumeState: retryState,
      failStopThreshold: options?.failStopThreshold ?? settings.defaultFailStopThreshold ?? 35,
      settings
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
});

ipcMain.handle("worker:stop", async () => {
  try {
    if (worker) {
      await worker.stop();
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
});

ipcMain.handle("state:get", async () => loadState());
ipcMain.handle("settings:get", async () => loadSettings());
ipcMain.handle("reports:get", async () => loadReports());

ipcMain.handle("settings:save", async (_event, settings) => {
  saveSettings(settings);
  pushSettings();
  return { ok: true };
});

ipcMain.handle("reports:clear", async () => {
  clearReports();
  pushReports();
  return { ok: true };
});

ipcMain.handle("state:clear", async () => {
  clearState();
  const state = loadState();
  sendToRenderer("state:updated", state);
  return { ok: true };
});

ipcMain.handle("file:openFailedUsers", async () => {
  const filePath = path.resolve("./failed-users.txt");
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "", "utf8");
  await shell.openPath(filePath);
  return { ok: true };
});

ipcMain.handle("file:openRunLog", async () => {
  const filePath = path.resolve("./run-log.txt");
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "", "utf8");
  await shell.openPath(filePath);
  return { ok: true };
});