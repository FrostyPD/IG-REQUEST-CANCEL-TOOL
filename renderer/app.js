const pickHtmlBtn = document.getElementById("pickHtmlBtn");
const loginBtn = document.getElementById("loginBtn");
const startBtn = document.getElementById("startBtn");
const retryFailedBtn = document.getElementById("retryFailedBtn");
const retrySelectedBtn = document.getElementById("retrySelectedBtn");
const stopBtn = document.getElementById("stopBtn");
const clearStateBtn = document.getElementById("clearStateBtn");
const openFailedBtn = document.getElementById("openFailedBtn");
const openRunLogBtn = document.getElementById("openRunLogBtn");
const selectAllFailedBtn = document.getElementById("selectAllFailedBtn");
const clearFailedSelectionBtn = document.getElementById("clearFailedSelectionBtn");

const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const clearReportsBtn = document.getElementById("clearReportsBtn");
const settingsDefaultSpeedEl = document.getElementById("settingsDefaultSpeed");
const settingsDefaultFailStopThresholdEl = document.getElementById("settingsDefaultFailStopThreshold");
const settingsCooldownEveryEl = document.getElementById("settingsCooldownEvery");
const settingsCooldownMinMsEl = document.getElementById("settingsCooldownMinMs");
const settingsCooldownMaxMsEl = document.getElementById("settingsCooldownMaxMs");
const settingsSoundEnabledEl = document.getElementById("settingsSoundEnabled");
const settingsPreviewEnabledEl = document.getElementById("settingsPreviewEnabled");

const latestReportBoxEl = document.getElementById("latestReportBox");
const reportsHistoryEl = document.getElementById("reportsHistory");

const filePathEl = document.getElementById("filePath");
const userCountEl = document.getElementById("userCount");
const statusTextEl = document.getElementById("statusText");
const alertTextEl = document.getElementById("alertText");
const logBox = document.getElementById("logBox");

const statTotal = document.getElementById("statTotal");
const statCurrent = document.getElementById("statCurrent");
const statSuccess = document.getElementById("statSuccess");
const statFail = document.getElementById("statFail");
const statRemaining = document.getElementById("statRemaining");

const previewUserEl = document.getElementById("previewUser");
const previewUrlEl = document.getElementById("previewUrl");
const previewImageEl = document.getElementById("previewImage");
const previewPlaceholderEl = document.getElementById("previewPlaceholder");

const progressBarEl = document.getElementById("progressBar");
const progressTextEl = document.getElementById("progressText");
const etaTextEl = document.getElementById("etaText");

const failedListEl = document.getElementById("failedList");
const failedCountTextEl = document.getElementById("failedCountText");

const winMinBtn = document.getElementById("winMinBtn");
const winMaxBtn = document.getElementById("winMaxBtn");
const winCloseBtn = document.getElementById("winCloseBtn");

let failedUsersState = [];
let failedDetailsState = [];
let selectedFailedUsers = new Set();

let currentSettings = {
  defaultSpeed: "normal",
  defaultFailStopThreshold: 35,
  cooldownEvery: 25,
  cooldownMinMs: 12000,
  cooldownMaxMs: 22000,
  soundEnabled: true,
  previewEnabled: true
};

function appendLog(text) {
  const now = new Date().toLocaleTimeString("tr-TR");
  logBox.textContent += `[${now}] ${text}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

function setStatus(text) {
  statusTextEl.textContent = text || "Hazır";
}

function setAlert(text) {
  alertTextEl.textContent = text || "-";
}

function formatEta(seconds) {
  if (!seconds || seconds <= 0) return "-";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs} sa ${mins} dk`;
  if (mins > 0) return `${mins} dk ${secs} sn`;
  return `${secs} sn`;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "-";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs} sa ${mins} dk ${secs} sn`;
  if (mins > 0) return `${mins} dk ${secs} sn`;
  return `${secs} sn`;
}

function updateStats(stats = {}) {
  statTotal.textContent = stats.total ?? 0;
  statCurrent.textContent = stats.current ?? 0;
  statSuccess.textContent = stats.success ?? 0;
  statFail.textContent = stats.fail ?? 0;
  statRemaining.textContent = stats.remaining ?? 0;

  const percent = stats.progressPercent ?? 0;
  progressBarEl.style.width = `${percent}%`;
  progressTextEl.textContent = `İlerleme: %${percent}`;
  etaTextEl.textContent = `Tahmini kalan süre: ${formatEta(stats.etaSeconds)}`;
}

function updatePreview(preview) {
  previewUserEl.textContent = `Kullanıcı: ${preview?.username || "-"}`;
  previewUrlEl.textContent = `Profil: ${preview?.profileUrl || "-"}`;

  if (!currentSettings.previewEnabled) {
    previewImageEl.removeAttribute("src");
    previewImageEl.style.display = "none";
    previewPlaceholderEl.style.display = "flex";
    previewPlaceholderEl.textContent = "Canlı önizleme ayarlardan kapalı.";
    return;
  }

  previewPlaceholderEl.textContent = "Henüz önizleme yok";

  if (preview?.imagePath) {
    const src = `file://${preview.imagePath.replace(/\\/g, "/")}?t=${preview.updatedAt || Date.now()}`;
    previewImageEl.src = src;
    previewImageEl.style.display = "block";
    previewPlaceholderEl.style.display = "none";
  } else {
    previewImageEl.removeAttribute("src");
    previewImageEl.style.display = "none";
    previewPlaceholderEl.style.display = "flex";
  }
}

