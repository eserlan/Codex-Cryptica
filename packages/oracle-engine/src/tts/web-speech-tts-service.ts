import type { VoiceProfile } from "schema";
import type { TTSService } from "./cascading-tts-service";

export class WebSpeechTTSService implements TTSService {
  async synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    _apiKey: string,
  ): Promise<Blob | null> {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;

    return new Promise<Blob | null>((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        applyWebSpeechVoice(utterance, voiceProfile);

        // Resolve immediately onstart so generation completion is not blocked
        // by the playback length of Web Speech.
        utterance.onstart = () => resolve(null);
        utterance.onend = () => resolve(null);
        utterance.onerror = () => resolve(null);

        window.speechSynthesis.speak(utterance);

        // Safety timeout fallback
        setTimeout(() => resolve(null), 100);
      } catch {
        resolve(null);
      }
    });
  }

  /** Called separately to just play audio without capturing a Blob */
  play(text: string, voiceProfile: VoiceProfile): void {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    applyWebSpeechVoice(utterance, voiceProfile);
    window.speechSynthesis.speak(utterance);
  }
}

function applyWebSpeechVoice(
  utterance: SpeechSynthesisUtterance,
  profile: VoiceProfile,
): void {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;

  const genderHint = profile.gender === "female" ? "female" : "male";
  const match = voices.find(
    (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes(genderHint),
  );
  if (match) utterance.voice = match;

  switch (profile.ageRange) {
    case "child":
      utterance.rate = 1.1;
      utterance.pitch = 1.5;
      break;
    case "young-adult":
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      break;
    case "middle-aged":
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      break;
    case "elder":
      utterance.rate = 0.85;
      utterance.pitch = 0.8;
      break;
  }
}
