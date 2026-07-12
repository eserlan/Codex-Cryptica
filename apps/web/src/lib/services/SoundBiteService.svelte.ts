/**
 * SoundBiteService
 *
 * Reactive Svelte 5 service bridging the SoundBiteGenerator (oracle-engine)
 * with the DetailSoundBite UI component.
 *
 * Responsibilities:
 *  - Manage transient generation state (isRevising, result, error)
 *  - Write audio WAV file to OPFS vault (audio/{id}_soundbite.wav)
 *  - Persist / delete the saved sound bite via vault.updateEntity
 */

import type {
  SoundBiteResult,
  SoundBiteVoiceMode,
  SoundBite,
  Entity,
  VaultEntitySummary,
  VoiceProfile,
} from "schema";
import {
  SoundBiteGenerationError,
  SoundBiteContentPolicyError,
  getSoundBiteGenerator,
  WebSpeechTTSService,
  pcmBytesToWav,
  buildVoiceStyleInstruction,
  buildGeminiVoiceName,
  type TTSService,
} from "@codex/oracle-engine";
import { vault } from "$lib/stores/vault.svelte";
import { oracle } from "$lib/stores/oracle.svelte";
import { debugStore } from "$lib/stores/debug.svelte";
import { oracleBridge } from "$lib/cloud-bridge/oracle-bridge";
import { aiClientManager } from "@codex/ai-engine";
import { writeOpfsFile, deleteOpfsEntry } from "$lib/utils/opfs";
import * as Comlink from "comlink";
import type { TextGenerationService } from "schema";

// ─── State ────────────────────────────────────────────────────────────────────

class SoundBiteServiceClass {
  isRevising = $state(false);
  result = $state<SoundBiteResult | null>(null);
  error = $state<string | null>(null);
  savedSoundBite = $state<SoundBite | null>(null);
  /** Set to true by the host-broadcast handler so the modal auto-plays on open. */
  pendingAutoPlay = $state(false);

  /** Load saved sound bite from entity on mount */
  loadFromEntity(entity: Entity, keepAutoPlay = false): void {
    this.savedSoundBite = entity.soundBite ?? null;
    this.result = null;
    this.error = null;
    if (!keepAutoPlay) this.pendingAutoPlay = false;
  }

  /** Generate a new sound bite for the given entity */
  async generate(
    entity: Entity,
    voiceMode: SoundBiteVoiceMode,
    vaultEntitySummaries: VaultEntitySummary[],
  ): Promise<void> {
    if (this.isRevising) return;

    this.isRevising = true;
    this.result = null;
    this.error = null;

    try {
      const apiKey = oracle.effectiveApiKey ?? "";
      const modelName = oracle.modelName ?? "gemini-flash-lite-latest";

      debugStore.log(
        `[SoundBiteService] generate start — entity="${entity.title}" voiceMode=${voiceMode} model=${modelName} hasApiKey=${!!apiKey} textGeneration=${oracle.textGeneration ? "present" : "MISSING"} contextRetrieval=${oracle.contextRetrieval ? "present" : "MISSING"}`,
      );

      const generator = getSoundBiteGenerator(
        buildTextGenerationForSoundBite(),
        oracle.contextRetrieval,
        new SoundBiteTTSService(),
        debugStore,
      );

      // Reuse the saved voice profile for TTS only when the voice mode matches
      // the current generation. This preserves speaker timbre across same-mode
      // revisions while preventing a scholar's voice (e.g. female) from
      // bleeding into an entity-mode revision for a male character.
      const savedMode = this.savedSoundBite?.voiceMode;
      const savedProfile =
        savedMode === voiceMode
          ? (this.savedSoundBite?.voiceProfile as VoiceProfile | undefined)
          : undefined;

      debugStore.log(
        `[SoundBiteService] voice profile reuse: savedMode=${savedMode ?? "none"} currentMode=${voiceMode} → ${savedProfile ? `reusing (${savedProfile.gender} ${savedProfile.ageRange})` : "letting LLM decide"}`,
      );

      const result = await generator.generateSoundBite(apiKey, modelName, {
        entity,
        voiceMode,
        vaultEntitySummaries,
        voiceProfile: savedProfile,
      });

      debugStore.log(
        `[SoundBiteService] generate success — transcript length: ${result.transcript.length}`,
      );
      this.result = result;
    } catch (err) {
      debugStore.error("[SoundBiteService] generate error", err);
      if (err instanceof SoundBiteContentPolicyError) {
        this.error =
          "Couldn't generate a sound bite for this entity. Try enriching its lore.";
      } else if (err instanceof SoundBiteGenerationError) {
        this.error = err.message;
      } else {
        this.error =
          "Something went wrong generating the sound bite. Please try again.";
      }
    } finally {
      this.isRevising = false;
    }
  }

