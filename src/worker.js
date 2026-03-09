const { chromium } = require("playwright");
const path = require("path");
const { saveState, saveFailedUsers, appendLogLine } = require("./state");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalize(text) {
  return (text || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function looksLikeRequested(text) {
  const t = normalize(text);
  return ((t.includes("istek") && t.includes("gönder")) || t.includes("requested"));
}

function looksLikeConfirm(text) {
  const t = normalize(text);
  return (
    (t.includes("isteği") && t.includes("iptal")) ||
    t.includes("cancel request") ||
    t.includes("geri çek") ||
    t.includes("takibi bırak") ||
    t.includes("unfollow")
  );
}

function looksLikeFollow(text) {
  const t = normalize(text);
  return t === "takip et" || t === "follow";
}

class InstagramCancellerWorker {
  constructor({ onLog, onStats, onStatus, onPreview, onStateUpdate }) {
    this.onLog = onLog || (() => {});
    this.onStats = onStats || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onPreview = onPreview || (() => {});
    this.onStateUpdate = onStateUpdate || (() => {});

    this.context = null;
    this.page = null;
    this.running = false;
    this.stopped = false;
    this.stateRef = null;

    this.adaptiveDelayMultiplier = 1;
    this.consecutiveFailures = 0;
    this.processedSinceCooldown = 0;
    this.previewPath = path.resolve("./current-preview.png");
    this.startedAt = null;
    this.failStopThreshold = 35;
    this.currentSpeedName = "normal";
    this.currentSettings = {};
    this.lastRunInfo = null;
  }

  log(message) {
    const line = `[${new Date().toLocaleString("tr-TR")}] ${message}`;
    this.onLog(message);
    appendLogLine(line);
  }

  pushStateUpdate() {
    if (this.stateRef) {
      this.onStateUpdate(this.stateRef);
    }
  }

  emitStats() {
    if (!this.stateRef) return;

    const stats = { ...this.stateRef.stats };
    const processedCount = (stats.success || 0) + (stats.fail || 0);

    let progressPercent = 0;
    let etaSeconds = 0;

    if (stats.total > 0) {
      progressPercent = Math.round((processedCount / stats.total) * 100);
    }

    if (this.startedAt && processedCount > 0) {
      const elapsedSeconds = Math.max(1, Math.floor((Date.now() - this.startedAt) / 1000));
      const avgPerItem = elapsedSeconds / processedCount;
      etaSeconds = Math.max(0, Math.round(avgPerItem * (stats.total - processedCount)));
    }

    this.onStats({
      ...stats,
      progressPercent,
      etaSeconds
    });
  }

  emitStatus(status) {
    this.onStatus(status);
  }

  emitPreview(payload) {
    this.onPreview(payload);
  }

  getSpeedConfig(speed) {
    this.currentSpeedName = speed;

    if (speed === "fast") {
      return {
        name: "Hızlı",
        gotoMin: 900,
        gotoMax: 1500,
        afterRequestMin: 500,
        afterRequestMax: 900,
        afterConfirmMin: 700,
        afterConfirmMax: 1200,
        betweenMin: 500,
        betweenMax: 1000
      };
    }

    if (speed === "safe") {
      return {
        name: "Güvenli",
        gotoMin: 3500,
        gotoMax: 5500,
        afterRequestMin: 1800,
        afterRequestMax: 3000,
        afterConfirmMin: 2200,
        afterConfirmMax: 3600,
        betweenMin: 2000,
        betweenMax: 3500
      };
    }

    return {
      name: "Normal",
      gotoMin: 1800,
      gotoMax: 3000,
      afterRequestMin: 900,
      afterRequestMax: 1600,
      afterConfirmMin: 1200,
      afterConfirmMax: 2200,
      betweenMin: 1000,
      betweenMax: 1800
    };
  }

  scaledDelay(min, max) {
    const base = rand(min, max);
    return Math.round(base * this.adaptiveDelayMultiplier);
  }

  async maybeCooldown() {
    const every = Number(this.currentSettings.cooldownEvery || 25);
    const minMs = Number(this.currentSettings.cooldownMinMs || 12000);
    const maxMs = Number(this.currentSettings.cooldownMaxMs || 22000);

    if (every > 0 && this.processedSinceCooldown > 0 && this.processedSinceCooldown % every === 0) {
      const waitMs = rand(minMs, maxMs);
      this.emitStatus("Soğuma molası");
      this.log(`Koruma molası: ${waitMs} ms`);
      await sleep(waitMs);
      this.emitStatus("Çalışıyor");
    }
  }

  handleSuccess() {
    this.consecutiveFailures = 0;
    this.adaptiveDelayMultiplier = Math.max(1, this.adaptiveDelayMultiplier - 0.1);
  }

  handleFailure() {
    this.consecutiveFailures += 1;
    this.adaptiveDelayMultiplier = Math.min(3, this.adaptiveDelayMultiplier + 0.25);

    if (this.consecutiveFailures >= 3) {
      this.log("Arka arkaya hata algılandı. Hız otomatik düşürüldü.");
    }
  }

  shouldAutoStop() {
    if (!this.stateRef || !this.stateRef.stats) return false;

    const success = this.stateRef.stats.success || 0;
    const fail = this.stateRef.stats.fail || 0;
    const processed = success + fail;

    if (processed < 10) return false;

    const failRate = (fail / processed) * 100;
    return failRate >= this.failStopThreshold;
  }

  async initBrowser() {
    if (this.context) return;

    this.context = await chromium.launchPersistentContext(
      path.resolve("./electron-playwright-profile"),
      {
        headless: false,
        viewport: null
      }
    );

    const openPages = this.context.pages().filter((p) => !p.isClosed());
    this.page = openPages[0] || await this.context.newPage();
  }

  async openInstagramHome() {
    await this.initBrowser();

    if (!this.page || this.page.isClosed()) {
      this.page = this.context.pages().find((p) => !p.isClosed()) || await this.context.newPage();
    }

    await this.page.goto("https://www.instagram.com/", {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    this.log("Instagram açıldı. Giriş yap ve sonra uygulamadan Başlat'a bas.");
  }

  async stop() {
    this.running = false;
    this.stopped = true;
    this.emitStatus("Durduruldu");
    this.log("İşlem durduruldu.");
  }

  getRunReport(status, state) {
    if (!this.lastRunInfo?.startedAt) return null;

    const endedAt = Date.now();
    const durationSeconds = Math.max(
      1,
      Math.floor((endedAt - this.lastRunInfo.startedAt) / 1000)
    );

    const stats = state?.stats || {};
    const success = stats.success || 0;
    const fail = stats.fail || 0;
    const total = stats.total || 0;
    const processed = success + fail;
    const successRate = processed > 0 ? Math.round((success / processed) * 100) : 0;

    return {
      id: `${this.lastRunInfo.startedAt}-${endedAt}`,
      startedAt: this.lastRunInfo.startedAt,
      endedAt,
      startedAtText: new Date(this.lastRunInfo.startedAt).toLocaleString("tr-TR"),
      endedAtText: new Date(endedAt).toLocaleString("tr-TR"),
      durationSeconds,
      status,
      speed: this.lastRunInfo.speed || "normal",
      failStopThreshold: this.lastRunInfo.failStopThreshold || 35,
      total,
      processed,
      success,
      fail,
      successRate
    };
  }

  async getButtons() {
    return this.page.locator("button, div[role='button']");
  }

  async findRequestedButton() {
    const buttons = await this.getButtons();
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const el = buttons.nth(i);
      try {
        const txt = await el.innerText();
        if (looksLikeRequested(txt)) return el;
      } catch {}
    }

    return null;
  }

  async findConfirmButton() {
    const buttons = await this.getButtons();
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const el = buttons.nth(i);
      try {
        const txt = await el.innerText();
        if (looksLikeConfirm(txt)) return el;
      } catch {}
    }

    return null;
  }

  async findFollowButton() {
    const buttons = await this.getButtons();
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const el = buttons.nth(i);
      try {
        const txt = await el.innerText();
        if (looksLikeFollow(txt)) return el;
      } catch {}
    }

    return null;
  }

  async clickLocator(locator) {
    if (!locator) return false;

    try {
      await locator.scrollIntoViewIfNeeded();
    } catch {}

    try {
      await locator.click({ timeout: 4000 });
      return true;
    } catch {
      try {
        await locator.dispatchEvent("click");
        return true;
      } catch {
        return false;
      }
    }
  }

  upsertFailedDetail(username, reason) {
    if (!this.stateRef) return;

    if (!Array.isArray(this.stateRef.failedDetails)) {
      this.stateRef.failedDetails = [];
    }

    const existingIndex = this.stateRef.failedDetails.findIndex((x) => x.username === username);
    const payload = {
      username,
      reason: reason || "Bilinmeyen hata",
      lastAttemptAt: new Date().toLocaleString("tr-TR")
    };

    if (existingIndex >= 0) {
      this.stateRef.failedDetails[existingIndex] = payload;
    } else {
      this.stateRef.failedDetails.push(payload);
    }
  }

  removeFailedDetail(username) {
    if (!this.stateRef || !Array.isArray(this.stateRef.failedDetails)) return;
    this.stateRef.failedDetails = this.stateRef.failedDetails.filter((x) => x.username !== username);
  }

  markProcessed(username, ok, reason = "") {
    if (!this.stateRef) return;

    if (!this.stateRef.processed.includes(username)) {
      this.stateRef.processed.push(username);
    }

    if (!ok && !this.stateRef.failedUsers.includes(username)) {
      this.stateRef.failedUsers.push(username);
    }

    if (!ok) {
      this.upsertFailedDetail(username, reason);
    } else {
      this.stateRef.failedUsers = this.stateRef.failedUsers.filter((u) => u !== username);
      this.removeFailedDetail(username);
    }

    saveFailedUsers(this.stateRef.failedUsers, this.stateRef.failedDetails || []);
    saveState(this.stateRef);
    this.pushStateUpdate();
  }

  async updatePreview(username) {
    if (!this.currentSettings.previewEnabled) return;
    if (!this.page || this.page.isClosed()) return;

    try {
      await this.page.screenshot({
        path: this.previewPath,
        fullPage: false
      });

      this.emitPreview({
        username,
        imagePath: this.previewPath,
        profileUrl: this.page.url(),
        updatedAt: Date.now()
      });
    } catch {}
  }

  async processUser(username, speedConfig, index) {
    if (this.stopped || !this.stateRef) return;

    this.stateRef.currentIndex = index;
    this.stateRef.stats.current = index + 1;
    this.stateRef.stats.remaining = this.stateRef.stats.total - this.stateRef.stats.current + 1;

    saveState(this.stateRef);
    this.pushStateUpdate();
    this.emitStats();

    this.log(`${index + 1}/${this.stateRef.stats.total} -> ${username}`);
    this.log(`Hız profili: ${speedConfig.name} | Adaptif çarpan: x${this.adaptiveDelayMultiplier.toFixed(2)}`);

    if (!this.page || this.page.isClosed()) {
      this.page = this.context.pages().find((p) => !p.isClosed()) || await this.context.newPage();
    }

    try {
      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: "domcontentloaded",
        timeout: 45000
      });
    } catch (err) {
      const reason = `Profil açılamadı: ${err.message}`;
      this.log(reason);
      this.stateRef.stats.fail += 1;
      this.markProcessed(username, false, reason);
      this.handleFailure();
      this.emitStats();
      return;
    }

    await this.updatePreview(username);
    await sleep(this.scaledDelay(speedConfig.gotoMin, speedConfig.gotoMax));

    const requested = await this.findRequestedButton();
    if (!requested) {
      const reason = "Requested / İstek Gönderildi bulunamadı";
      this.log(reason);
      this.stateRef.stats.fail += 1;
      this.markProcessed(username, false, reason);
      this.handleFailure();
      this.emitStats();
      return;
    }

    const reqClicked = await this.clickLocator(requested);
    if (!reqClicked) {
      const reason = "İstek Gönderildi butonuna tıklanamadı";
      this.log(reason);
      this.stateRef.stats.fail += 1;
      this.markProcessed(username, false, reason);
      this.handleFailure();
      this.emitStats();
      return;
    }

    this.log("İstek Gönderildi tıklandı");
    await sleep(this.scaledDelay(speedConfig.afterRequestMin, speedConfig.afterRequestMax));

    const confirm = await this.findConfirmButton();

    if (confirm) {
      const confirmClicked = await this.clickLocator(confirm);

      if (!confirmClicked) {
        const reason = "Onay butonu bulundu ama tıklanamadı";
        this.log(reason);
        this.stateRef.stats.fail += 1;
        this.markProcessed(username, false, reason);
        this.handleFailure();
        this.emitStats();
        return;
      }

      this.log("Onay butonuna tıklandı");
      await sleep(this.scaledDelay(speedConfig.afterConfirmMin, speedConfig.afterConfirmMax));
    } else {
      this.log("Onay popupı çıkmadı, yine de durum kontrol edilecek");
    }

    const followBtn = await this.findFollowButton();
    const requestedStillThere = await this.findRequestedButton();

    if (followBtn && !requestedStillThere) {
      this.log("Başarılı");
      this.stateRef.stats.success += 1;
      this.markProcessed(username, true);
      this.handleSuccess();
    } else if (requestedStillThere) {
      const reason = "Requested hâlâ duruyor";
      this.log(`Başarısız: ${reason}`);
      this.stateRef.stats.fail += 1;
      this.markProcessed(username, false, reason);
      this.handleFailure();
    } else {
      this.log("Belirsiz ama ilerleniyor");
      this.stateRef.stats.success += 1;
      this.markProcessed(username, true);
      this.handleSuccess();
    }

    this.processedSinceCooldown += 1;
    this.emitStats();

    if (this.shouldAutoStop()) {
      this.running = false;
      this.stopped = true;
      this.emitStatus("Otomatik durduruldu");
      this.log(`Başarısız oranı eşik üstüne çıktı. Eşik: %${this.failStopThreshold}`);
      return;
    }

    await this.maybeCooldown();
    await sleep(this.scaledDelay(speedConfig.betweenMin, speedConfig.betweenMax));
  }

  async start({ users, speed = "normal", resumeState, failStopThreshold = 35, settings = {} }) {
    if (this.running) {
      throw new Error("İşlem zaten çalışıyor.");
    }

    await this.initBrowser();

    this.running = true;
    this.stopped = false;
    this.startedAt = Date.now();
    this.failStopThreshold = failStopThreshold;
    this.currentSettings = settings || {};

    this.lastRunInfo = {
      startedAt: this.startedAt,
      speed,
      failStopThreshold
    };

    this.stateRef = resumeState || {
      selectedFilePath: null,
      users,
      processed: [],
      failedUsers: [],
      failedDetails: [],
      currentIndex: 0,
      stats: {
        total: users.length,
        current: 0,
        success: 0,
        fail: 0,
        remaining: users.length
      }
    };

    if (!this.stateRef.stats.total) {
      this.stateRef.stats.total = users.length;
    }

    if (!Array.isArray(this.stateRef.failedDetails)) {
      this.stateRef.failedDetails = [];
    }

    saveState(this.stateRef);
    saveFailedUsers(this.stateRef.failedUsers || [], this.stateRef.failedDetails || []);
    this.pushStateUpdate();
    this.emitStats();
    this.emitStatus("Çalışıyor");
    this.log(`İşlem başladı. Toplam kullanıcı: ${this.stateRef.stats.total} | Seçilen hız: ${speed}`);

    const speedConfig = this.getSpeedConfig(speed);
    const startIndex = this.stateRef.currentIndex || 0;

    for (let i = startIndex; i < users.length; i++) {
      if (this.stopped) break;

      const username = users[i];
      if ((this.stateRef.processed || []).includes(username)) {
        continue;
      }

      await this.processUser(username, speedConfig, i);
      this.stateRef.currentIndex = i + 1;
      saveState(this.stateRef);
      this.pushStateUpdate();
    }

    if (!this.stopped) {
      this.emitStatus("Tamamlandı");
      this.log("İşlem tamamlandı.");
    }

    this.running = false;
  }
}

module.exports = { InstagramCancellerWorker };