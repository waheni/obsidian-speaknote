import { Plugin, Notice, TFile } from "obsidian";
import { ensureFolder, saveBinary } from "./vaultUtils";
import { SpeakNoteSettingTab, DEFAULT_SETTINGS, SpeakNoteSettings } from "./settings";
import { transcribeAudio , transcribeWithDeepgram , transcribeWithAssemblyAI} from "./transcribe";

export default class SpeakNotePlugin extends Plugin {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private isRecording = false;
  private lastSavedFile: TFile | null = null;
  private ribbonIconEl: HTMLElement | null = null;
  settings: SpeakNoteSettings;
  private isBusy = false;


  async onload() {
    console.log("✅ SpeakNote plugin loaded");
    
    await this.loadSettings();
    this.addSettingTab(new SpeakNoteSettingTab(this.app, this));
    // Ribbon icon (top-left)
    this.ribbonIconEl = this.addRibbonIcon(
      "mic",
      "SpeakNote: Record / Stop",
      () => this.toggleRecording()
    );
    this.ribbonIconEl.addClass("speaknote-ribbon");

    // Start / Stop command
    this.addCommand({
      id: "toggle-voice-recording",
      name: "🎙️ Start / Stop Recording",
      callback: () => this.toggleRecording(),
    });

    // Play last saved recording
    this.addCommand({
      id: "play-last-recording",
      name: "▶️ Play Last Recording",
      callback: async () => {
        if (this.lastSavedFile) {
          await this.playRecording(this.lastSavedFile);
        } else {
          new Notice("No recent recording found");
        }
      },
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
  onunload() {
    console.log("🧹 SpeakNote plugin unloaded");
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
    new Notice("🎤 Recording started...");
  } catch (err) {
    console.error(err);
    new Notice("❌ Microphone access denied or unavailable.");
  }
  }
  async toggleRecording() {
  // 🧱 Prevent spamming clicks
  if (this.isBusy) {
    new Notice("⏳ Please wait...");
    return;
  }
  this.isBusy = true;
  // 🟡 Temporarily disable the ribbon button (optional but nice UX)
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
    new Notice("❌ Failed to toggle recording.");
  } finally {
    // ✅ Unlock after short delay
    setTimeout(() => (this.isBusy = false), 500);
  }
  }

stopRecording() {
  if (this.mediaRecorder && this.isRecording) {
    try {
      this.mediaRecorder.stop();
      this.isRecording = false;

      // 🧹 Release audio input stream (important for privacy + resource cleanup)
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }

      // 🟥 Update ribbon icon + user feedback
      this.ribbonIconEl?.classList.remove("recording");
      new Notice("💾 Recording stopped, saving file...");
      console.log("🛑 Recording stopped and stream released");
    } catch (err) {
      console.error("❌ Error while stopping recording:", err);
      new Notice("❌ Could not stop recording cleanly");
    }
  }
}

async saveRecording(blob: Blob) {
  try {
    const folderPath = "SpeakNotes";
    await ensureFolder(this.app, folderPath);

    const timestamp = window.moment().format("YYYY-MM-DD_HH-mm-ss");
    const filename = `${folderPath}/${timestamp}.webm`;

    const buffer = new Uint8Array(await blob.arrayBuffer());
    const newFile = await saveBinary(this.app, filename, buffer);
    this.lastSavedFile = newFile;

    new Notice(`✅ Saved: ${filename}`);
    console.log("✅ File saved:", filename);

          // 🔹 Optional: Auto-transcribe after saving
        if (this.settings.autoTranscribe) {
          const start = Date.now();
          this.showOverlay("🧠 Transcribing your recording...");
          let text = "";

          if (this.settings.provider === "Deepgram" && this.settings.deepgramApiKey) {
            text = await transcribeWithDeepgram(this.settings.deepgramApiKey, blob);
          } 
          else if (this.settings.provider === "AssemblyAI" && this.settings.assemblyApiKey) {
            text = await transcribeWithAssemblyAI(this.settings.assemblyApiKey, blob);
          } 
          else if (this.settings.provider === "OpenAI" && this.settings.openaiApiKey) {
            text = await transcribeAudio(this.settings.openaiApiKey, blob);
          }
          else{
                        console.log(`❌ Error`);
          }
          const elapsed = Date.now() - start;
          if (elapsed < 500) {
            await new Promise(r => setTimeout(r, 500 - elapsed));
          }
        this.hideOverlay();
          if (text) {
            const transcriptPath = filename.replace(".webm", ".md");
            await this.app.vault.create(transcriptPath, text);
            new Notice(`✅ Transcript saved as: ${transcriptPath}`);
          } else {
            new Notice("⚠️ Transcription failed or empty.");
          }
        }
  } catch (err) {
    console.error("Save error:", err);
    new Notice("❌ Failed to save recording.");
  }
}

  async playRecording(file: TFile) {
  try {
    const data = await this.app.vault.readBinary(file);
    const blob = new Blob([data], { type: "audio/webm" });
    const url = URL.createObjectURL(blob);

    console.log("🎧 Calling showFloatingPlayer with", url);
    const el = this.showFloatingPlayer(url);
    console.log("🎧 showFloatingPlayer returned:", el);

    // Double-check after next tick
    setTimeout(() => {
      console.log(
        "🔎 After 0ms, exists?",
        !!document.querySelector(".speaknote-player")
      );
    }, 0);

    new Notice(`▶️ Playing ${file.name}`);
  } catch (err) {
    console.error(err);
    new Notice("❌ Unable to play audio file.");
  }
  }
showFloatingPlayer(url: string) {
  console.log("📢 showFloatingPlayer CALLED:", url);

  // Remove any previous player
  document.querySelector(".speaknote-player")?.remove();

  // Create container
  const container = document.createElement("div");
  container.className = "speaknote-player";

  // Create audio element
  const audio = document.createElement("audio");
  audio.src = url;
  audio.controls = true;
  audio.autoplay = true;
  container.appendChild(audio);

  // ✅ Attach to Obsidian's main workspace container (most reliable)
  const target =
    this.app.workspace.containerEl ||
    document.querySelector(".workspace") ||
    document.body;

  if (!target) {
    console.error("❌ No target container to attach player");
    return null;
  }

  target.appendChild(container);
  console.log("✅ Player appended to:", target);

  // 🕐 Auto-close timer (5 seconds after playback ends)
  audio.addEventListener("ended", () => {
    console.log("🕐 Playback ended, will close in 5s...");
    setTimeout(() => {
    if (container.isConnected) {
      container.style.animation = "speaknote-fade-out 0.5s forwards";
      setTimeout(() => container.remove(), 500);
      console.log("🧹 Player faded out and removed");
    }
    }, 5000);
    });

  return container;
}

showOverlay(message: string) {
  this.hideOverlay(); // clear any existing one

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

}