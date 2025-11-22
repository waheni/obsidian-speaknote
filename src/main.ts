import { Plugin, Notice, TFile } from "obsidian";
import { ensureFolder, saveBinary } from "./vaultUtils";
import { SpeakNoteSettingTab, DEFAULT_SETTINGS, SpeakNoteSettings } from "./settings";
import { transcribeAudio , transcribeWithDeepgram , transcribeWithAssemblyAI} from "./transcribe";




/**
 * Safely create a binary file — avoids duplicate filename errors
 */
async function safeCreateBinary(app: App, path: string, data: Uint8Array): Promise<TFile> {
  try {
    return await app.vault.createBinary(path, data);
  } catch (err: any) {
    if (err?.message?.includes("exists")) {
      const ext = path.split(".").pop();
      const base = path.replace(`.${ext}`, "");
      const fallback = `${base}_${Date.now()}.${ext}`;
      return await app.vault.createBinary(fallback, data);
    }
    throw err;
  }
}

/**
 * Safely create a text file (for transcripts)
 */
async function safeCreateFile(app: App, path: string, content: string): Promise<TFile> {
  try {
    return await app.vault.create(path, content);
  } catch (err: any) {
    if (err?.message?.includes("exists")) {
      const ext = path.split(".").pop();
      const base = path.replace(`.${ext}`, "");
      const fallback = `${base}_${Date.now()}.${ext}`;
      return await app.vault.create(fallback, content);
    }
    throw err;
  }
}

export default class SpeakNotePlugin extends Plugin {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private isRecording = false;
  private lastSavedFile: TFile | null = null;
  private ribbonIconEl: HTMLElement | null = null;
  settings: SpeakNoteSettings;
  private isBusy = false;
// --- Recording limitation state ---
  private recordingTimeout: number | null = null;
  private isAutoStopped: boolean = false;

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
    this.isAutoStopped = false;                 

    this.ribbonIconEl?.classList.add("recording");
    new Notice("🎤 Recording started...");
    // ----------------------------------------------------
    // ⭐ NEW V.0.2.0 — Enforce free recording limit (1 minute)
    // ----------------------------------------------------
    const maxSeconds = this.settings.maxRecordingSecondsFree ?? 60;
    const maxMs = maxSeconds * 1000;
    
    if (this.recordingTimeout) {
      window.clearTimeout(this.recordingTimeout);
    }

    this.recordingTimeout = window.setTimeout(() => {
      console.log("⏳ SpeakNote limit reached, auto-stopping...");
      this.isAutoStopped = true;
      this.stopRecording();
    }, maxMs);
    // ----------------------------------------------------
  } catch (err) {
    console.error("Microphone error:", err);

    if (err.name === "NotAllowedError") {
      new Notice("❌ Microphone permission denied.\nEnable the mic in your system settings.");
    } else if (err.name === "NotFoundError") {
      new Notice("❌ No microphone detected.\nPlease connect a microphone.");
    } else if (err.name === "AbortError") {
      new Notice("❌ Browser blocked microphone access.");
    } else if (err.name === "NotReadableError") {
      new Notice("❌ Microphone is busy.\nClose other apps using the mic.");
    } else {
      new Notice("❌ Could not start recording.\nUnknown error occurred.");
    }
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
  
  // NEW v.0.2.0 — Clear timeout
  if (this.recordingTimeout) {
      window.clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

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
      // NEW v0.2.0— Show upgrade message if limit reached
      if (this.isAutoStopped) {
        this.showUpgradeMessage();
      } else {
        new Notice("💾 Recording stopped, saving file...");
      }
      console.log("🛑 Recording stopped and stream released");
    } catch (err) {
      console.error("❌ Error while stopping recording:", err);
      new Notice("❌ Could not stop recording cleanly");
    }
  }
}




