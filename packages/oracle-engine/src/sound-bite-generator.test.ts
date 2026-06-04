import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SoundBiteGenerator,
  SoundBiteGenerationError,
  SoundBiteContentPolicyError,
  buildGeminiVoiceName,
  buildVoiceStyleInstruction,
} from "./sound-bite-generator";
import type { SoundBiteLogger } from "./sound-bite-generator";
import type {
  TextGenerationService,
  ContextRetrievalService,
  VoiceProfile,
} from "schema";

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const MOCK_ENTITY = {
  id: "ent-1",
  type: "character",
  title: "Aelindra",
  content: "A wise elven mage who guards the ancient library.",
  lore: "She carries the burden of centuries.",
  tags: [],
  labels: [],
  aliases: [],
  connections: [],
  status: "active" as const,
};

const ENTITY_JSON = JSON.stringify({
  transcript:
    "The knowledge of ages rests in my hands, and I alone decide who is worthy.",
  voiceProfile: {
    gender: "female",
    ageRange: "elder",
    accent: "High Elven",
    tone: "serene and authoritative",
  },
});

const SCHOLAR_JSON = JSON.stringify({
  transcript:
    "Aelindra's library is said to hold maps of realms not yet discovered.",
  voiceProfile: {
    gender: "male",
    ageRange: "middle-aged",
    accent: null,
    tone: "scholarly",
  },
  scholarAttribution: {
    name: "Brother Emeric",
    title: "Archivist of the Pale Order",
  },
});

function makeTextGen(response: string): TextGenerationService {
  return {
    expandQuery: vi.fn(),
    generateResponse: vi.fn(async (_a, _b, _c, _d, _e, onUpdate) => {
      onUpdate(response);
    }),
    generateMergeProposal: vi.fn(),
    generatePlotAnalysis: vi.fn(),
  } as unknown as TextGenerationService;
}

const mockContextRetrieval: ContextRetrievalService = {
  retrieveContext: vi.fn(),
  getConsolidatedContext: vi.fn().mockReturnValue(""),
};

const mockTTS = {
  synthesize: vi
    .fn()
    .mockResolvedValue(new Blob(["audio"], { type: "audio/wav" })),
};

const silentLogger: SoundBiteLogger = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// ─── buildGeminiVoiceName ─────────────────────────────────────────────────────

