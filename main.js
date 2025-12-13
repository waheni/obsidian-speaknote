"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SpeakNotePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/vaultUtils.ts
async function ensureFolder(app, path) {
  const folder = app.vault.getAbstractFileByPath(path);
  if (!folder) await app.vault.createFolder(path);
}

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  provider: "AssemblyAI",
  assemblyApiKey: "",
  openaiApiKey: "",
  deepgramApiKey: "",
  language: "en",
  defaultFolder: "SpeakNotes",
  autoTranscribe: true,
  maxRecordingSecondsFree: 60,
  // 1-minute limit
  extendedRecordingEnabled: false,
  // will enable 5-min recording
  premiumUnlocked: false
  // will enable unlimited
};
var SpeakNoteSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "SpeakNote Settings" });
    new import_obsidian.Setting(containerEl).setName("Transcription Provider").setDesc("Choose which API to use for transcription").addDropdown(
      (drop) => drop.addOption("AssemblyAI", "AssemblyAI").addOption("OpenAI", "OpenAI Whisper").addOption("Deepgram", "Deepgram Nova").setValue(this.plugin.settings.provider).onChange(async (value) => {
        this.plugin.settings.provider = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.provider === "AssemblyAI") {
      new import_obsidian.Setting(containerEl).setName("AssemblyAI API Key").setDesc("Used for Assembly AI transcriptions").addText(
        (text) => text.setPlaceholder("e1_...").setValue(this.plugin.settings.assemblyApiKey).onChange(async (value) => {
          this.plugin.settings.assemblyApiKey = value.trim();
          await this.plugin.saveSettings();
        })
      );
    } else if (this.plugin.settings.provider === "Deepgram") {
      new import_obsidian.Setting(containerEl).setName("Deepgram API Key").setDesc("Used for Deepgram transcriptions").addText(
        (text) => text.setPlaceholder("dg_...").setValue(this.plugin.settings.deepgramApiKey).onChange(async (value) => {
          this.plugin.settings.deepgramApiKey = value.trim();
          await this.plugin.saveSettings();
        })
      );
    } else {
      new import_obsidian.Setting(containerEl).setName("OpenAI API Key").setDesc("Used for cloud transcription requests").addText(
        (text) => text.setPlaceholder("sk-\u2026").setValue(this.plugin.settings.openaiApiKey).onChange(async (value) => {
          this.plugin.settings.openaiApiKey = value.trim();
          await this.plugin.saveSettings();
        })
      );
    }
    new import_obsidian.Setting(containerEl).setName("Language").setDesc("Language used for transcription.").addDropdown(
      (drop) => drop.addOption("en", "English").addOption("fr", "French").addOption("ar", "Arabic").addOption("es", "Spanish").setValue(this.plugin.settings.language).onChange(async (value) => {
        this.plugin.settings.language = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Recordings folder").setDesc("Where to save audio files").addText(
      (text) => text.setValue(this.plugin.settings.defaultFolder).onChange(async (value) => {
        this.plugin.settings.defaultFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Auto-transcribe after saving").setDesc("Automatically transcribe each new recording to text").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoTranscribe).onChange(async (value) => {
        this.plugin.settings.autoTranscribe = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Free recording limit").setDesc("The free version limits recordings to 1 minute.").addText((text) => {
      text.setValue(this.plugin.settings.maxRecordingSecondsFree.toString());
      text.setDisabled(true);
    });
    containerEl.createEl("h3", { text: "Extended Recording" });
    new import_obsidian.Setting(containerEl).setName("Coming soon").setDesc("Extended 5-minute recording will be available in v0.3.0. Sign-in required.").addText((txt) => txt.setValue("Available in next version").setDisabled(true));
    new import_obsidian.Setting(containerEl).setName("Feedback & Support").setDesc("Report bugs or request features on GitHub").addButton(
      (btn) => btn.setButtonText("Open Feedback Page").setCta().onClick(() => {
        window.open("https://github.com/waheni/obsidian-speaknote/issues", "_blank");
      })
    );
  }
};

// src/transcribe.ts
function mapLanguage(lang) {
  switch (lang) {
    case "fr":
      return "fr";
    case "de":
      return "de";
    case "es":
      return "es";
    case "en":
    default:
      return "en";
  }
}
function makeFriendlyError(provider, raw) {
  const msg = raw.toLowerCase();
  if (msg.includes("missing") || msg.includes("no api key")) {
    return `${provider}: Missing API key.`;
  }
  if (msg.includes("invalid api key") || msg.includes("invalid credentials") || msg.includes("unauthorized") || msg.includes("incorrect api key") || msg.includes("401")) {
    return `${provider}: Invalid API key.`;
  }
  if (msg.includes("quota") || msg.includes("limit") || msg.includes("insufficient_quota")) {
    return `${provider}: API quota exceeded.`;
  }
  if (msg.includes("language") || msg.includes("unsupported")) {
    return `${provider}: Language not supported.`;
  }
  if (msg.includes("forbidden") || msg.includes("403")) {
    return `${provider}: Access forbidden (check account permissions).`;
  }
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("timeout")) {
    return `${provider}: Network connection issue.`;
  }
  if (msg.includes("too many") || msg.includes("429")) {
    return `${provider}: Too many requests. Slow down and try again.`;
  }
  return `${provider}: ${raw}`;
}
async function transcribeAudio(apiKey, blob, selectedLang) {
  try {
    if (!apiKey) throw new Error("Missing API key");
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", mapLanguage(selectedLang));
    console.log("\u{1F3AC} Starting OpenAI transcription...");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    });
    const raw = await response.text();
    if (!response.ok) {
      const friendly = makeFriendlyError("OpenAI", raw);
      throw new Error(friendly);
    }
    const data = JSON.parse(raw);
    if (!data.text) throw new Error("OpenAI returned empty text.");
    return data.text;
  } catch (err) {
    console.error("\u274C OpenAI transcription failed:", err);
    throw new Error(err.message || "OpenAI transcription error");
  }
}
async function transcribeWithDeepgram(apiKey, blob, selectedLang) {
  try {
    if (!apiKey) throw new Error("Missing API key");
    console.log("\u{1F3AC} Starting Deepgram transcription...");
    const arrayBuffer = await blob.arrayBuffer();
    const response = await fetch(
      `https://api.deepgram.com/v1/listen?model=nova-3&language=${mapLanguage(selectedLang)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`
        },
        body: arrayBuffer
      }
    );
    const raw = await response.text();
    if (!response.ok) {
      const friendly = makeFriendlyError("Deepgram", raw);
      throw new Error(friendly);
    }
    const data = JSON.parse(raw);
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
    if (!transcript) throw new Error("Deepgram returned empty transcript.");
    return transcript;
  } catch (err) {
    console.error("\u274C Deepgram transcription failed:", err);
    throw new Error(err.message || "Deepgram transcription error");
  }
}
async function transcribeWithAssemblyAI(apiKey, blob, selectedLang) {
  try {
    if (!apiKey) throw new Error("Missing API key");
    console.log("\u{1F3AC} Starting AssemblyAI transcription...");
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { "Authorization": apiKey },
      body: blob
    });
    const uploadRaw = await uploadRes.text();
    if (!uploadRes.ok) {
      const friendly = makeFriendlyError("AssemblyAI", uploadRaw);
      throw new Error(friendly);
    }
    const uploadData = JSON.parse(uploadRaw);
    const audioUrl = uploadData.upload_url;
    const body = {
      audio_url: audioUrl,
      language_code: mapLanguage(selectedLang),
      auto_chapters: false
    };
    const jobRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const rawJob = await jobRes.text();
    if (!jobRes.ok) {
      const friendly = makeFriendlyError("AssemblyAI", rawJob);
      throw new Error(friendly);
    }
    const jobData = JSON.parse(rawJob);
    const jobId = jobData.id;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2e3));
      const pollRes = await fetch(
        `https://api.assemblyai.com/v2/transcript/${jobId}`,
        { headers: { "Authorization": apiKey } }
      );
      const pollText = await pollRes.text();
      const pollData = JSON.parse(pollText);
      if (pollData.status === "completed") return pollData.text;
      if (pollData.status === "error") {
        const friendly = makeFriendlyError("AssemblyAI", pollData.error || "");
        throw new Error(friendly);
      }
    }
    throw new Error("AssemblyAI timeout: transcription took too long.");
  } catch (err) {
    console.error("\u274C AssemblyAI transcription failed:", err);
    throw new Error(err.message || "AssemblyAI transcription error");
  }
}

