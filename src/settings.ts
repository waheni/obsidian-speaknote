import { App, PluginSettingTab, Setting } from "obsidian";
import SpeakNotePlugin from "./main";

export type Provider = "AssemblyAI" | "OpenAI" | "Deepgram";

export interface SpeakNoteSettings {

  provider: Provider;
  assemblyApiKey: string;
  openaiApiKey: string;
  deepgramApiKey: string;

  // Language selection 
  language: "en" | "fr" | "de" | "es";
  defaultFolder: string;
  autoTranscribe: boolean;
  // Free/premium logic
  maxRecordingSecondsFree: number;     // 60 seconds
  extendedRecordingEnabled: boolean;   // future unlock (email)
  premiumUnlocked: boolean;            // future premium
}

export const DEFAULT_SETTINGS: SpeakNoteSettings = {
  
  provider: "AssemblyAI",
  assemblyApiKey: "",
  openaiApiKey: "",
  deepgramApiKey: "",
  language: "en",

  defaultFolder: "SpeakNotes",
  autoTranscribe: true,
  maxRecordingSecondsFree: 60,        // 1-minute limit
  extendedRecordingEnabled: false,    // will enable 5-min recording
  premiumUnlocked: false              // will enable unlimited
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

    // Provider selection
   new Setting(containerEl)
   .setName("Transcription provider")
   .setDesc("Choose which API to use for transcription")
   .addDropdown(drop => 
    drop
      .addOption("AssemblyAI", "AssemblyAI")
      .addOption("OpenAI", "OpenAI")
      .addOption("Deepgram", "Deepgram")
      .setValue(this.plugin.settings.provider)
      .onChange(async (value) => {
        this.plugin.settings.provider = value as Provider;
        await this.plugin.saveSettings();
        this.display(); // refresh UI to show correct fields
      })
    );

    // Assembly AI API Key
    if (this.plugin.settings.provider === "AssemblyAI") {
        new Setting(containerEl)
        .setName("API key")
        .setDesc("Used for transcriptions")
        .addText(text =>
         text
            .setPlaceholder("e1_… (API key)")
            .setValue(this.plugin.settings.assemblyApiKey)
            .onChange(async (value) => {
              this.plugin.settings.assemblyApiKey = value.trim();
              await this.plugin.saveSettings();
            })
        );
      }  // Deepgram API Key
     else if (this.plugin.settings.provider === "Deepgram") {
        new Setting(containerEl)
        .setName("API key")
        .setDesc("Used for transcriptions")
        .addText(text =>
         text
            .setPlaceholder("dg_… (API key)")
            .setValue(this.plugin.settings.deepgramApiKey)
            .onChange(async (value) => {
              this.plugin.settings.deepgramApiKey = value.trim();
              await this.plugin.saveSettings();
            })
        );
      }
      else{
    // OpenAI API Key input
    new Setting(containerEl)
      .setName("API key")
      .setDesc("Used for transcription requests")
      .addText((text) =>
        text
          .setPlaceholder("sk-… (API key)")
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value.trim();
            await this.plugin.saveSettings();
          })
      );
    }

// -------------------------
// Language selection
// -------------------------
new Setting(containerEl)
  .setName("Language")
  .setDesc("Language used for transcription")
  .addDropdown(drop => drop
    .addOption("en", "English")
    .addOption("fr", "French")
    .addOption("de", "German")
    .addOption("es", "Spanish")
    .setValue(this.plugin.settings.language)
    .onChange(async (value: string) => {
      this.plugin.settings.language = value as "en" | "fr" | "de" | "es";
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
// -------------------------
// Free recording limit
// -------------------------
new Setting(containerEl)
  .setName("Free recording limit")
  .setDesc("The free version limits recordings to 1 minute")
  .addText(text => {
    text.setValue(this.plugin.settings.maxRecordingSecondsFree.toString());
    text.setDisabled(true);
  });

// -------------------------
// Early Access (optional email)
// -------------------------
new Setting(containerEl)
  .setName("Extended recording")
  .setHeading();

new Setting(containerEl)
  .setName("Coming soon")
  .setDesc("Extended 5-minute recording will be available in v0.3.0 (sign-in required)")
  .addText(txt => txt.setValue("Available in next version").setDisabled(true));
  
// -----------------------------
// Feedback link
// -----------------------------
new Setting(containerEl)
  .setName("Feedback and support")
  .setDesc("Report bugs or request features on GitHub")
  .addButton(btn =>
    btn
      .setButtonText("Open feedback page")
      .setCta()
      .onClick(() => {
        window.open("https://github.com/waheni/obsidian-speaknote/issues", "_blank");
      })
  );
  }
}