describe("buildGeminiVoiceName", () => {
  it("maps female elder to Leda (deep, velvety)", () => {
    const profile: VoiceProfile = {
      gender: "female",
      ageRange: "elder",
      tone: "wise",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Leda");
  });

  it("maps female young-adult to Kore (default)", () => {
    const profile: VoiceProfile = {
      gender: "female",
      ageRange: "young-adult",
      tone: "calm",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Kore");
  });

  it("maps female child to Autonoe", () => {
    const profile: VoiceProfile = {
      gender: "female",
      ageRange: "child",
      tone: "cheerful",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Autonoe");
  });

  it("maps female with whisper tone to Erinome", () => {
    const profile: VoiceProfile = {
      gender: "female",
      ageRange: "young-adult",
      tone: "whispering and hushed",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Erinome");
  });

  it("maps female with ethereal tone to Zephyr", () => {
    const profile: VoiceProfile = {
      gender: "female",
      ageRange: "young-adult",
      tone: "ethereal and mystical",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Zephyr");
  });

  it("maps male elder to Charon (default)", () => {
    const profile: VoiceProfile = {
      gender: "male",
      ageRange: "elder",
      tone: "measured",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Charon");
  });

  it("maps male child to Puck", () => {
    const profile: VoiceProfile = {
      gender: "male",
      ageRange: "child",
      tone: "energetic",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Puck");
  });

  it("maps male young-adult to Puck (default)", () => {
    const profile: VoiceProfile = {
      gender: "male",
      ageRange: "young-adult",
      tone: "confident",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Puck");
  });

  it("maps male with gravelly/dark tone to Fenrir", () => {
    const profile: VoiceProfile = {
      gender: "male",
      ageRange: "middle-aged",
      tone: "gravelly and menacing",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Fenrir");
  });

  it("maps male elder with warm/grandfatherly tone to Rasalgethi", () => {
    const profile: VoiceProfile = {
      gender: "male",
      ageRange: "elder",
      tone: "warm and grandfatherly",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Rasalgethi");
  });

  it("maps male with scholarly tone to Sadachbia", () => {
    const profile: VoiceProfile = {
      gender: "male",
      ageRange: "middle-aged",
      tone: "scholarly and analytical",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Sadachbia");
  });

  it("maps neutral/unspecified to Kore", () => {
    const profile: VoiceProfile = {
      gender: "neutral",
      ageRange: "young-adult",
      tone: "calm",
    };
    expect(buildGeminiVoiceName(profile)).toBe("Kore");
  });
});

// ─── buildVoiceStyleInstruction ──────────────────────────────────────────────

describe("buildVoiceStyleInstruction", () => {
  it("returns null when no accent and no tone", () => {
    const profile: VoiceProfile = {
      gender: "male",
      ageRange: "young-adult",
      tone: "",
    };
    expect(buildVoiceStyleInstruction(profile)).toBeNull();
  });

  it("includes accent when present", () => {
    const profile: VoiceProfile = {
      gender: "female",
      ageRange: "middle-aged",
      accent: "Hungarian",
      tone: "scholarly",
    };
    const instruction = buildVoiceStyleInstruction(profile);
    expect(instruction).toContain("Hungarian accent");
  });

  it("includes tone", () => {
    const profile: VoiceProfile = {
      gender: "male",
      ageRange: "middle-aged",
      tone: "gruff",
    };
    const instruction = buildVoiceStyleInstruction(profile);
    expect(instruction).toContain("gruff");
  });

  it("adds elder pacing hint", () => {
    const profile: VoiceProfile = {
      gender: "female",
      ageRange: "elder",
      tone: "wise",
    };
    const instruction = buildVoiceStyleInstruction(profile);
    expect(instruction).toContain("deliberate");
  });

  it("adds child pacing hint", () => {
    const profile: VoiceProfile = {
      gender: "male",
      ageRange: "child",
      tone: "curious",
    };
    const instruction = buildVoiceStyleInstruction(profile);
    expect(instruction).toContain("energetic");
  });
});

// ─── SoundBiteGenerator ───────────────────────────────────────────────────────

describe("SoundBiteGenerator.generateSoundBite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTTS.synthesize.mockResolvedValue(
      new Blob(["audio"], { type: "audio/wav" }),
    );
  });

  it("generates an entity voice sound bite", async () => {
    const gen = new SoundBiteGenerator(
      makeTextGen(ENTITY_JSON),
      mockTTS,
      mockContextRetrieval,
      silentLogger,
    );
    const result = await gen.generateSoundBite("key", "model", {
      entity: MOCK_ENTITY,
      voiceMode: "entity",
      vaultEntitySummaries: [],
    });

    expect(result.transcript).toContain("knowledge of ages");
    expect(result.voiceMode).toBe("entity");
    expect(result.voiceProfile.gender).toBe("female");
    expect(result.voiceProfile.ageRange).toBe("elder");
    expect(result.audioBlob).not.toBeNull();
  });

  it("generates a scholar voice sound bite with attribution", async () => {
    const gen = new SoundBiteGenerator(
      makeTextGen(SCHOLAR_JSON),
      mockTTS,
      mockContextRetrieval,
      silentLogger,
    );
    const result = await gen.generateSoundBite("key", "model", {
      entity: MOCK_ENTITY,
      voiceMode: "scholar",
      vaultEntitySummaries: [],
    });

    expect(result.transcript).toContain("maps of realms");
    expect(result.voiceMode).toBe("scholar");
    expect(result.scholarAttribution?.name).toBe("Brother Emeric");
    expect(result.scholarAttribution?.title).toBe(
      "Archivist of the Pale Order",
    );
  });

  it("uses provided voiceProfile override for TTS (same-mode reuse)", async () => {
    const overrideProfile: VoiceProfile = {
      gender: "male",
      ageRange: "middle-aged",
      tone: "gruff",
    };
    const gen = new SoundBiteGenerator(
      makeTextGen(ENTITY_JSON),
      mockTTS,
      mockContextRetrieval,
      silentLogger,
    );
    const result = await gen.generateSoundBite("key", "model", {
      entity: MOCK_ENTITY,
      voiceMode: "entity",
      vaultEntitySummaries: [],
      voiceProfile: overrideProfile,
    });

    // TTS should have been called with the override profile
    expect(mockTTS.synthesize).toHaveBeenCalledWith(
      expect.any(String),
      overrideProfile,
      "key",
    );
    // Result carries the effective (override) profile
    expect(result.voiceProfile).toEqual(overrideProfile);
  });

  it("returns null audioBlob when TTS fails (non-fatal)", async () => {
    mockTTS.synthesize.mockResolvedValue(null);
    const gen = new SoundBiteGenerator(
      makeTextGen(ENTITY_JSON),
      mockTTS,
      mockContextRetrieval,
      silentLogger,
    );
    const result = await gen.generateSoundBite("key", "model", {
      entity: MOCK_ENTITY,
      voiceMode: "entity",
      vaultEntitySummaries: [],
    });

    expect(result.audioBlob).toBeNull();
    expect(result.transcript).toBeTruthy();
  });

  it("throws SoundBiteContentPolicyError on refusal signals", async () => {
    const refusal = "I am unable to generate content for this request.";
    const gen = new SoundBiteGenerator(
      makeTextGen(refusal),
      mockTTS,
      mockContextRetrieval,
      silentLogger,
    );

    await expect(
      gen.generateSoundBite("key", "model", {
        entity: MOCK_ENTITY,
        voiceMode: "entity",
        vaultEntitySummaries: [],
      }),
    ).rejects.toThrow(SoundBiteContentPolicyError);
  });

  it("throws SoundBiteGenerationError for guests", async () => {
    const gen = new SoundBiteGenerator(
      makeTextGen(ENTITY_JSON),
      mockTTS,
      mockContextRetrieval,
      silentLogger,
    );

    await expect(
      gen.generateSoundBite(
        "key",
        "model",
        { entity: MOCK_ENTITY, voiceMode: "entity", vaultEntitySummaries: [] },
        { isGuest: true },
      ),
    ).rejects.toThrow(SoundBiteGenerationError);
  });

  it("skips TTS in demo mode", async () => {
    const gen = new SoundBiteGenerator(
      makeTextGen(ENTITY_JSON),
      mockTTS,
      mockContextRetrieval,
      silentLogger,
    );
    await gen.generateSoundBite(
      "key",
      "model",
      { entity: MOCK_ENTITY, voiceMode: "entity", vaultEntitySummaries: [] },
      { isDemoMode: true },
    );

    expect(mockTTS.synthesize).not.toHaveBeenCalled();
  });

  it("handles entity with minimal lore gracefully", async () => {
    const sparseEntity = { ...MOCK_ENTITY, content: "", lore: undefined };
    const gen = new SoundBiteGenerator(
      makeTextGen(ENTITY_JSON),
      mockTTS,
      mockContextRetrieval,
      silentLogger,
    );
    const result = await gen.generateSoundBite("key", "model", {
      entity: sparseEntity,
      voiceMode: "entity",
      vaultEntitySummaries: [],
    });

    expect(result.transcript).toBeTruthy();
  });
});