// src/main.ts
async function safeCreateBinary(app, path, data) {
  try {
    return await app.vault.createBinary(path, data);
  } catch (err) {
    console.error("\u274C Binary file creation error:", err);
    if (err?.message?.toLowerCase()?.includes("exists")) {
      const ext = path.split(".").pop();
      const base = path.replace(`.${ext}`, "");
      const fallback = `${base}_${Date.now()}.${ext}`;
      return await app.vault.createBinary(fallback, data);
    }
    try {
      this?.handleError?.("Binary File Save", err);
    } catch {
      new import_obsidian2.Notice("\u{1F4C1} Error saving audio file.\nA fallback file will be created.");
    }
    try {
      const fallback = `SpeakNote_${Date.now()}.webm`;
      return await app.vault.createBinary(fallback, data);
    } catch (fallbackErr) {
      console.error("\u274C Fallback binary creation also failed:", fallbackErr);
      const finalName = `SpeakNote_${Date.now()}_RECOVERED.webm`;
      try {
        return await app.vault.createBinary(finalName, data);
      } catch (finalErr) {
        console.error("\u274C Final recovery for binary failed:", finalErr);
        new import_obsidian2.Notice("\u274C Critical error saving audio file.\nCheck vault permissions.");
        throw finalErr;
      }
    }
  }
}
async function safeCreateFile(app, path, content) {
  try {
    return await app.vault.create(path, content);
  } catch (err) {
    console.error("\u274C File creation error:", err);
    if (err?.message?.toLowerCase()?.includes("exists")) {
      const ext = path.split(".").pop();
      const base = path.replace(`.${ext}`, "");
      const fallback = `${base}_${Date.now()}.${ext}`;
      return await app.vault.create(fallback, content);
    }
    try {
      this?.handleError?.("File Save", err);
    } catch {
      new import_obsidian2.Notice("\u{1F4C1} File system error while saving.\nA fallback file will be created.");
    }
    try {
      const fallback = `SpeakNote_${Date.now()}.md`;
      return await app.vault.create(fallback, content);
    } catch (fallbackErr) {
      console.error("\u274C Fallback file creation also failed:", fallbackErr);
      const finalName = `SpeakNote_${Date.now()}_RECOVERED.md`;
      try {
        return await app.vault.create(finalName, content);
      } catch (finalErr) {
        console.error("\u274C Final recovery also failed:", finalErr);
        new import_obsidian2.Notice("\u274C Critical file save error.\nCheck vault permissions.");
        throw finalErr;
      }
    }
  }
}
var SpeakNotePlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.lastSavedFile = null;
    this.ribbonIconEl = null;
    this.isBusy = false;
    // --- Recording limitation state ---
    this.recordingTimeout = null;
    this.isAutoStopped = false;
  }
  async onload() {
    console.log("\u2705 SpeakNote plugin loaded");
    await this.loadSettings();
    this.addSettingTab(new SpeakNoteSettingTab(this.app, this));
    this.ribbonIconEl = this.addRibbonIcon(
      "mic",
      "SpeakNote: Record / Stop",
      () => this.toggleRecording()
    );
    this.ribbonIconEl.addClass("speaknote-ribbon");
    this.addCommand({
      id: "toggle-voice-recording",
      name: "\u{1F399}\uFE0F Start / Stop Recording",
      callback: () => this.toggleRecording()
    });
    this.addCommand({
      id: "play-last-recording",
      name: "\u25B6\uFE0F Play Last Recording",
      callback: async () => {
        if (this.lastSavedFile) {
          await this.playRecording(this.lastSavedFile);
        } else {
          new import_obsidian2.Notice("No recent recording found");
        }
      }
    });
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  onunload() {
    console.log("\u{1F9F9} SpeakNote plugin unloaded");
  }
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (e) => this.chunks.push(e.data);
      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        await this.saveRecording(blob);
      };
      this.mediaRecorder.start();
      this.isRecording = true;
      this.isAutoStopped = false;
      this.ribbonIconEl?.classList.add("recording");
      new import_obsidian2.Notice("\u{1F3A4} Recording started...");
      const maxSeconds = this.settings.maxRecordingSecondsFree ?? 60;
      const maxMs = maxSeconds * 1e3;
      if (this.recordingTimeout) {
        window.clearTimeout(this.recordingTimeout);
      }
      this.recordingTimeout = window.setTimeout(() => {
        console.log("\u23F3 SpeakNote limit reached, auto-stopping...");
        this.isAutoStopped = true;
        this.stopRecording();
      }, maxMs);
    } catch (err) {
      this.handleError("Microphone", err);
    }
  }
  async toggleRecording() {
    if (this.isBusy) {
      new import_obsidian2.Notice("\u23F3 Please wait...");
      return;
    }
    this.isBusy = true;
    this.ribbonIconEl?.addClass("disabled");
    setTimeout(() => this.ribbonIconEl?.removeClass("disabled"), 500);
    try {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        await this.startRecording();
      }
    } catch (err) {
      console.error("Toggle error:", err);
      new import_obsidian2.Notice("\u274C Failed to toggle recording.");
    } finally {
      setTimeout(() => this.isBusy = false, 500);
    }
  }
  stopRecording() {
    if (this.recordingTimeout) {
      window.clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
        this.isRecording = false;
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }
        this.ribbonIconEl?.classList.remove("recording");
        if (this.isAutoStopped) {
          this.showUpgradeMessage();
        } else {
          new import_obsidian2.Notice("\u{1F4BE} Recording stopped, saving file...");
        }
        console.log("\u{1F6D1} Recording stopped and stream released");
      } catch (err) {
        console.error("\u274C Error while stopping recording:", err);
        new import_obsidian2.Notice("\u274C Could not stop recording cleanly");
      }
    }
  }
  async saveRecording(blob) {
    let filename = "";
    try {
      const folderPath = this.settings.defaultFolder || "SpeakNotes";
      const invalidChars = /[\\/:*?"<>|]/;
      if (invalidChars.test(folderPath)) {
        new import_obsidian2.Notice('\u{1F4C1} Invalid folder name.\nRemove special characters like / \\ : * ? " < > |');
        return;
      }
      await ensureFolder(this.app, folderPath);
      const timestamp = window.moment().format("YYYY-MM-DD_HH-mm-ss");
      filename = `${folderPath}/${timestamp}.webm`;
      const buffer = new Uint8Array(await blob.arrayBuffer());
      const newFile = await safeCreateBinary(this.app, filename, buffer);
      this.lastSavedFile = newFile;
      new import_obsidian2.Notice(`\u2705 Saved: ${newFile.path}`);
      console.log("\u2705 Audio file saved:", newFile.path);
      if (this.settings.autoTranscribe) {
        this.showOverlay("\u{1F9E0} Transcribing your recording...");
        const start = Date.now();
        let text = "";
        if (this.settings.provider === "Deepgram") {
          if (!this.settings.deepgramApiKey)
            throw new Error("Missing Deepgram API key");
          text = await transcribeWithDeepgram(this.settings.deepgramApiKey, blob, this.settings.language);
        } else if (this.settings.provider === "AssemblyAI") {
          if (!this.settings.assemblyApiKey)
            throw new Error("Missing AssemblyAI API key");
          text = await transcribeWithAssemblyAI(this.settings.assemblyApiKey, blob, this.settings.language);
        } else if (this.settings.provider === "OpenAI") {
          if (!this.settings.openaiApiKey)
            throw new Error("Missing OpenAI API key");
          text = await transcribeAudio(this.settings.openaiApiKey, blob, this.settings.language);
        }
        const elapsed = Date.now() - start;
        if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
        this.hideOverlay();
        if (text) {
          const transcriptPath = filename.replace(".webm", ".md");
          const transcriptFile = await safeCreateFile(this.app, transcriptPath, text);
          const leaf = this.app.workspace.getLeaf(true);
          await leaf.openFile(transcriptFile);
          new import_obsidian2.Notice(`\u{1F4C4} Transcript saved: ${transcriptFile.path}`);
        } else {
          new import_obsidian2.Notice("\u26A0\uFE0F Empty transcription result.");
        }
      }
    } catch (apiError) {
      this.hideOverlay();
      console.error("\u274C API Error:", apiError);
      const msg = (apiError?.message || "").toLowerCase();
      if (msg.includes("missing") || msg.includes("no api key")) {
        new import_obsidian2.Notice(
          "\u{1F511} Missing API key.\nAdd your provider key in Settings \u2192 SpeakNote.",
          7e3
        );
      } else if (msg.includes("invalid") || msg.includes("unauthorized") || msg.includes("incorrect api key") || msg.includes("401")) {
        new import_obsidian2.Notice(
          "\u274C Invalid API key.\nPlease double-check your key in Settings.",
          7e3
        );
      } else if (msg.includes("quota") || msg.includes("limit") || msg.includes("insufficient_quota")) {
        new import_obsidian2.Notice(
          "\u26A0\uFE0F API quota exceeded.\nYour provider usage limit has been reached.",
          7e3
        );
      } else if (msg.includes("language")) {
        new import_obsidian2.Notice(
          "\u{1F310} Language not supported by this provider.\nTry English, French, Spanish, or German.",
          7e3
        );
      } else if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("timeout") || msg.includes("connection")) {
        new import_obsidian2.Notice(
          "\u{1F310} Network issue.\nPlease check your internet connection and try again.",
          7e3
        );
      } else if (msg.includes("empty") || msg.includes("no text") || msg.includes("null")) {
        new import_obsidian2.Notice(
          "\u26A0\uFE0F Transcription returned no text.\nTry again or use a different provider.",
          7e3
        );
      } else {
        this.handleError("Transcription", apiError);
      }
    }
  }
  // end function
  async playRecording(file) {
    try {
      if (!this.app.vault.getAbstractFileByPath(file.path)) {
        new import_obsidian2.Notice("\u26A0\uFE0F Recording no longer exists.");
        return;
      }
      const data = await this.app.vault.readBinary(file);
      const blob = new Blob([data], { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      console.log("\u{1F3A7} Calling showFloatingPlayer with", url);
      const el = this.showFloatingPlayer(url);
      console.log("\u{1F3A7} showFloatingPlayer returned:", el);
      setTimeout(() => {
        console.log(
          "\u{1F50E} After 0ms, exists?",
          !!document.querySelector(".speaknote-player")
        );
      }, 0);
      new import_obsidian2.Notice(`\u25B6\uFE0F Playing ${file.name}`);
    } catch (err) {
      this.handleError("Playback", err);
    }
  }
  showFloatingPlayer(url) {
    console.log("\u{1F4E2} showFloatingPlayer CALLED:", url);
    document.querySelector(".speaknote-player")?.remove();
    const container = document.createElement("div");
    container.className = "speaknote-player";
    const audio = document.createElement("audio");
    audio.src = url;
    audio.controls = true;
    audio.autoplay = true;
    container.appendChild(audio);
    const target = this.app.workspace.containerEl || document.querySelector(".workspace") || document.body;
    if (!target) {
      console.error("\u274C No target container to attach player");
      return null;
    }
    target.appendChild(container);
    console.log("\u2705 Player appended to:", target);
    audio.addEventListener("ended", () => {
      console.log("\u{1F550} Playback ended, will close in 5s...");
      setTimeout(() => {
        if (container.isConnected) {
          container.style.animation = "speaknote-fade-out 0.5s forwards";
          setTimeout(() => container.remove(), 500);
          console.log("\u{1F9F9} Player faded out and removed");
        }
      }, 5e3);
    });
    return container;
  }
  showOverlay(message) {
    this.hideOverlay();
    const overlay = document.createElement("div");
    overlay.className = "speaknote-overlay";
    const spinner = document.createElement("div");
    spinner.className = "speaknote-spinner";
    const text = document.createElement("div");
    text.textContent = message;
    overlay.appendChild(spinner);
    overlay.appendChild(text);
    document.body.appendChild(overlay);
  }
  hideOverlay() {
    document.querySelector(".speaknote-overlay")?.remove();
  }
  showUpgradeMessage() {
    const el = document.createElement("div");
    el.className = "speaknote-upgrade-toast";
    el.textContent = "\u23F3 Free limit reached \u2014 unlock 5-minute recordings in Early Access";
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 500);
    }, 8e3);
  }
  handleError(source, err) {
    console.error(`\u274C ${source} Error:`, err);
    const msg = (err?.message || err?.toString() || "").toLowerCase();
    if (msg.includes("missing api key") || msg.includes("no api key")) {
      new import_obsidian2.Notice("\u{1F511} Missing API key.\nAdd it in Settings \u2192 SpeakNote.");
      return;
    }
    if (msg.includes("invalid api key") || msg.includes("unauthorized") || msg.includes("401")) {
      new import_obsidian2.Notice("\u274C Invalid API key.\nPlease verify it in Settings.");
      return;
    }
    if (msg.includes("quota") || msg.includes("limit") || msg.includes("insufficient")) {
      new import_obsidian2.Notice("\u26A0\uFE0F API quota exceeded.\nTry again later or upgrade your provider plan.");
      return;
    }
    if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("timeout")) {
      new import_obsidian2.Notice("\u{1F310} Network issue.\nCheck your internet connection.");
      return;
    }
    if (msg.includes("language") || msg.includes("unsupported")) {
      new import_obsidian2.Notice("\u{1F310} Language not supported by this provider.");
      return;
    }
    if (msg.includes("exists") || msg.includes("file already exists")) {
      new import_obsidian2.Notice("\u{1F4C4} File already exists.\nA new version was created.");
      return;
    }
    if (msg.includes("filesystem") || msg.includes("permission")) {
      new import_obsidian2.Notice("\u{1F4C1} File system error.\nCheck folder permissions.");
      return;
    }
    if (msg.includes("microphone") || msg.includes("mic")) {
      new import_obsidian2.Notice("\u{1F3A4} Microphone error.\nCheck permissions or try a different device.");
      return;
    }
    new import_obsidian2.Notice("\u26A0\uFE0F Unexpected error.\nSee console for details (Ctrl+Shift+I).");
  }
};
