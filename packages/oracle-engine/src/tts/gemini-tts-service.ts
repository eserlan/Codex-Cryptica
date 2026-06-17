import type { VoiceProfile } from "schema";
import type { TTSService } from "./cascading-tts-service";
import { buildGeminiVoiceName } from "../voice-mapping";
import { pcmBytesToWav } from "./pcm-to-wav";

/**
 * GeminiTTSService — Advanced tier
 * Synthesizes audio via Gemini 2.5 Flash Preview TTS for rich voice control.
 */
export class GeminiTTSService implements TTSService {
  // Injected for tests; default wraps the global `fetch` lazily.
  constructor(
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  async synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    apiKey: string,
  ): Promise<Blob | null> {
    if (!apiKey) {
      console.warn("[GeminiTTS] No API key — skipping Gemini TTS");
      return null;
    }
    try {
      const voiceName = buildGeminiVoiceName(voiceProfile);
      // const _styleInstruction = buildVoiceStyleInstruction(voiceProfile); // Bypassed due to Google TTS 500 crash on systemInstruction
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

      const requestBody: Record<string, unknown> = {
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      };

      // Note: Passing styleInstruction/systemInstruction to gemini-2.5-flash-preview-tts
      // currently causes Google's backend to throw an internal HTTP 500 crash.
      // So we bypass it entirely.

      const response = await this.fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "(unreadable)");
        console.warn(
          `[GeminiTTS] HTTP ${response.status}: ${errBody.slice(0, 200)}`,
        );
        return null;
      }

      const json = await response.json();
      const part = json?.candidates?.[0]?.content?.parts?.[0];
      const audioData: string | undefined =
        part?.inline_data?.data ?? part?.inlineData?.data;
      if (!audioData) {
        console.warn(
          "[GeminiTTS] Response OK but no audio data in payload:",
          JSON.stringify(json).slice(0, 300),
        );
        return null;
      }

      const mimeType: string =
        part?.inline_data?.mime_type ??
        part?.inlineData?.mimeType ??
        "audio/pcm";
      const sampleRate = parseInt(
        mimeType.match(/rate=(\d+)/i)?.[1] ?? "24000",
        10,
      );
      const binary = atob(audioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return pcmBytesToWav(bytes, sampleRate);
    } catch (err) {
      console.warn("[GeminiTTS] synthesize threw:", err);
      return null;
    }
  }
}