  /** Synthesize custom text using the TTS service directly */
  async synthesizeCustomText(
    entity: Entity,
    text: string,
    voiceMode: SoundBiteVoiceMode,
  ): Promise<void> {
    if (this.isRevising) return;

    this.isRevising = true;
    this.result = null;
    this.error = null;

    try {
      const apiKey = oracle.effectiveApiKey ?? "";

      debugStore.log(
        `[SoundBiteService] synthesizeCustomText start — entity="${entity.title}" text="${text.slice(0, 50)}..." voiceMode=${voiceMode}`,
      );

      // Reuse saved voice profile if matching mode, otherwise look for current results voice profile, otherwise fallback smartly
      const savedMode = this.savedSoundBite?.voiceMode;
      const savedProfile =
        savedMode === voiceMode
          ? (this.savedSoundBite?.voiceProfile as VoiceProfile | undefined)
          : undefined;

      let profile: VoiceProfile;
      if (savedProfile) {
        profile = savedProfile;
      } else {
        const contentLower = (entity.content ?? "").toLowerCase();
        let gender: "male" | "female" = "female";
        if (
          /\b(he|his|him|himself|man|boy|father|husband)\b/.test(contentLower)
        ) {
          gender = "male";
        }
        profile = {
          gender,
          ageRange: "young-adult",
          accent: "Standard",
          tone: "Clear and expressive",
        };
      }

      const ttsService = new SoundBiteTTSService();
      const audioBlob = await ttsService.synthesize(text, profile, apiKey);

      this.result = {
        transcript: text,
        audioBlob,
        voiceMode,
        voiceProfile: profile,
      };

      debugStore.log(`[SoundBiteService] synthesizeCustomText success`);
    } catch (err: any) {
      debugStore.error("[SoundBiteService] synthesizeCustomText error", err);
      this.error = err.message ?? "Failed to synthesize custom text.";
    } finally {
      this.isRevising = false;
    }
  }

  /** Discard the current transient result */
  discardResult(): void {
    this.result = null;
    this.error = null;
  }

  /** Save the current result to the entity */
  async save(entity: Entity): Promise<void> {
    if (!this.result) return;

    let audioFile: string | undefined;
    let audioData: string | undefined;

    if (this.result.audioBlob) {
      try {
        const vaultHandle = await vault.getActiveVaultHandle();
        if (!vaultHandle) throw new Error("No active vault handle");
        const filename = `${entity.id}_soundbite.wav`;
        await writeOpfsFile(
          ["audio", filename],
          this.result.audioBlob,
          vaultHandle,
          vaultHandle.name,
        );
        audioFile = `audio/${filename}`;
        debugStore.log(
          `[SoundBiteService] audio saved to vault — ${audioFile}`,
        );
      } catch (err) {
        debugStore.warn(
          "[SoundBiteService] could not save audio file, falling back to base64",
          err,
        );
        audioData = await blobToBase64(this.result.audioBlob);
      }
    }

    const soundBite: SoundBite = {
      transcript: this.result.transcript,
      audioFile,
      audioData,
      voiceMode: this.result.voiceMode,
      scholarName: this.result.scholarAttribution?.name,
      scholarTitle: this.result.scholarAttribution?.title,
      voiceProfile: this.result.voiceProfile,
      generatedAt: Date.now(),
    };

    await vault.updateEntity(entity.id, { soundBite });
    this.savedSoundBite = soundBite;
  }

  /** Delete the saved sound bite from the entity */
  async deleteSoundBite(entity: Entity): Promise<void> {
    const filename = entity.soundBite?.audioFile;
    if (filename) {
      try {
        const vaultHandle = await vault.getActiveVaultHandle();
        if (vaultHandle) {
          const segments = filename.split("/");
          await deleteOpfsEntry(vaultHandle, segments, vaultHandle.name).catch(
            () => {},
          );
          debugStore.log(
            `[SoundBiteService] deleted OPFS audio file: ${filename}`,
          );
        }
      } catch (err) {
        debugStore.warn(
          "[SoundBiteService] failed to delete OPFS audio file",
          err,
        );
      }
    }

    await vault.updateEntity(entity.id, { soundBite: undefined });
    this.savedSoundBite = null;
    this.result = null;
  }

