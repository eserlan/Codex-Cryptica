import type {
  SoundBiteGenerationService,
  SoundBiteRequest,
  SoundBiteResult,
  ContextRetrievalService,
  TextGenerationService,
} from "schema";
import type { GenerationOutput } from "./response-parser";
import type { TTSService } from "./tts/cascading-tts-service";
import { CascadingTTSService } from "./tts/cascading-tts-service";
import { callLM, type SoundBiteLogger } from "./sound-bite-lm-adapter";
import {
  parseGenerationOutput,
  SoundBiteGenerationError,
  SoundBiteContentPolicyError,
} from "./response-parser";
import {
  buildEntityVoicePrompt,
  buildScholarVoicePrompt,
} from "./prompt-builders";

export type { SoundBiteLogger };
export { SoundBiteGenerationError, SoundBiteContentPolicyError };

// ─── SoundBiteGenerator ───────────────────────────────────────────────────────

const consoleLogger: SoundBiteLogger = {
  log: (msg, data) =>
    data !== undefined ? console.log(msg, data) : console.log(msg),
  warn: (msg, data) =>
    data !== undefined ? console.warn(msg, data) : console.warn(msg),
  error: (msg, data) =>
    data !== undefined ? console.error(msg, data) : console.error(msg),
};

export class SoundBiteGenerator implements SoundBiteGenerationService {
  private readonly logger: SoundBiteLogger;

  constructor(
    private readonly textGeneration: TextGenerationService,
    private readonly ttsService: TTSService,
    private readonly _contextRetrieval?: ContextRetrievalService,
    logger?: SoundBiteLogger,
  ) {
    this.logger = logger ?? consoleLogger;
  }

  async generateSoundBite(
    apiKey: string,
    modelName: string,
    request: SoundBiteRequest,
    options?: { isGuest?: boolean; isDemoMode?: boolean },
  ): Promise<SoundBiteResult> {
    const L = this.logger;
    L.log(
      `[SoundBite] generateSoundBite start — entity="${request.entity.title}" voiceMode=${request.voiceMode} model=${modelName} hasApiKey=${!!apiKey} isGuest=${options?.isGuest} isDemoMode=${options?.isDemoMode}`,
    );

    if (options?.isGuest) {
      throw new SoundBiteGenerationError("Guests cannot generate sound bites.");
    }

    const prompt =
      request.voiceMode === "entity"
        ? buildEntityVoicePrompt(request)
        : buildScholarVoicePrompt(request);

    L.log(`[SoundBite] prompt built (${prompt.length} chars)`);

    let output: GenerationOutput;
    try {
      const raw = await callLM(
        this.textGeneration,
        apiKey,
        modelName,
        prompt,
        options?.isDemoMode,
        L,
      );
      L.log(
        `[SoundBite] raw response (${raw.length} chars): ${raw.slice(0, 300)}`,
      );
      output = parseGenerationOutput(raw, request.voiceMode);
      L.log(
        `[SoundBite] parse OK — transcript="${output.transcript.slice(0, 80)}"`,
      );
    } catch (err) {
      L.warn(`[SoundBite] first attempt failed`, err);
      if (err instanceof SoundBiteContentPolicyError) throw err;
      L.log(`[SoundBite] retrying with strict JSON prompt…`);
      try {
        const retryPrompt =
          prompt +
          "\n\nIMPORTANT: Respond with ONLY the JSON object. No markdown, no explanation.";
        const raw = await callLM(
          this.textGeneration,
          apiKey,
          modelName,
          retryPrompt,
          options?.isDemoMode,
          L,
        );
        output = parseGenerationOutput(raw, request.voiceMode);
        L.log(
          `[SoundBite] retry parse OK — transcript="${output.transcript.slice(0, 80)}"`,
        );
      } catch (retryErr) {
        L.error(`[SoundBite] retry also failed`, retryErr);
        if (retryErr instanceof SoundBiteGenerationError) throw retryErr;
        throw new SoundBiteGenerationError(
          "Couldn't generate a sound bite. Please try again.",
        );
      }
    }

    const effectiveVoiceProfile = request.voiceProfile ?? output!.voiceProfile;

    let audioBlob: Blob | null = null;
    if (!options?.isDemoMode) {
      L.log(
        `[SoundBite] calling TTS synthesize — voice: ${effectiveVoiceProfile.gender} ${effectiveVoiceProfile.ageRange} (${effectiveVoiceProfile.tone})`,
      );
      audioBlob = await this.ttsService.synthesize(
        output!.transcript,
        effectiveVoiceProfile,
        apiKey,
      );
      L.log(
        `[SoundBite] TTS result: ${audioBlob ? `Blob(${audioBlob.size}B)` : "null"}`,
      );
    }

    L.log(`[SoundBite] done ✓`);
    return {
      transcript: output!.transcript,
      audioBlob,
      voiceMode: request.voiceMode,
      scholarAttribution: output!.scholarAttribution,
      voiceProfile: effectiveVoiceProfile,
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getSoundBiteGenerator(
  textGeneration: TextGenerationService,
  contextRetrieval?: ContextRetrievalService,
  ttsService?: TTSService,
  logger?: SoundBiteLogger,
): SoundBiteGenerator {
  return new SoundBiteGenerator(
    textGeneration,
    ttsService ?? new CascadingTTSService(),
    contextRetrieval,
    logger,
  );
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export {
  buildGeminiVoiceName,
  buildVoiceStyleInstruction,
} from "./voice-mapping";
export { pcmBytesToWav } from "./tts/pcm-to-wav";
export { WebSpeechTTSService } from "./tts/web-speech-tts-service";
export { GeminiTTSService } from "./tts/gemini-tts-service";
export type { TTSService } from "./tts/cascading-tts-service";
