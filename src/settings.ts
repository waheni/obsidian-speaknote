import { App, PluginSettingTab, Setting } from "obsidian";
import SpeakNotePlugin from "./main";

export interface SpeakNoteSettings {
  openaiApiKey: string;
  defaultFolder: string;
  autoTranscribe: boolean;
}

export const DEFAULT_SETTINGS: SpeakNoteSettings = {
  openaiApiKey: "",
  defaultFolder: "SpeakNotes",
  autoTranscribe: false,
};

export class SpeakNoteSettingTab extends PluginSettingTab {
  plugin: SpeakNotePlugin;

  constructor(app: App, plugin: SpeakNotePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "SpeakNote Settings" });

    // OpenAI API Key input
    new Setting(containerEl)
      .setName("OpenAI API Key")
      .setDesc("Used for cloud transcription requests")
      .addText((text) =>
        text
          .setPlaceholder("sk-…")
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value.trim();
            await this.plugin.saveSettings();
          })
      );

    // Default folder path
    new Setting(containerEl)
      .setName("Recordings folder")
      .setDesc("Where to save audio files")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.defaultFolder)
          .onChange(async (value) => {
            this.plugin.settings.defaultFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    // Auto-transcribe toggle
    new Setting(containerEl)
      .setName("Auto-transcribe after saving")
      .setDesc("Automatically transcribe each new recording to text")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoTranscribe)
          .onChange(async (value) => {
            this.plugin.settings.autoTranscribe = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
