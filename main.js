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
async function saveBinary(app, path, data) {
  try {
    return await app.vault.createBinary(path, data);
  } catch (err) {
    if (err.message.includes("already exists")) {
      const [name, ext] = path.split(".");
      const alt = `${name}_${Math.floor(Math.random() * 1e3)}.${ext}`;
      return await app.vault.createBinary(alt, data);
    }
    throw err;
  }
}

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  openaiApiKey: "",
  defaultFolder: "SpeakNotes",
  autoTranscribe: false
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
    new import_obsidian.Setting(containerEl).setName("OpenAI API Key").setDesc("Used for cloud transcription requests").addText(
      (text) => text.setPlaceholder("sk-\u2026").setValue(this.plugin.settings.openaiApiKey).onChange(async (value) => {
        this.plugin.settings.openaiApiKey = value.trim();
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
  }
};

// src/main.ts
var SpeakNotePlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.lastSavedFile = null;
    this.ribbonIconEl = null;
    this.isBusy = false;
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
      this.ribbonIconEl?.classList.add("recording");
      new import_obsidian2.Notice("\u{1F3A4} Recording started...");
    } catch (err) {
      console.error(err);
      new import_obsidian2.Notice("\u274C Microphone access denied or unavailable.");
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
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
        this.isRecording = false;
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }
        this.ribbonIconEl?.classList.remove("recording");
        new import_obsidian2.Notice("\u{1F4BE} Recording stopped, saving file...");
        console.log("\u{1F6D1} Recording stopped and stream released");
      } catch (err) {
        console.error("\u274C Error while stopping recording:", err);
        new import_obsidian2.Notice("\u274C Could not stop recording cleanly");
      }
    }
  }
  async saveRecording(blob) {
    try {
      const folderPath = "SpeakNotes";
      await ensureFolder(this.app, folderPath);
      const timestamp = window.moment().format("YYYY-MM-DD_HH-mm-ss");
      const filename = `${folderPath}/${timestamp}.webm`;
      const buffer = new Uint8Array(await blob.arrayBuffer());
      const newFile = await saveBinary(this.app, filename, buffer);
      this.lastSavedFile = newFile;
      new import_obsidian2.Notice(`\u2705 Saved: ${filename}`);
      console.log("\u2705 File saved:", filename);
    } catch (err) {
      console.error("Save error:", err);
      new import_obsidian2.Notice("\u274C Failed to save recording.");
    }
    try {
      console.log("\u2699\uFE0F Mock transcription active (no API key)");
      await new Promise((r) => setTimeout(r, 2e3));
      return "\u{1F9E0} [Mock Transcript]\nThis is a simulated transcription result.";
    } catch (err) {
      console.error("Transcription error:", err);
      new import_obsidian2.Notice("\u26A0\uFE0F Transcription failed.");
    }
  }
  async playRecording(file) {
    try {
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
      console.error(err);
      new import_obsidian2.Notice("\u274C Unable to play audio file.");
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
};
