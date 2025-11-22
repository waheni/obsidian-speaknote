export function mapLanguage(lang: string): string {
  // Whisper, Deepgram, and AssemblyAI mostly accept ISO codes:
  // en, fr, ar, es
  switch (lang) {
    case "fr": return "fr";
    case "de": return "de";
    case "es": return "es";
    case "en":
    default:   return "en";
  }
}
/**
 * Utility to normalize ANY provider error into a clear message.
 */
function makeFriendlyError(provider: string, raw: string): string {
  raw = raw.toLowerCase();

  if (raw.includes("invalid api key") || raw.includes("invalid credentials") || raw.includes("unauthorized")) {
    return `${provider}: Invalid API Key. Please check your key.`;
  }

  if (raw.includes("quota") || raw.includes("limit")) {
    return `${provider}: You exceeded your quota.`;
  }

  if (raw.includes("missing") || raw.includes("no api key")) {
    return `${provider}: API key is missing.`;
  }

  if (raw.includes("forbidden")) {
    return `${provider}: Access forbidden (possible wrong project / plan).`;
  }

  return `${provider}: ${raw}`;
}

/* -----------------------------------------------------------
   OPENAI WHISPER
----------------------------------------------------------- */
export async function transcribeAudio(apiKey: string, blob: Blob, selectedLang: string): Promise<string> {
  try {
    if (!apiKey) throw new Error("Missing API key");

    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", mapLanguage(selectedLang)); // NEW V0.2.0
    console.log("🎬 Starting OpenAI transcription...");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    const raw = await response.text();

    if (!response.ok) {
      const friendly = makeFriendlyError("OpenAI", raw);
      throw new Error(friendly);
    }

    const data = JSON.parse(raw);
    if (!data.text) throw new Error("OpenAI returned empty text.");

    return data.text;
  } catch (err: any) {
    console.error("❌ OpenAI transcription failed:", err);
    throw new Error(err.message || "OpenAI transcription error");
  }
}

/* -----------------------------------------------------------
   DEEPGRAM
----------------------------------------------------------- */
export async function transcribeWithDeepgram(apiKey: string, blob: Blob, selectedLang: string): Promise<string> {
  try {
    if (!apiKey) throw new Error("Missing API key");

    console.log("🎬 Starting Deepgram transcription...");

    const arrayBuffer = await blob.arrayBuffer();

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?model=nova-3&language=${mapLanguage(selectedLang)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
        },
        body: arrayBuffer,
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      const friendly = makeFriendlyError("Deepgram", raw);
      throw new Error(friendly);
    }

    const data = JSON.parse(raw);

    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();

    if (!transcript) throw new Error("Deepgram returned empty transcript.");

    return transcript;
  } catch (err: any) {
    console.error("❌ Deepgram transcription failed:", err);
    throw new Error(err.message || "Deepgram transcription error");
  }
}

/* -----------------------------------------------------------
   ASSEMBLYAI
----------------------------------------------------------- */
export async function transcribeWithAssemblyAI(apiKey: string, blob: Blob, selectedLang: string): Promise<string> {
  try {
    if (!apiKey) throw new Error("Missing API key");

    console.log("🎬 Starting AssemblyAI transcription...");

    // Upload
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { "Authorization": apiKey },
      body: blob,
    });

    const uploadRaw = await uploadRes.text();

    if (!uploadRes.ok) {
      const friendly = makeFriendlyError("AssemblyAI", uploadRaw);
      throw new Error(friendly);
    }

    const uploadData = JSON.parse(uploadRaw);
    const audioUrl = uploadData.upload_url;

    // Start job
    const body = {
      audio_url: audioUrl,
      language_code: mapLanguage(selectedLang),
      auto_chapters: false,
    };

    const jobRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const rawJob = await jobRes.text();

    if (!jobRes.ok) {
      const friendly = makeFriendlyError("AssemblyAI", rawJob);
      throw new Error(friendly);
    }

    const jobData = JSON.parse(rawJob);
    const jobId = jobData.id;

    // Poll
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(
        `https://api.assemblyai.com/v2/transcript/${jobId}`,
        { headers: { "Authorization": apiKey } }
      );

      const pollText = await pollRes.text();
      const pollData = JSON.parse(pollText);

      if (pollData.status === "completed") return pollData.text;
      if (pollData.status === "error") {
        const friendly = makeFriendlyError("AssemblyAI", pollData.error || "");
        throw new Error(friendly);
      }
    }

    throw new Error("AssemblyAI timeout: transcription took too long.");
  } catch (err: any) {
    console.error("❌ AssemblyAI transcription failed:", err);
    throw new Error(err.message || "AssemblyAI transcription error");
  }
}
