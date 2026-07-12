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
});
