import { beforeEach, describe, expect, it, vi } from "vitest";
import { initAudioEngine, soundBiteService } from "./SoundBiteService.svelte";

const dependencies = {
  vault: {
    getActiveVaultHandle: vi.fn().mockResolvedValue(null),
    updateEntity: vi.fn().mockResolvedValue(undefined),
  },
  oracle: {
    effectiveApiKey: null,
    modelName: null,
    textGeneration: {},
    contextRetrieval: {},
  },
  debugStore: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  oracleBridge: { isReady: false },
  aiClientManager: { getModel: vi.fn() },
  writeOpfsFile: vi.fn(),
  deleteOpfsEntry: vi.fn(),
};

describe("SoundBiteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    soundBiteService.reset();
    initAudioEngine(dependencies);
  });

  it("loads and resets entity sound-bite state", () => {
    const entity = {
      id: "entity-1",
      title: "Aster",
      soundBite: { transcript: "Hello", voiceMode: "entity" },
    } as any;

    soundBiteService.pendingAutoPlay = true;
    soundBiteService.loadFromEntity(entity);

    expect(soundBiteService.savedSoundBite).toEqual(entity.soundBite);
    expect(soundBiteService.pendingAutoPlay).toBe(false);
    expect(soundBiteService.result).toBeNull();
  });

  it("reports generation failures and always clears the busy state", async () => {
    await soundBiteService.generate(
      { id: "entity-1", title: "Aster", content: "" } as any,
      "entity" as any,
      [],
    );

    expect(soundBiteService.isRevising).toBe(false);
    expect(soundBiteService.result).toBeNull();
    expect(soundBiteService.error).toBe(
      "Couldn't generate a sound bite. Please try again.",
    );
    expect(dependencies.debugStore.error).toHaveBeenCalled();
  });

  it("is a no-op while already revising", async () => {
    soundBiteService.isRevising = true;

    await soundBiteService.generate(
      { id: "entity-1", title: "Aster", content: "" } as any,
      "entity" as any,
      [],
    );

    expect(dependencies.debugStore.log).not.toHaveBeenCalled();
  });

  it("discards the current transient result", () => {
    (soundBiteService as any).result = { transcript: "x" };
    (soundBiteService as any).error = "oops";

    soundBiteService.discardResult();

    expect(soundBiteService.result).toBeNull();
    expect(soundBiteService.error).toBeNull();
  });

  it("resets all transient state", () => {
    soundBiteService.isRevising = true;
    (soundBiteService as any).result = { transcript: "x" };
    (soundBiteService as any).error = "oops";
    (soundBiteService as any).savedSoundBite = { transcript: "y" };
    soundBiteService.pendingAutoPlay = true;

    soundBiteService.reset();

    expect(soundBiteService.isRevising).toBe(false);
    expect(soundBiteService.result).toBeNull();
    expect(soundBiteService.error).toBeNull();
    expect(soundBiteService.savedSoundBite).toBeNull();
    expect(soundBiteService.pendingAutoPlay).toBe(false);
  });

  describe("save", () => {
    it("does nothing when there is no pending result", async () => {
      await soundBiteService.save({ id: "entity-1" } as any);

      expect(dependencies.vault.updateEntity).not.toHaveBeenCalled();
    });

    it("writes the audio blob to OPFS and persists the entity", async () => {
      const blob = new Blob(["audio"]);
      (soundBiteService as any).result = {
        transcript: "Hello",
        audioBlob: blob,
        voiceMode: "entity",
      };
      dependencies.vault.getActiveVaultHandle.mockResolvedValue({
        name: "vault-handle",
      });

      await soundBiteService.save({ id: "entity-1" } as any);

      expect(dependencies.writeOpfsFile).toHaveBeenCalledWith(
        ["audio", "entity-1_soundbite.wav"],
        blob,
        { name: "vault-handle" },
        "vault-handle",
      );
      expect(dependencies.vault.updateEntity).toHaveBeenCalledWith("entity-1", {
        soundBite: expect.objectContaining({
          transcript: "Hello",
          audioFile: "audio/entity-1_soundbite.wav",
        }),
      });
      expect(soundBiteService.savedSoundBite).not.toBeNull();
    });

    it("falls back to base64 storage when writing to OPFS fails", async () => {
      const blob = new Blob(["audio"]);
      (soundBiteService as any).result = {
        transcript: "Hello",
        audioBlob: blob,
        voiceMode: "entity",
      };
      dependencies.vault.getActiveVaultHandle.mockResolvedValue(null);

      await soundBiteService.save({ id: "entity-1" } as any);

      expect(dependencies.debugStore.warn).toHaveBeenCalled();
      const call = dependencies.vault.updateEntity.mock.calls[0];
      expect(call[1].soundBite.audioFile).toBeUndefined();
      expect(call[1].soundBite.audioData).toBeDefined();
    });

    it("saves a text-only result without touching OPFS", async () => {
      (soundBiteService as any).result = {
        transcript: "Hello",
        audioBlob: null,
        voiceMode: "entity",
      };

      await soundBiteService.save({ id: "entity-1" } as any);

      expect(dependencies.writeOpfsFile).not.toHaveBeenCalled();
      expect(dependencies.vault.updateEntity).toHaveBeenCalledWith("entity-1", {
        soundBite: expect.objectContaining({ transcript: "Hello" }),
      });
    });
  });

  describe("deleteSoundBite", () => {
    it("deletes the OPFS file and clears the entity's sound bite", async () => {
      dependencies.vault.getActiveVaultHandle.mockResolvedValue({
        name: "vault-handle",
      });

      await soundBiteService.deleteSoundBite({
        id: "entity-1",
        soundBite: { audioFile: "audio/entity-1_soundbite.wav" },
      } as any);

      expect(dependencies.deleteOpfsEntry).toHaveBeenCalledWith(
        { name: "vault-handle" },
        ["audio", "entity-1_soundbite.wav"],
        "vault-handle",
      );
      expect(dependencies.vault.updateEntity).toHaveBeenCalledWith("entity-1", {
        soundBite: undefined,
      });
      expect(soundBiteService.savedSoundBite).toBeNull();
    });

    it("clears entity state even when there is no stored audio file", async () => {
      await soundBiteService.deleteSoundBite({
        id: "entity-1",
        soundBite: { transcript: "text only" },
      } as any);

      expect(dependencies.deleteOpfsEntry).not.toHaveBeenCalled();
      expect(dependencies.vault.updateEntity).toHaveBeenCalledWith("entity-1", {
        soundBite: undefined,
      });
    });

    it("still clears entity state if the OPFS delete itself throws", async () => {
      dependencies.vault.getActiveVaultHandle.mockRejectedValue(
        new Error("handle unavailable"),
      );

      await soundBiteService.deleteSoundBite({
        id: "entity-1",
        soundBite: { audioFile: "audio/entity-1_soundbite.wav" },
      } as any);

      expect(dependencies.debugStore.warn).toHaveBeenCalled();
      expect(dependencies.vault.updateEntity).toHaveBeenCalledWith("entity-1", {
        soundBite: undefined,
      });
    });
  });

  describe("synthesizeCustomText", () => {
    it("is a no-op while already revising", async () => {
      soundBiteService.isRevising = true;

      await soundBiteService.synthesizeCustomText(
        { id: "entity-1", content: "" } as any,
        "Custom text",
        "entity" as any,
      );

      expect(dependencies.debugStore.log).not.toHaveBeenCalled();
    });

    it("falls back through the TTS cascade and always clears the busy state", async () => {
      await soundBiteService.synthesizeCustomText(
        { id: "entity-1", content: "he walked in" } as any,
        "Custom text",
        "entity" as any,
      );

      expect(soundBiteService.isRevising).toBe(false);
      // The unconfigured aiClientManager mock makes the Gemini leg of the TTS
      // cascade fail internally (logged, not rethrown) before falling back to
      // WebSpeech — assert the fallback was exercised rather than assuming
      // the whole call errors.
      expect(dependencies.debugStore.error).toHaveBeenCalledWith(
        "[ProxiedGeminiTTS] synthesize failed",
        expect.anything(),
      );
    });
  });
});
