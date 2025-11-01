import { Plugin, Notice, TFile, Vault } from "obsidian";

export default class SpeakNotePlugin extends Plugin {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private isRecording = false;

  async onload() {
    console.log("✅ SpeakNote plugin loaded");

    this.addCommand({
      id: "toggle-voice-recording",
      name: "🎙️ Start/Stop Recording",
      callback: () => this.toggleRecording(),
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

    // Start new recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.chunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        await this.saveRecording(blob);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      new Notice("🎤 Recording started...");
      console.log("Recording started");
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
      console.log("Recording stopped");
    }
  }

  async saveRecording(blob: Blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Create or ensure the folder exists
      const folderPath = "SpeakNotes";
      const folder = this.app.vault.getAbstractFileByPath(folderPath);
      if (!folder) {
        await this.app.vault.createFolder(folderPath);
      }

      // Filename with timestamp
      const timestamp = window.moment().format("YYYY-MM-DD_HH-mm-ss");
      const filename = `${folderPath}/${timestamp}.webm`;

      await this.app.vault.createBinary(filename, buffer);
      new Notice(`✅ Saved: ${filename}`);
      console.log("Saved:", filename);
    } catch (e) {
      console.error(e);
      new Notice("❌ Failed to save recording.");
    }
  }
}

