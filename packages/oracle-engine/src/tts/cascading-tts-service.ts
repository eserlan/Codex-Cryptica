import type { VoiceProfile } from "schema";
import { GeminiTTSService } from "./gemini-tts-service";
import { WebSpeechTTSService } from "./web-speech-tts-service";

export interface TTSService {
  synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    apiKey: string,
  ): Promise<Blob | null>;
}

export class CascadingTTSService implements TTSService {
  private readonly gemini = new GeminiTTSService();
  private readonly webSpeech = new WebSpeechTTSService();

  async synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    apiKey: string,
  ): Promise<Blob | null> {
    if (apiKey) {
      const blob = await this.gemini.synthesize(text, voiceProfile, apiKey);
      if (blob) return blob;
      console.warn(
        "[CascadingTTS] Gemini TTS returned null — falling back to WebSpeech",
      );
    }
    console.log("[CascadingTTS] Using WebSpeech TTS");
    return this.webSpeech.synthesize(text, voiceProfile, apiKey);
  }
}
