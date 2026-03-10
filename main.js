const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

if (app.isPackaged) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.resourcesPath, "pw-browsers");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 950,
    frame: false,
    backgroundColor: "#f6eeea",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("dialog:pickHtml", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "HTML Files", extensions: ["html", "htm"] }
    ]
  });

  if (result.canceled) return { ok: false };

  return {
    ok: true,
    path: result.filePaths[0]
  };
});

ipcMain.handle("openFailedUsers", async () => {
  const file = path.join(process.cwd(), "failed-users.txt");

  if (!fs.existsSync(file)) fs.writeFileSync(file, "");

  shell.openPath(file);
});

ipcMain.handle("openRunLog", async () => {
  const file = path.join(process.cwd(), "run-log.txt");

  if (!fs.existsSync(file)) fs.writeFileSync(file, "");

  shell.openPath(file);
});

ipcMain.handle("window:minimize", () => {
  mainWindow.minimize();
});

ipcMain.handle("window:maximize", () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.handle("window:close", () => {
  mainWindow.close();
});
