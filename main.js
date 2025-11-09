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
  provider: "AssemblyAI",
  assemblyApiKey: "",
  openaiApiKey: "",
  deepgramApiKey: "",
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

// src/transcribe.ts
async function transcribeAudio(apiKey, blob) {
  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-1");
  console.log("\u{1F9E0} Using provider:", this.settings.provider);
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${errorText}`);
  }
  const data = await response.json();
  if (!data.text) throw new Error("Empty transcription result");
  return data.text;
}
async function transcribeWithDeepgram(apiKey, blob) {
  try {
    console.log("\u{1F3AC} Starting DeepGram transcription...");
    const arrayBuffer = await blob.arrayBuffer();
    const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-3", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`
      },
      body: arrayBuffer
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram error: ${errorText}`);
    }
    const data = await response.json();
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
    if (!transcript) throw new Error("No transcript returned by Deepgram");
    console.log("\u2705 Deepgram transcript:", transcript);
    return transcript;
  } catch (err) {
    console.error("\u274C Deepgram transcription failed:", err);
    throw err;
  }
}
async function transcribeWithAssemblyAI(apiKey, blob) {
  console.log("\u{1F3AC} Starting AssemblyAI transcription...");
  try {
    console.log("\u{1F4E4} Uploading audio blob to AssemblyAI...");
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { "Authorization": apiKey },
      body: blob
    });
    if (!uploadRes.ok) {
      console.error("\u274C Upload failed:", uploadRes.status, await uploadRes.text());
      throw new Error("Upload failed");
    }
    const uploadData = await uploadRes.json();
    const audioUrl = uploadData.upload_url;
    console.log("\u2705 Uploaded successfully to:", audioUrl);
    const requestBody = {
      audio_url: audioUrl,
      // ⚠️ must be snake_case
      language_code: "en",
      // or "en", "fr", "ar"
      auto_chapters: false
    };
    console.log("\u{1F4E4} Sending transcription request:", requestBody);
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    const rawResponse = await transcriptRes.text();
    console.log("\u{1F4E5} Raw response from AssemblyAI:", transcriptRes.status, rawResponse);
    if (!transcriptRes.ok) {
      throw new Error(`\u274C Failed to start transcription job: ${rawResponse}`);
    }
    const transcriptData = JSON.parse(rawResponse);
    const transcriptId = transcriptData.id;
    console.log("\u{1F9E0} Transcription job started:", transcriptId);
    let text = "";
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2e3));
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { "Authorization": apiKey }
      });
      const pollData = await pollRes.json();
      console.log(`\u23F3 Polling attempt ${i + 1}:`, pollData.status);
      if (pollData.status === "completed") {
        text = pollData.text;
        console.log("\u2705 Transcription completed");
        break;
      } else if (pollData.status === "error") {
        console.error("\u274C AssemblyAI reported error:", pollData.error);
        throw new Error(pollData.error);
      }
    }
    if (!text) {
      throw new Error("Transcription timeout or empty result");
    }
    return text;
  } catch (err) {
    console.error("\u274C AssemblyAI transcription error:", err);
    return "";
  }
}

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
      if (this.settings.autoTranscribe) {
        new import_obsidian2.Notice("\u{1F9E0} Transcribing your recording...");
        let text = "";
        if (this.settings.provider === "Deepgram" && this.settings.deepgramApiKey) {
          text = await transcribeWithDeepgram(this.settings.deepgramApiKey, blob);
        } else if (this.settings.provider === "AssemblyAI" && this.settings.assemblyApiKey) {
          text = await transcribeWithAssemblyAI(this.settings.assemblyApiKey, blob);
        } else if (this.settings.provider === "OpenAI" && this.settings.openaiApiKey) {
          text = await transcribeAudio(this.settings.openaiApiKey, blob);
        } else {
          console.log(`\u274C Error`);
        }
        if (text) {
          const transcriptPath = filename.replace(".webm", ".md");
          await this.app.vault.create(transcriptPath, text);
          new import_obsidian2.Notice(`\u2705 Transcript saved as: ${transcriptPath}`);
        } else {
          new import_obsidian2.Notice("\u26A0\uFE0F Transcription failed or empty.");
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      new import_obsidian2.Notice("\u274C Failed to save recording.");
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
