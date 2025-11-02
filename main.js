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
var import_obsidian = require("obsidian");
var SpeakNotePlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.lastSavedFile = null;
  }
  async onload() {
    console.log("\u2705 SpeakNote plugin loaded");
    const ribbonIcon = this.addRibbonIcon(
      "mic",
      "SpeakNote: Record / Stop",
      () => this.toggleRecording()
    );
    ribbonIcon.addClass("speaknote-ribbon");
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
          new import_obsidian.Notice("No recent recording found");
        }
      }
    });
  }
  onunload() {
    console.log("\u{1F9F9} SpeakNote plugin unloaded");
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
      new import_obsidian.Notice("\u{1F3A4} Recording started...");
      console.log("\u{1F399}\uFE0F Recording started");
    } catch (err) {
      console.error(err);
      new import_obsidian.Notice("\u274C Microphone access denied or unavailable.");
    }
  }
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      new import_obsidian.Notice("\u{1F4BE} Recording stopped, saving file...");
      console.log("\u{1F6D1} Recording stopped");
    }
  }
  async saveRecording(blob) {
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
      const newFile = await this.app.vault.createBinary(filename, buffer);
      this.lastSavedFile = newFile;
      new import_obsidian.Notice(`\u2705 Saved: ${filename}`);
      console.log("\u2705 File saved:", filename);
    } catch (err) {
      if (err.message.includes("already exists")) {
        const fallback = `${window.moment().format(
          "YYYY-MM-DD_HH-mm-ss"
        )}_${Math.floor(Math.random() * 1e3)}.webm`;
        const buffer = new Uint8Array(await blob.arrayBuffer());
        const newFile = await this.app.vault.createBinary(
          `SpeakNotes/${fallback}`,
          buffer
        );
        this.lastSavedFile = newFile;
        new import_obsidian.Notice(`\u26A0\uFE0F File existed. Saved as: ${fallback}`);
        console.warn("Duplicate prevented, saved as:", fallback);
      } else {
        console.error("Save error:", err);
        new import_obsidian.Notice("\u274C Failed to save recording.");
      }
    }
  }
  async playRecording(file) {
    try {
      const data = await this.app.vault.readBinary(file);
      const blob = new Blob([data], { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.controls = true;
      audio.play();
      new import_obsidian.Notice(`\u25B6\uFE0F Playing ${file.name}`);
      console.log("\u25B6\uFE0F Playing:", file.name);
    } catch (err) {
      console.error(err);
      new import_obsidian.Notice("\u274C Unable to play audio file.");
    }
  }
};