function beep() {
  if (!currentSettings.soundEnabled) return;

  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.04;

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
    }, 220);
  } catch {}
}

function renderFailedUsers(details) {
  failedDetailsState = Array.isArray(details) ? details : [];
  failedUsersState = failedDetailsState.map((x) => x.username);

  for (const username of [...selectedFailedUsers]) {
    if (!failedUsersState.includes(username)) {
      selectedFailedUsers.delete(username);
    }
  }

  failedCountTextEl.textContent = `Başarısız kullanıcı sayısı: ${failedDetailsState.length}`;
  failedListEl.innerHTML = "";

  if (!failedDetailsState.length) {
    failedListEl.innerHTML = `<div class="failed-item"><label>Başarısız kullanıcı yok.</label></div>`;
    return;
  }

  for (const item of failedDetailsState) {
    const row = document.createElement("div");
    row.className = "failed-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedFailedUsers.has(item.username);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedFailedUsers.add(item.username);
      } else {
        selectedFailedUsers.delete(item.username);
      }
    });

    const content = document.createElement("div");
    content.className = "failed-meta";

    const title = document.createElement("div");
    title.className = "failed-username";
    title.textContent = item.username;

    const reason = document.createElement("div");
    reason.className = "failed-reason";
    reason.textContent = item.reason || "Bilinmeyen hata";

    const when = document.createElement("div");
    when.className = "failed-when";
    when.textContent = item.lastAttemptAt ? `Son deneme: ${item.lastAttemptAt}` : "";

    content.appendChild(title);
    content.appendChild(reason);
    content.appendChild(when);

    row.appendChild(checkbox);
    row.appendChild(content);
    failedListEl.appendChild(row);
  }
}

function renderLatestReport(report) {
  if (!report) {
    latestReportBoxEl.innerHTML = `<div>Henüz rapor yok.</div>`;
    return;
  }

  latestReportBoxEl.innerHTML = `
    <div class="report-row"><span>Durum</span><strong>${report.status || "-"}</strong></div>
    <div class="report-row"><span>Başlangıç</span><strong>${report.startedAtText || "-"}</strong></div>
    <div class="report-row"><span>Bitiş</span><strong>${report.endedAtText || "-"}</strong></div>
    <div class="report-row"><span>Süre</span><strong>${formatDuration(report.durationSeconds)}</strong></div>
    <div class="report-row"><span>Hız</span><strong>${report.speed || "-"}</strong></div>
    <div class="report-row"><span>Toplam</span><strong>${report.total || 0}</strong></div>
    <div class="report-row"><span>Başarılı</span><strong>${report.success || 0}</strong></div>
    <div class="report-row"><span>Başarısız</span><strong>${report.fail || 0}</strong></div>
    <div class="report-row"><span>Başarı oranı</span><strong>%${report.successRate || 0}</strong></div>
  `;
}

