const fs = require("fs");
const path = require("path");

const STATE_FILE = path.resolve("./app-state.json");
const SETTINGS_FILE = path.resolve("./app-settings.json");
const REPORTS_FILE = path.resolve("./run-reports.json");
const FAIL_FILE = path.resolve("./failed-users.txt");
const LOG_FILE = path.resolve("./run-log.txt");

function getDefaultState() {
  return {
    selectedFilePath: null,
    users: [],
    processed: [],
    failedUsers: [],
    failedDetails: [],
    currentIndex: 0,
    stats: {
      total: 0,
      current: 0,
      success: 0,
      fail: 0,
      remaining: 0
    }
  };
}

function getDefaultSettings() {
  return {
    defaultSpeed: "normal",
    defaultFailStopThreshold: 35,
    cooldownEvery: 25,
    cooldownMinMs: 12000,
    cooldownMaxMs: 22000,
    soundEnabled: true,
    previewEnabled: true
  };
}

function loadJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function loadState() {
  return loadJsonSafe(STATE_FILE, getDefaultState());
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function clearState() {
  saveState(getDefaultState());
}

function loadSettings() {
  return loadJsonSafe(SETTINGS_FILE, getDefaultSettings());
}

function saveSettings(settings) {
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify({ ...getDefaultSettings(), ...settings }, null, 2),
    "utf8"
  );
}

function loadReports() {
  try {
    if (!fs.existsSync(REPORTS_FILE)) return [];
    const raw = fs.readFileSync(REPORTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReports(reports) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), "utf8");
}

function addReport(report) {
  const reports = loadReports();
  reports.unshift(report);
  saveReports(reports.slice(0, 100));
}

function clearReports() {
  saveReports([]);
}

function saveFailedUsers(failedUsers, failedDetails = []) {
  const lines = failedDetails.length
    ? failedDetails.map((item) => `${item.username} | ${item.reason || "Bilinmeyen hata"}`)
    : failedUsers.map((u) => u);

  fs.writeFileSync(FAIL_FILE, lines.join("\n"), "utf8");
}

function appendLogLine(line) {
  fs.appendFileSync(LOG_FILE, line + "\n", "utf8");
}

module.exports = {
  loadState,
  saveState,
  clearState,
  loadSettings,
  saveSettings,
  loadReports,
  saveReports,
  addReport,
  clearReports,
  saveFailedUsers,
  appendLogLine,
  getDefaultSettings
};