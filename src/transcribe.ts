import { requestUrl } from "obsidian";

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
export function makeFriendlyError(provider: string, raw: string): string {
  const msg = raw.toLowerCase();

  // ----- Missing or invalid API key -----
  if (msg.includes("missing") || msg.includes("no api key")) {
    return `${provider}: Missing API key.`;
  }

  if (
    msg.includes("invalid api key") ||
    msg.includes("invalid credentials") ||
    msg.includes("unauthorized") ||
    msg.includes("incorrect api key") ||
    msg.includes("401")
  ) {
    return `${provider}: Invalid API key.`;
  }

  // ----- Quota or plan limits -----
  if (
    msg.includes("quota") ||
    msg.includes("limit") ||
    msg.includes("insufficient_quota")
  ) {
    return `${provider}: API quota exceeded.`;
  }

  // ----- Unsupported language -----
  if (msg.includes("language") || msg.includes("unsupported")) {
    return `${provider}: Language not supported.`;
  }

  // ----- Forbidden / wrong project -----
  if (msg.includes("forbidden") || msg.includes("403")) {
    return `${provider}: Access forbidden (check account permissions).`;
  }

  // ----- Network issues -----
  if (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout")
  ) {
    return `${provider}: Network connection issue.`;
  }

  // ----- Rate limits -----
  if (msg.includes("too many") || msg.includes("429")) {
    return `${provider}: Too many requests. Slow down and try again.`;
  }

  // ----- Fallback -----
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
    formData.append("language", mapLanguage(selectedLang));

    let response;
    try {
      response = await requestUrl({
        url: "https://api.openai.com/v1/audio/transcriptions",
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData as unknown as string,
        throw: false
      });
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      if (msg.includes("ERR_INTERNET_DISCONNECTED") || msg.includes("ERR_NETWORK")) {
        throw new Error("Network connection issue");
      }
      throw netErr;
    }

    if (response.status !== 200) {
      const friendly = makeFriendlyError("OpenAI", response.text);
      throw new Error(friendly);
    }

    const data = response.json;
    if (!data.text) throw new Error("OpenAI returned empty text.");

    return data.text;
  } catch (err: unknown) {
    console.error("OpenAI transcription failed:", err);
    throw new Error(err instanceof Error ? err.message : "OpenAI transcription error");
  }
}

/* -----------------------------------------------------------
   DEEPGRAM
----------------------------------------------------------- */
export async function transcribeWithDeepgram(apiKey: string, blob: Blob, selectedLang: string): Promise<string> {
  try {
    if (!apiKey) throw new Error("Missing API key");

    const arrayBuffer = await blob.arrayBuffer();

    let response;
    try {
      response = await requestUrl({
        url: `https://api.deepgram.com/v1/listen?model=nova-3&language=${mapLanguage(selectedLang)}`,
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
        },
        body: arrayBuffer as unknown as string,
        throw: false
      });
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      if (msg.includes("ERR_INTERNET_DISCONNECTED") || msg.includes("ERR_NETWORK")) {
        throw new Error("Network connection issue");
      }
      throw netErr;
    }

    if (response.status !== 200) {
      const friendly = makeFriendlyError("Deepgram", response.text);
      throw new Error(friendly);
    }

    const data = response.json;

    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();

    if (!transcript) throw new Error("Deepgram returned empty transcript.");

    return transcript;
  } catch (err: unknown) {
    console.error("Deepgram transcription failed:", err);
    throw new Error(err instanceof Error ? err.message : "Deepgram transcription error");
  }
}

/* -----------------------------------------------------------
   ASSEMBLYAI
----------------------------------------------------------- */
export async function transcribeWithAssemblyAI(apiKey: string, blob: Blob, selectedLang: string): Promise<string> {
  try {
    if (!apiKey) throw new Error("Missing API key");

    // Upload
    let uploadRes;
    try {
      uploadRes = await requestUrl({
        url: "https://api.assemblyai.com/v2/upload",
        method: "POST",
        headers: { "Authorization": apiKey },
        body: await blob.arrayBuffer() as unknown as string,
        throw: false
      });
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      if (msg.includes("ERR_INTERNET_DISCONNECTED") || msg.includes("ERR_NETWORK")) {
        throw new Error("Network connection issue");
      }
      throw netErr;
    }

    if (uploadRes.status !== 200) {
      const friendly = makeFriendlyError("AssemblyAI", uploadRes.text);
      throw new Error(friendly);
    }

    const uploadData = uploadRes.json;
    const audioUrl = uploadData.upload_url;

    // Start job
    const body = {
      audio_url: audioUrl,
      language_code: mapLanguage(selectedLang),
      auto_chapters: false,
    };

    let jobRes;
    try {
      jobRes = await requestUrl({
        url: "https://api.assemblyai.com/v2/transcript",
        method: "POST",
        headers: {
          "Authorization": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        throw: false
      });
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      if (msg.includes("ERR_INTERNET_DISCONNECTED") || msg.includes("ERR_NETWORK")) {
        throw new Error("Network connection issue");
      }
      throw netErr;
    }

    if (jobRes.status !== 200) {
      const friendly = makeFriendlyError("AssemblyAI", jobRes.text);
      throw new Error(friendly);
    }

    const jobData = jobRes.json;
    const jobId = jobData.id;

    // Poll
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      let pollRes;
      try {
        pollRes = await requestUrl({
          url: `https://api.assemblyai.com/v2/transcript/${jobId}`,
          method: "GET",
          headers: { "Authorization": apiKey },
          throw: false
        });
      } catch (netErr: unknown) {
        const msg = netErr instanceof Error ? netErr.message : String(netErr);
        if (msg.includes("ERR_INTERNET_DISCONNECTED") || msg.includes("ERR_NETWORK")) {
          throw new Error("Network connection issue");
        }
        throw netErr;
      }

      const pollData = pollRes.json;

      if (pollData.status === "completed") return pollData.text;
      if (pollData.status === "error") {
        const friendly = makeFriendlyError("AssemblyAI", pollData.error || "");
        throw new Error(friendly);
      }
    }

    throw new Error("AssemblyAI timeout: transcription took too long.");
  } catch (err: unknown) {
    console.error("AssemblyAI transcription failed:", err);
    throw new Error(err instanceof Error ? err.message : "AssemblyAI transcription error");
  }
}
