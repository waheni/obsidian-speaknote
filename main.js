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
    new import_obsidian.Setting(containerEl).setName("Feedback & Support").setDesc("Report bugs or request features on GitHub").addButton(
      (btn) => btn.setButtonText("Open Feedback Page").setCta().onClick(() => {
        window.open("https://github.com/waheni/obsidian-speaknote/issues", "_blank");
      })
    );
  }
};

// src/transcribe.ts
function makeFriendlyError(provider, raw) {
  raw = raw.toLowerCase();
  if (raw.includes("invalid api key") || raw.includes("invalid credentials") || raw.includes("unauthorized")) {
    return `${provider}: Invalid API Key. Please check your key.`;
  }
  if (raw.includes("quota") || raw.includes("limit")) {
    return `${provider}: You exceeded your quota.`;
  }
  if (raw.includes("missing") || raw.includes("no api key")) {
    return `${provider}: API key is missing.`;
  }
  if (raw.includes("forbidden")) {
    return `${provider}: Access forbidden (possible wrong project / plan).`;
  }
  return `${provider}: ${raw}`;
}
async function transcribeAudio(apiKey, blob) {
  try {
    if (!apiKey) throw new Error("Missing API key");
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
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
async function transcribeWithDeepgram(apiKey, blob) {
  try {
    if (!apiKey) throw new Error("Missing API key");
    console.log("\u{1F3AC} Starting Deepgram transcription...");
    const arrayBuffer = await blob.arrayBuffer();
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-3",
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
async function transcribeWithAssemblyAI(apiKey, blob) {
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
      language_code: "en",
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
    if (err?.message?.includes("exists")) {
      const ext = path.split(".").pop();
      const base = path.replace(`.${ext}`, "");
      const fallback = `${base}_${Date.now()}.${ext}`;
      return await app.vault.createBinary(fallback, data);
    }
    throw err;
  }
}
async function safeCreateFile(app, path, content) {
  try {
    return await app.vault.create(path, content);
  } catch (err) {
    if (err?.message?.includes("exists")) {
      const ext = path.split(".").pop();
      const base = path.replace(`.${ext}`, "");
      const fallback = `${base}_${Date.now()}.${ext}`;
      return await app.vault.create(fallback, content);
    }
    throw err;
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
      console.error("Microphone error:", err);
      if (err.name === "NotAllowedError") {
        new import_obsidian2.Notice("\u274C Microphone permission denied.\nEnable the mic in your system settings.");
      } else if (err.name === "NotFoundError") {
        new import_obsidian2.Notice("\u274C No microphone detected.\nPlease connect a microphone.");
      } else if (err.name === "AbortError") {
        new import_obsidian2.Notice("\u274C Browser blocked microphone access.");
      } else if (err.name === "NotReadableError") {
        new import_obsidian2.Notice("\u274C Microphone is busy.\nClose other apps using the mic.");
      } else {
        new import_obsidian2.Notice("\u274C Could not start recording.\nUnknown error occurred.");
      }
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
    let filename = "";
    try {
      const folderPath = this.settings.defaultFolder || "SpeakNotes";
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
          text = await transcribeWithDeepgram(this.settings.deepgramApiKey, blob);
        } else if (this.settings.provider === "AssemblyAI") {
          if (!this.settings.assemblyApiKey)
            throw new Error("Missing AssemblyAI API key");
          text = await transcribeWithAssemblyAI(this.settings.assemblyApiKey, blob);
        } else if (this.settings.provider === "OpenAI") {
          if (!this.settings.openaiApiKey)
            throw new Error("Missing OpenAI API key");
          text = await transcribeAudio(this.settings.openaiApiKey, blob);
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
      const raw = apiError?.message || apiError?.toString() || "";
      const msg = raw.toLowerCase();
      if (msg.includes("missing")) {
        new import_obsidian2.Notice("\u274C No API key provided.\nEnter it in Settings \u2192 SpeakNote.");
      } else if (msg.includes("invalid") || msg.includes("401") || msg.includes("invalid_auth") || msg.includes("invalid_api_key") || msg.includes("incorrect api key")) {
        new import_obsidian2.Notice("\u274C Invalid API key.\nPlease verify your key in Settings.");
      } else if (msg.includes("quota") || msg.includes("limit") || msg.includes("insufficient_quota")) {
        new import_obsidian2.Notice("\u26A0\uFE0F API quota exceeded.\nUpgrade your plan or wait for reset.");
      } else if (msg.includes("language")) {
        new import_obsidian2.Notice("\u26A0\uFE0F Language not supported.");
      } else if (msg.includes("network") || msg.includes("failed to fetch")) {
        new import_obsidian2.Notice("\u{1F310} Network error.\nPlease check your internet connection.");
      } else {
        new import_obsidian2.Notice("\u274C Transcription failed.\n(See console for details)");
      }
    }
  }
  // end function
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
};
