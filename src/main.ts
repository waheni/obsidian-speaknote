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
    console.error("❌ Binary file creation error:", err);

    // ----- File already exists -----
    if (err?.message?.toLowerCase()?.includes("exists")) {
      const ext = path.split(".").pop();
      const base = path.replace(`.${ext}`, "");
      const fallback = `${base}_${Date.now()}.${ext}`;
      return await app.vault.createBinary(fallback, data);
    }

    // ----- Other file system errors -----
    // Notify user via your central handler, if available
    try {
      // @ts-ignore
      this?.handleError?.("Binary File Save", err);
    } catch (_) {
      new Notice("📁 Error saving audio file.\nA fallback file will be created.");
    }

    // ----- Attempt fallback with simple filename -----
    try {
      const fallback = `SpeakNote_${Date.now()}.webm`;
      return await app.vault.createBinary(fallback, data);
    } catch (fallbackErr) {
      console.error("❌ Fallback binary creation also failed:", fallbackErr);

      // ----- FINAL recovery: root folder with safe name -----
      const finalName = `SpeakNote_${Date.now()}_RECOVERED.webm`;
      try {
        return await app.vault.createBinary(finalName, data);
      } catch (finalErr) {
        console.error("❌ Final recovery for binary failed:", finalErr);
        new Notice("❌ Critical error saving audio file.\nCheck vault permissions.");
        throw finalErr; // last resort: stop everything
      }
    }
  }
}

/**
 * Safely create a text file (for transcripts)
 */
async function safeCreateFile(app: App, path: string, content: string): Promise<TFile> {
  try {
    return await app.vault.create(path, content);
  } catch (err: any) {
    console.error("❌ File creation error:", err);

    // ----- File already exists -----
    if (err?.message?.toLowerCase()?.includes("exists")) {
      const ext = path.split(".").pop();
      const base = path.replace(`.${ext}`, "");
      const fallback = `${base}_${Date.now()}.${ext}`;
      return await app.vault.create(fallback, content);
    }

    // ----- Other file system errors -----
    // We avoid throwing. Instead:
    // 1. Notify user
    // 2. Attempt fallback
    // 3. If fallback fails too — final fallback in root

    // Notify (via your plugin's handleError, if available)
    // NOTE: We check if 'this' contains handleError
    try {
      // @ts-ignore
      this?.handleError?.("File Save", err);
    } catch (_) {
      new Notice("📁 File system error while saving.\nA fallback file will be created.");
    }

    // 2. Try fallback filename
    try {
      const fallback = `SpeakNote_${Date.now()}.md`;
      return await app.vault.create(fallback, content);
    } catch (fallbackErr) {
      console.error("❌ Fallback file creation also failed:", fallbackErr);

      // 3. FINAL fallback: create in root as plain text
      const finalName = `SpeakNote_${Date.now()}_RECOVERED.md`;
      try {
        return await app.vault.create(finalName, content);
      } catch (finalErr) {
        console.error("❌ Final recovery also failed:", finalErr);
        new Notice("❌ Critical file save error.\nCheck vault permissions.");
        throw finalErr; // last resort
      }
    }
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
  } catch (err: any) {
        this.handleError("Microphone", err);

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
    // 🛡 Validate folder name to avoid Obsidian crash
    const invalidChars = /[\\/:*?"<>|]/;

    if (invalidChars.test(folderPath)) {
      new Notice("📁 Invalid folder name.\nRemove special characters like / \\ : * ? \" < > |");
      return;
    }
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

  const msg = (apiError?.message || "").toLowerCase();

  // ----- Missing or invalid API key -----
  if (msg.includes("missing") || msg.includes("no api key")) {
    new Notice(
      "🔑 Missing API key.\n" +
      "Add your provider key in Settings → SpeakNote.",
      7000
    );
  }

  else if (
    msg.includes("invalid") ||
    msg.includes("unauthorized") ||
    msg.includes("incorrect api key") ||
    msg.includes("401")
  ) {
    new Notice(
      "❌ Invalid API key.\n" +
      "Please double-check your key in Settings.",
      7000
    );
  }

  // ----- Quota or plan limits -----
  else if (
    msg.includes("quota") ||
    msg.includes("limit") ||
    msg.includes("insufficient_quota")
  ) {
    new Notice(
      "⚠️ API quota exceeded.\n" +
      "Your provider usage limit has been reached.",
      7000
    );
  }

  // ----- Language unsupported -----
  else if (msg.includes("language")) {
    new Notice(
      "🌐 Language not supported by this provider.\n" +
      "Try English, French, Spanish, or German.",
      7000
    );
  }

  // ----- Network issues -----
  else if (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("connection")
  ) {
    new Notice(
      "🌐 Network issue.\n" +
      "Please check your internet connection and try again.",
      7000
    );
  }

  // ----- Empty or bad response -----
  else if (
    msg.includes("empty") ||
    msg.includes("no text") ||
    msg.includes("null")
  ) {
    new Notice(
      "⚠️ Transcription returned no text.\n" +
      "Try again or use a different provider.",
      7000
    );
  }

  // ----- Generic fallback -----
  else {
      this.handleError("Transcription", apiError);

  }
}

} // end function


  async playRecording(file: TFile) {
  try {
    // 🛡 Safety: Check if file still exists
    if (!this.app.vault.getAbstractFileByPath(file.path)) {
      new Notice("⚠️ Recording no longer exists.");
      return;
    }
    
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
    this.handleError("Playback", err);

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


private handleError(source: string, err: any) {
  console.error(`❌ ${source} Error:`, err);

  const msg = (err?.message || err?.toString() || "").toLowerCase();

  // ---- API KEY ISSUES ----
  if (msg.includes("missing api key") || msg.includes("no api key")) {
    new Notice("🔑 Missing API key.\nAdd it in Settings → SpeakNote.");
    return;
  }

  if (msg.includes("invalid api key") || msg.includes("unauthorized") || msg.includes("401")) {
    new Notice("❌ Invalid API key.\nPlease verify it in Settings.");
    return;
  }

  // ---- QUOTA / PLAN ----
  if (msg.includes("quota") || msg.includes("limit") || msg.includes("insufficient")) {
    new Notice("⚠️ API quota exceeded.\nTry again later or upgrade your provider plan.");
    return;
  }

  // ---- NETWORK ----
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("timeout")) {
    new Notice("🌐 Network issue.\nCheck your internet connection.");
    return;
  }

  // ---- LANGUAGE ----
  if (msg.includes("language") || msg.includes("unsupported")) {
    new Notice("🌐 Language not supported by this provider.");
    return;
  }

  // ---- FILE ERRORS ----
  if (msg.includes("exists") || msg.includes("file already exists")) {
    new Notice("📄 File already exists.\nA new version was created.");
    return;
  }

  if (msg.includes("filesystem") || msg.includes("permission")) {
    new Notice("📁 File system error.\nCheck folder permissions.");
    return;
  }

  // ---- MICROPHONE ----
  if (msg.includes("microphone") || msg.includes("mic")) {
    new Notice("🎤 Microphone error.\nCheck permissions or try a different device.");
    return;
  }

  // ---- FALLBACK ----
  new Notice("⚠️ Unexpected error.\nSee console for details (Ctrl+Shift+I).");
}

}