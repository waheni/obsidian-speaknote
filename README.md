
# 📌 **SpeakNote — Voice Notes + AI Transcription for Obsidian**

Record your voice directly inside Obsidian and instantly convert it into clean, editable text using AI transcription providers (Deepgram, AssemblyAI, OpenAI Whisper).

🎙 **Press one button → Speak → Automatically generates a new markdown note with your transcript.**  
Fast. Simple. Private.

---

## 🚀 Features

### 🎧 **Record voice notes in one click**
- Ribbon mic button  
- Hotkey: "Start / Stop Recording"  
- Saves audio as `.webm` inside `/SpeakNotes`

### 🧠 **AI‑powered transcription**
- Automatically transcribe after each recording  
- Saves a `.md` transcript next to your audio  
- Automatically opens the transcript in a new pane  

### 🤖 Supported transcription providers
| Provider | Status | Notes |
|---------|--------|-------|
| **Deepgram** | ✅ Fully supported | Fast & high quality |
| **AssemblyAI** | ✅ Fully supported | Great multilingual support |
| **OpenAI Whisper‑1** | ✅ Supported | Accurate but slower |

---

## 📦 Installation (Manual)
1. Go to your Obsidian vault folder:
   ```
   <vault>/.obsidian/plugins/
   ```
2. Create a new folder:
   ```
   speaknote
   ```
3. Copy the following files into it:
   - `main.js`
   - `manifest.json`
   - `styles.css`

4. Restart Obsidian → enable *SpeakNote* in **Settings → Community Plugins**.

---

## 🔑 API Provider Setup

### **Deepgram**
1. Create an account: https://deepgram.com  
2. Get your API key:  
   Dashboard → API Keys → Create Key  
3. Paste it in **Settings → SpeakNote → Deepgram API Key**

### **AssemblyAI**
1. Create an account: https://www.assemblyai.com  
2. Copy your API key from dashboard  
3. Paste it in **Settings → SpeakNote → AssemblyAI API Key**

### **OpenAI Whisper‑1**
1. Log in: https://platform.openai.com  
2. Create a new API key  
3. Must have billing activated  
4. Paste it in the *OpenAI API Key* field

---

## 🎛 Settings

- **Transcription Provider** → Deepgram / AssemblyAI / OpenAI  
- **API Key** for selected provider  
- **Auto‑transcribe** toggle  
- **Recordings Folder** (default: `/SpeakNotes`)

---

## 📅 Roadmap

### **v0.1.0‑beta (MVP)**
✔ Recording  
✔ Auto‑transcription  
✔ Multi‑provider support  
✔ Error handling  
✔ UI overlay & recording indicator  
✔ Auto‑open transcript  

### **v0.2.0 (Premium preview)**
⏳ Language selection  
⏳ Summary / Action Items auto‑generation  
⏳ Merge multiple voice notes  
⏳ Offline local whisper  

### **v1.0 (Public release)**
⏳ Pro UI  
⏳ Folder picker  
⏳ Advanced editor tools  
⏳ Analytics dashboard  

---

## 🧪 Feedback

Please share bugs, suggestions, and ideas:

👉 GitHub issues: *https://github.com/waheni/obsidian-speaknote/issues*  
👉 Email: *waelheni@neurahex.com*

---

## 📜 License

Released under the **MIT License**. Free for personal & commercial use.

Enjoy fast voice capture inside Obsidian! 🚀

