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
