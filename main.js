const { Plugin, Notice } = require('obsidian');

class VoiceNotePlugin extends Plugin {
  onload() {
    console.log("✅ VoiceNote Plugin loaded successfully!");

    // Register a new command in the Command Palette
    this.addCommand({
      id: 'record-voice-note',
      name: '🎙️ Record Voice Note',
      callback: () => {
        new Notice("🎤 Voice recording started (placeholder)");
        console.log("VoiceNote command executed!");
      },
    });
  }

  onunload() {
    console.log("🧹 VoiceNote Plugin unloaded.");
  }
}

module.exports = VoiceNotePlugin;