function renderReportsHistory(reports) {
  reportsHistoryEl.innerHTML = "";

  if (!Array.isArray(reports) || !reports.length) {
    reportsHistoryEl.innerHTML = `<div class="report-history-item">Rapor geçmişi yok.</div>`;
    renderLatestReport(null);
    return;
  }

  renderLatestReport(reports[0]);

  for (const report of reports) {
    const item = document.createElement("div");
    item.className = "report-history-item";
    item.innerHTML = `
      <div class="report-title">${report.status || "-"} | ${report.startedAtText || "-"}</div>
      <div class="report-sub">
        Süre: ${formatDuration(report.durationSeconds)} |
        Hız: ${report.speed || "-"} |
        Başarılı: ${report.success || 0} |
        Başarısız: ${report.fail || 0} |
        Başarı oranı: %${report.successRate || 0}
      </div>
    `;
    reportsHistoryEl.appendChild(item);
  }
}

function applySettingsToUI(settings) {
  currentSettings = {
    ...currentSettings,
    ...settings
  };

  settingsDefaultSpeedEl.value = currentSettings.defaultSpeed || "normal";
  settingsDefaultFailStopThresholdEl.value = currentSettings.defaultFailStopThreshold ?? 35;
  settingsCooldownEveryEl.value = currentSettings.cooldownEvery ?? 25;
  settingsCooldownMinMsEl.value = currentSettings.cooldownMinMs ?? 12000;
  settingsCooldownMaxMsEl.value = currentSettings.cooldownMaxMs ?? 22000;
  settingsSoundEnabledEl.checked = !!currentSettings.soundEnabled;
  settingsPreviewEnabledEl.checked = !!currentSettings.previewEnabled;
}

function collectSettingsFromUI() {
  return {
    defaultSpeed: settingsDefaultSpeedEl.value,
    defaultFailStopThreshold: Number(settingsDefaultFailStopThresholdEl.value || 35),
    cooldownEvery: Number(settingsCooldownEveryEl.value || 25),
    cooldownMinMs: Number(settingsCooldownMinMsEl.value || 12000),
    cooldownMaxMs: Number(settingsCooldownMaxMsEl.value || 22000),
    soundEnabled: settingsSoundEnabledEl.checked,
    previewEnabled: settingsPreviewEnabledEl.checked
  };
}

function hydrateUIFromState(state) {
  if (state?.selectedFilePath) {
    filePathEl.textContent = state.selectedFilePath;
  } else {
    filePathEl.textContent = "Dosya seçilmedi.";
  }

  const totalUsers = state?.users?.length || 0;
  userCountEl.textContent = String(totalUsers);

  if (state?.stats) {
    updateStats(state.stats);
  }

  renderFailedUsers(state?.failedDetails || []);
}

async function syncWindowButtons() {
  try {
    const result = await window.appAPI.isWindowMaximized();
    if (result?.ok) {
      winMaxBtn.textContent = result.isMaximized ? "❐" : "▢";
    }
  } catch {}
}

async function hydrateAll() {
  const [state, settings, reports] = await Promise.all([
    window.appAPI.getState(),
    window.appAPI.getSettings(),
    window.appAPI.getReports()
  ]);

  hydrateUIFromState(state);
  applySettingsToUI(settings);
  renderReportsHistory(reports);
}

pickHtmlBtn?.addEventListener("click", async () => {
  const result = await window.appAPI.pickHtml();

  if (!result.ok) {
    appendLog(result.message || "Dosya seçilemedi.");
    return;
  }

  filePathEl.textContent = result.filePath;
  userCountEl.textContent = String(result.totalUsers);
  appendLog(`HTML seçildi. Kullanıcı sayısı: ${result.totalUsers}`);
});

loginBtn?.addEventListener("click", async () => {
  const result = await window.appAPI.loginInstagram();

  if (!result.ok) {
    appendLog(`Instagram açılamadı: ${result.message}`);
    return;
  }

  appendLog("Instagram açıldı. Giriş yap.");
});

startBtn?.addEventListener("click", async () => {
  const result = await window.appAPI.startWorker({});

  if (!result.ok) {
    appendLog(`Başlatılamadı: ${result.message}`);
    return;
  }

  appendLog(
    `İşlem başlatıldı/devam ediyor. Varsayılan hız: ${currentSettings.defaultSpeed}, oto durdurma eşiği: %${currentSettings.defaultFailStopThreshold}`
  );
});

retryFailedBtn?.addEventListener("click", async () => {
  const result = await window.appAPI.retryFailed({});

  if (!result.ok) {
    appendLog(`Başarısızlar yeniden başlatılamadı: ${result.message}`);
    return;
  }

  appendLog(
    `Başarısız kullanıcılar için yeniden deneme başladı. Varsayılan hız: ${currentSettings.defaultSpeed}, oto durdurma eşiği: %${currentSettings.defaultFailStopThreshold}`
  );
});

