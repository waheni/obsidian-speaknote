import { Plugin, Notice, TFile } from "obsidian";

export default class SpeakNotePlugin extends Plugin {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private isRecording = false;
  private lastSavedFile: TFile | null = null;

  async onload() {
    console.log("✅ SpeakNote plugin loaded");

    // Ribbon icon (top-left)
    const ribbonIcon = this.addRibbonIcon(
      "mic",
      "SpeakNote: Record / Stop",
      () => this.toggleRecording()
    );
    ribbonIcon.addClass("speaknote-ribbon");

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

  onunload() {
    console.log("🧹 SpeakNote plugin unloaded");
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
      return;
    }

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
      new Notice("🎤 Recording started...");
      console.log("🎙️ Recording started");
    } catch (err) {
      console.error(err);
      new Notice("❌ Microphone access denied or unavailable.");
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      new Notice("💾 Recording stopped, saving file...");
      console.log("🛑 Recording stopped");
    }
  }

  async saveRecording(blob: Blob) {
    try {
      const folderPath = "SpeakNotes";
      const folder = this.app.vault.getAbstractFileByPath(folderPath);

      if (!folder) {
        await this.app.vault.createFolder(folderPath);
      }

      const timestamp = window.moment().format("YYYY-MM-DD_HH-mm-ss");
      const filename = `${folderPath}/${timestamp}.webm`;

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Create the binary file once
      const newFile = await this.app.vault.createBinary(filename, buffer);
      this.lastSavedFile = newFile;

      new Notice(`✅ Saved: ${filename}`);
      console.log("✅ File saved:", filename);
    } catch (err) {
      // If file exists, add random suffix to avoid conflict
      if ((err as Error).message.includes("already exists")) {
        const fallback = `${window.moment().format(
          "YYYY-MM-DD_HH-mm-ss"
        )}_${Math.floor(Math.random() * 1000)}.webm`;
        const buffer = new Uint8Array(await blob.arrayBuffer());
        const newFile = await this.app.vault.createBinary(
          `SpeakNotes/${fallback}`,
          buffer
        );
        this.lastSavedFile = newFile;
        new Notice(`⚠️ File existed. Saved as: ${fallback}`);
        console.warn("Duplicate prevented, saved as:", fallback);
      } else {
        console.error("Save error:", err);
        new Notice("❌ Failed to save recording.");
      }
    }
  }

  async playRecording(file: TFile) {
    try {
      const data = await this.app.vault.readBinary(file);
      const blob = new Blob([data], { type: "audio/webm" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audio.controls = true;
      audio.play();

      new Notice(`▶️ Playing ${file.name}`);
      console.log("▶️ Playing:", file.name);
    } catch (err) {
      console.error(err);
      new Notice("❌ Unable to play audio file.");
    }
  }
}