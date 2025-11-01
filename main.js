"use strict";

// src/main.ts
var { Plugin, Notice } = require("obsidian");
var VoiceNotePlugin = class extends Plugin {
  onload() {
    console.log("\u2705 VoiceNote Plugin loaded successfully!");
    this.addCommand({
      id: "record-voice-note",
      name: "\u{1F399}\uFE0F Record Voice Note",
      callback: () => {
        new Notice("\u{1F3A4} Voice recording started (placeholder)");
        console.log("VoiceNote command executed!");
      }
    });
  }
  onunload() {
    console.log("\u{1F9F9} VoiceNote Plugin unloaded.");
  }
};
module.exports = VoiceNotePlugin;