retrySelectedBtn?.addEventListener("click", async () => {
  const users = [...selectedFailedUsers];

  const result = await window.appAPI.retrySelectedFailed({
    users
  });

  if (!result.ok) {
    appendLog(`Seçili başarısızlar yeniden başlatılamadı: ${result.message}`);
    return;
  }

  appendLog(`Seçili ${users.length} başarısız kullanıcı için yeniden deneme başladı.`);
});

stopBtn?.addEventListener("click", async () => {
  const result = await window.appAPI.stopWorker();

  if (!result.ok) {
    appendLog(`Durdurulamadı: ${result.message}`);
    return;
  }

  appendLog("Durdurma komutu gönderildi.");
});

clearStateBtn?.addEventListener("click", async () => {
  const result = await window.appAPI.clearState();

  if (!result.ok) {
    appendLog("Durum sıfırlanamadı.");
    return;
  }

  appendLog("Kayıtlı durum sıfırlandı.");
  selectedFailedUsers.clear();

  updateStats({
    total: 0,
    current: 0,
    success: 0,
    fail: 0,
    remaining: 0,
    progressPercent: 0,
    etaSeconds: 0
  });

  filePathEl.textContent = "Dosya seçilmedi.";
  userCountEl.textContent = "0";
  setStatus("Hazır");
  setAlert("-");
  updatePreview({ username: "-", profileUrl: "-", imagePath: "" });
  renderFailedUsers([]);
});

openFailedBtn?.addEventListener("click", async () => {
  const result = await window.appAPI.openFailedUsers();

  if (!result.ok) {
    appendLog("Başarısız kullanıcı dosyası açılamadı.");
    return;
  }

  appendLog("Başarısız kullanıcı dosyası açıldı.");
});

openRunLogBtn?.addEventListener("click", async () => {
  const result = await window.appAPI.openRunLog();

  if (!result.ok) {
    appendLog("Log dosyası açılamadı.");
    return;
  }

  appendLog("Log dosyası açıldı.");
});

selectAllFailedBtn?.addEventListener("click", () => {
  selectedFailedUsers = new Set(failedUsersState);
  renderFailedUsers(failedDetailsState);
});

clearFailedSelectionBtn?.addEventListener("click", () => {
  selectedFailedUsers.clear();
  renderFailedUsers(failedDetailsState);
});

saveSettingsBtn?.addEventListener("click", async () => {
  const settings = collectSettingsFromUI();
  const result = await window.appAPI.saveSettings(settings);

  if (!result.ok) {
    appendLog("Ayarlar kaydedilemedi.");
    return;
  }

  applySettingsToUI(settings);
  appendLog("Ayarlar kaydedildi.");
});

clearReportsBtn?.addEventListener("click", async () => {
  const result = await window.appAPI.clearReports();

  if (!result.ok) {
    appendLog("Rapor geçmişi temizlenemedi.");
    return;
  }

  appendLog("Rapor geçmişi temizlendi.");
});

winMinBtn?.addEventListener("click", async () => {
  await window.appAPI.minimizeWindow();
});

winMaxBtn?.addEventListener("click", async () => {
  await window.appAPI.toggleMaximizeWindow();
  await syncWindowButtons();
});

winCloseBtn?.addEventListener("click", async () => {
  await window.appAPI.closeWindow();
});

window.appAPI.onLog((message) => {
  appendLog(message);
});

window.appAPI.onStats((stats) => {
  updateStats(stats);
});

window.appAPI.onStatus((status) => {
  setStatus(status);
});

window.appAPI.onPreview((preview) => {
  updatePreview(preview);
});

window.appAPI.onDone((stats) => {
  beep();
  setAlert(`İşlem bitti. Başarılı: ${stats.success || 0}, Başarısız: ${stats.fail || 0}`);
});

window.appAPI.onAutoStopped(() => {
  beep();
  setAlert("Başarısız oranı çok yükseldiği için işlem otomatik durduruldu.");
});

window.appAPI.onStateUpdated((state) => {
  hydrateUIFromState(state);
});

window.appAPI.onSettingsUpdated((settings) => {
  applySettingsToUI(settings);
});

window.appAPI.onReportsUpdated((reports) => {
  renderReportsHistory(reports);
});

window.appAPI.onLatestReport((report) => {
  renderLatestReport(report);
});

setAlert("-");
syncWindowButtons();
hydrateAll();