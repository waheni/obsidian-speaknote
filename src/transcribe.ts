/**
 * Whisper transcription helper
 */
export async function transcribeAudio(apiKey: string, blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-1");
  console.log("🧠 Using provider:", this.settings.provider);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
   method: "POST",
   headers: { Authorization: `Bearer ${apiKey}` },
   body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${errorText}`);
  }

  const data = await response.json();
  if (!data.text) throw new Error("Empty transcription result");
  return data.text;
}


/**
 * Deepgram transcription helper
 * Converts audio Blob → text using Deepgram REST API
 */
export async function transcribeWithDeepgram(apiKey: string, blob: Blob): Promise<string> {
  try {
    console.log("🎬 Starting DeepGram transcription...");

    // Convert blob to ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();

    // Send to Deepgram API
    const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-3", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram error: ${errorText}`);
    }

    const data = await response.json();

    // Extract transcript safely
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();

    if (!transcript) throw new Error("No transcript returned by Deepgram");

    console.log("✅ Deepgram transcript:", transcript);
    return transcript;
  } catch (err) {
    console.error("❌ Deepgram transcription failed:", err);
    throw err;
  }
}

export async function transcribeWithAssemblyAI(apiKey: string, blob: Blob): Promise<string> {
  console.log("🎬 Starting AssemblyAI transcription...");

  try {
    // 1️⃣ Upload the audio
    console.log("📤 Uploading audio blob to AssemblyAI...");
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { "Authorization": apiKey },
      body: blob,
    });

    if (!uploadRes.ok) {
      console.error("❌ Upload failed:", uploadRes.status, await uploadRes.text());
      throw new Error("Upload failed");
    }

    const uploadData = await uploadRes.json();
    const audioUrl = uploadData.upload_url;
    console.log("✅ Uploaded successfully to:", audioUrl);

    // 2️⃣ Create the transcription request
    const requestBody = {
      audio_url: audioUrl, // ⚠️ must be snake_case
      language_code: "en", // or "en", "fr", "ar"
      auto_chapters: false,
    };

    console.log("📤 Sending transcription request:", requestBody);

    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const rawResponse = await transcriptRes.text();
    console.log("📥 Raw response from AssemblyAI:", transcriptRes.status, rawResponse);

    if (!transcriptRes.ok) {
      throw new Error(`❌ Failed to start transcription job: ${rawResponse}`);
    }

    const transcriptData = JSON.parse(rawResponse);
    const transcriptId = transcriptData.id;
    console.log("🧠 Transcription job started:", transcriptId);

    // 3️⃣ Poll until the transcription is ready
    let text = "";
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { "Authorization": apiKey },
      });

      const pollData = await pollRes.json();
      console.log(`⏳ Polling attempt ${i + 1}:`, pollData.status);

      if (pollData.status === "completed") {
        text = pollData.text;
        console.log("✅ Transcription completed");
        break;
      } else if (pollData.status === "error") {
        console.error("❌ AssemblyAI reported error:", pollData.error);
        throw new Error(pollData.error);
      }
    }

    if (!text) {
      throw new Error("Transcription timeout or empty result");
    }

    return text;
  } catch (err) {
    console.error("❌ AssemblyAI transcription error:", err);
    return ""; // Return empty so plugin shows "failed"
  }
}