  /** Reset transient state (used when switching entities) */
  reset(): void {
    this.isRevising = false;
    this.result = null;
    this.error = null;
    this.savedSoundBite = null;
    this.pendingAutoPlay = false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wraps oracle.textGeneration so that the onUpdate callback is proxied via
 * Comlink when the oracle bridge (worker) is active.
 */
function buildTextGenerationForSoundBite(): TextGenerationService {
  const tg = oracle.textGeneration;
  if (!oracleBridge.isReady) return tg;

  return {
    ...(tg as any),
    generateResponse: (
      apiKey: string,
      query: string,
      history: any[],
      context: string,
      modelName: string,
      onUpdate: (partial: string) => void,
      ...rest: any[]
    ) =>
      (tg as any).generateResponse(
        apiKey,
        query,
        history,
        context,
        modelName,
        Comlink.proxy(onUpdate),
        ...rest,
      ),
  } as TextGenerationService;
}

/**
 * TTS service that routes through aiClientManager.
 *
 * When apiKey is empty, aiClientManager.getModel() returns a proxy-backed model
 * that forwards the request to oracle-proxy.espen-erlandsen.workers.dev.
 * When a key is present, it calls the Gemini API directly via the SDK.
 */
class ProxiedGeminiTTSService implements TTSService {
  async synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    apiKey: string,
  ): Promise<Blob | null> {
    try {
      const voiceName = buildGeminiVoiceName(voiceProfile);
      debugStore.log(`[ProxiedGeminiTTS] synthesize — voice=${voiceName}`);

      const styleInstruction = buildVoiceStyleInstruction(voiceProfile);
      if (styleInstruction) {
        debugStore.log(
          `[ProxiedGeminiTTS] style instruction: "${styleInstruction}" (computed but ignored for gemini-2.5-flash-preview-tts due to Google 500 bug)`,
        );
      }

      const model = await aiClientManager.getModel(
        apiKey,
        "gemini-2.5-flash-preview-tts",
        undefined, // bypass systemInstruction for TTS to prevent Google 500 error
      );

      const ttsRequest: Record<string, unknown> = {
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      };

      const result = await (model as any).generateContent(ttsRequest);

      // rawResponse is populated by the proxy model path; SDK path uses response.candidates
      const candidates =
        (result as any)?.rawResponse?.candidates ??
        (result as any)?.response?.candidates;

      const audioPart = candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inline_data ?? p.inlineData,
      );
      const audioData: string | undefined =
        audioPart?.inline_data?.data ?? audioPart?.inlineData?.data;
      const mimeType: string =
        audioPart?.inline_data?.mime_type ??
        audioPart?.inlineData?.mimeType ??
        "audio/pcm";

      if (!audioData) {
        debugStore.warn(
          `[ProxiedGeminiTTS] No audio data in response — candidates: ${JSON.stringify(candidates).slice(0, 200)}`,
        );
        return null;
      }

      const sampleRate = parseInt(
        mimeType.match(/rate=(\d+)/i)?.[1] ?? "24000",
        10,
      );
      debugStore.log(
        `[ProxiedGeminiTTS] Got audio data (${audioData.length} base64 chars, mime=${mimeType}, rate=${sampleRate})`,
      );
      const binary = atob(audioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      return pcmBytesToWav(bytes, sampleRate);
    } catch (err) {
      debugStore.error("[ProxiedGeminiTTS] synthesize failed", err);
      return null;
    }
  }
}

/**
 * Cascade: ProxiedGemini first, then WebSpeech as last-resort fallback.
 */
class SoundBiteTTSService implements TTSService {
  private readonly gemini = new ProxiedGeminiTTSService();
  private readonly webSpeech = new WebSpeechTTSService();

  async synthesize(
    text: string,
    voiceProfile: VoiceProfile,
    apiKey: string,
  ): Promise<Blob | null> {
    const blob = await this.gemini.synthesize(text, voiceProfile, apiKey);
    if (blob) return blob;
    debugStore.log(
      "[SoundBiteTTS] Gemini returned null — falling back to WebSpeech",
    );
    return this.webSpeech.synthesize(text, voiceProfile, apiKey);
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const soundBiteService = new SoundBiteServiceClass();
