# 🎙️ SpeakNote — Record & Transcribe Voice Notes in Obsidian

**SpeakNote** lets you record audio directly inside Obsidian and instantly convert it into clean, searchable Markdown using AI transcription providers such as **OpenAI Whisper**, **Deepgram Nova**, and **AssemblyAI**.

Perfect for:
- Journaling  
- Quick idea capture  
- Meetings & lectures  
- Hands-free writing  
- Voice-first workflows  

---

# 🚀 Features

### 🎤 One‑click recording  
Record audio directly from the ribbon icon or command palette.

### 🧠 AI‑powered transcription  
Supports 3 major providers:
- **OpenAI Whisper**
- **Deepgram Nova**
- **AssemblyAI**

### 📄 Auto‑Transcribe Mode  
Automatically generate a Markdown transcript when recording stops.

### ▶️ Floating audio mini‑player  
Review your recordings with a clean, minimal UI that auto‑hides.

### 🗂 Save anywhere in your vault  
Choose your own folder (default: `SpeakNotes`).

### 🌍 Multi‑language support  
Built‑in support for:
- English  
- French  
- Spanish  
- German  

*(More languages coming soon.)*

### 🛡 Industry‑grade error handling  
SpeakNote includes:
- Friendly API & network error messages  
- File system safety (no crashes)  
- Auto‑fallback file creation  
- Recording limit protection  

---

# 🎯 Why SpeakNote?

Most Obsidian voice note tools record audio only.

**SpeakNote converts your audio automatically into clean, usable notes.**

If you’re someone who:
- Thinks better aloud  
- Wants to journal hands‑free  
- Hates typing long thoughts  
- Takes notes while walking  
- Needs quick transcripts during work  

SpeakNote fits directly into your workflow.

---

# 🎤 How to Use SpeakNote

### 1. Start Recording  
Click the 🎙️ **microphone icon** in the Obsidian left ribbon  
OR  
Run the command:

```
SpeakNote: Start / Stop Recording
```

You’ll see:
- A pulsing red icon  
- A “Recording started…” notice  

### 2. Stop Recording  
Click the ribbon again.  
Your audio is saved as:

```
<your-vault>/<folder>/<timestamp>.webm
```

### 3. Auto‑Transcription (optional)
If Auto‑Transcribe is enabled:
1. SpeakNote uploads the audio to your provider  
2. Displays a “Transcribing…” overlay  
3. Saves a `.md` transcript next to the audio  
4. Opens the transcript automatically  

---

# ⚙️ Settings

Go to:

```
Settings → Community Plugins → SpeakNote
```

### 🎙️ Transcription Provider
Choose:
- OpenAI Whisper  
- Deepgram Nova  
- AssemblyAI  

### 🔑 API Keys
Enter your API key for the provider you selected.

### 🗂 Recording Folder
Customize where `.webm` files are stored.

### 🧠 Auto‑Transcribe  
Automatically convert audio to text.

### ⏱ Recording limits
- Free: **up to 1 minute**  
- Premium (coming soon): **up to 5 minutes**  
- Unlimited in future releases  

---

# 🧪 Supported Languages

| Provider      | EN | FR | ES | DE | AR | Notes |
|---------------|----|----|----|----|----|-------|
| OpenAI Whisper | ✔ | ✔ | ✔ | ✔ | ⚠ | Arabic accuracy varies |
| Deepgram Nova  | ✔ | ✔ | ✔ | ✔ | ❌ | No Arabic yet |
| AssemblyAI     | ✔ | ✔ | ✔ | ✔ | ❌ | No Arabic |

---

# 🔒 Privacy

SpeakNote respects your privacy:

- Audio files are **saved locally** in your vault  
- No analytics, tracking, or hidden scripts  
- Your API keys are stored **only on your device**  
- Audio is sent **only** to the provider you explicitly select  
- No external servers or accounts required  

---

# 📦 Installation

### ✔ From the Obsidian Marketplace (recommended)
Search for **SpeakNote** in:
```
Settings → Community Plugins → Browse
```

### 📁 Manual installation
1. Download the latest release from  
   https://github.com/waheni/obsidian-speaknote/releases  
2. Extract the folder into:  
   ```
   <vault>/.obsidian/plugins/speaknote/
   ```
3. Enable the plugin inside Obsidian.

---

# 🛠 Troubleshooting

### ❌ “Missing API Key”
Go to settings and enter a valid key for your provider.

### ❌ “Invalid folder name”
Avoid characters like:
```
/ \ : * ? " < > |
```

### ❌ “Playback Error: file not found”
You may have deleted the audio manually.  
Recording again will fix this.

### ❌ “Network error”
Check your Wi‑Fi or provider availability.

---

# 🧭 Roadmap

### **v0.3.0**
- Google Sign‑In  
- Premium unlock (5‑minute recording)  
- Better language selection per provider  

### **v0.5.0**
- Offline local Whisper model  
- Audio trimming  
- Noise reduction  

### **v1.0.0**
- Full mobile‑optimized UI  
- Multi‑segment recording  
- Cloud‑sync safety for mobile workflows  

---

# 🤝 Contributing

Pull requests, feature suggestions, and bug reports are welcome!

👉 https://github.com/waheni/obsidian-speaknote/issues


# 🧑‍💻 Author
**Heni Wael (Neurahex)**  
GitHub: https://github.com/waheni
👉 Email: *waelheni@neurahex.com*
---

Enjoy fast, clean, voice‑powered notes in Obsidian with **SpeakNote**! 🎙️  