async saveRecording(blob: Blob) {
  let filename = "";
  try {
    const folderPath = this.settings.defaultFolder || "SpeakNotes";
    await ensureFolder(this.app, folderPath);

    const timestamp = window.moment().format("YYYY-MM-DD_HH-mm-ss");
    filename = `${folderPath}/${timestamp}.webm`;

    const buffer = new Uint8Array(await blob.arrayBuffer());

    // ⭐ Safe file creation — prevents collisions
    const newFile = await safeCreateBinary(this.app, filename, buffer);
    this.lastSavedFile = newFile;

    new Notice(`✅ Saved: ${newFile.path}`);
    console.log("✅ Audio file saved:", newFile.path);

    // ───────────────────────────────────────────────
    // 🔹 Auto-transcription (if enabled)
    // ───────────────────────────────────────────────
    if (this.settings.autoTranscribe) {

      this.showOverlay("🧠 Transcribing your recording...");
      const start = Date.now();
      let text = "";

      // ---------------------------
      // 🔸 Provider: Deepgram
      // ---------------------------
      if (this.settings.provider === "Deepgram") {
        if (!this.settings.deepgramApiKey)
          throw new Error("Missing Deepgram API key");

        text = await transcribeWithDeepgram(this.settings.deepgramApiKey, blob, this.settings.language);
      }

      // ---------------------------
      // 🔸 Provider: AssemblyAI
      // ---------------------------
      else if (this.settings.provider === "AssemblyAI") {
        if (!this.settings.assemblyApiKey)
          throw new Error("Missing AssemblyAI API key");

        text = await transcribeWithAssemblyAI(this.settings.assemblyApiKey, blob, this.settings.language);
      }

      // ---------------------------
      // 🔸 Provider: OpenAI Whisper
      // ---------------------------
      else if (this.settings.provider === "OpenAI") {
        if (!this.settings.openaiApiKey)
          throw new Error("Missing OpenAI API key");

        text = await transcribeAudio(this.settings.openaiApiKey, blob, this.settings.language);
      }

      // Minimum spinner time (clean UX)
      const elapsed = Date.now() - start;
      if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));

      this.hideOverlay();

      // ⭐ Save transcript
      if (text) {
        const transcriptPath = filename.replace(".webm", ".md");
        const transcriptFile = await safeCreateFile(this.app, transcriptPath, text);

        // Auto-open new note
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.openFile(transcriptFile);

        new Notice(`📄 Transcript saved: ${transcriptFile.path}`);
      } else {
        new Notice("⚠️ Empty transcription result.");
      }
    }

  } catch (apiError: any) {

    this.hideOverlay();
    console.error("❌ API Error:", apiError);

    const raw = apiError?.message || apiError?.toString() || "";
    const msg = raw.toLowerCase();

    // ────────────────
    // Error categories
    // ────────────────

    if (msg.includes("missing")) {
      new Notice("❌ No API key provided.\nEnter it in Settings → SpeakNote.");
    }
    else if (
      msg.includes("invalid") ||
      msg.includes("401") ||
      msg.includes("invalid_auth") ||
      msg.includes("invalid_api_key") ||
      msg.includes("incorrect api key")
    ) {
      new Notice("❌ Invalid API key.\nPlease verify your key in Settings.");
    }
    else if (msg.includes("quota") || msg.includes("limit") || msg.includes("insufficient_quota")) {
      new Notice("⚠️ API quota exceeded.\nUpgrade your plan or wait for reset.");
    }
    else if (msg.includes("language")) {
      new Notice("⚠️ Language not supported.");
    }
    else if (msg.includes("network") || msg.includes("failed to fetch")) {
      new Notice("🌐 Network error.\nPlease check your internet connection.");
    }
    else {
      new Notice("❌ Transcription failed.\n(See console for details)");
    }

  } // end catch
} // end function


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

private showUpgradeMessage() {
  const el = document.createElement("div");
  el.className = "speaknote-upgrade-toast";
  el.textContent = "⏳ Free limit reached — unlock 5-minute recordings in Early Access";

  document.body.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 500);
  }, 8000); // stays 8s
}

}