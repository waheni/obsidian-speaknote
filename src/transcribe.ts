/**
 * Whisper transcription helper
 */
export async function transcribeAudio(apiKey: string, blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-1");

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