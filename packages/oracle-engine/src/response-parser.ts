import type {
  SoundBiteVoiceMode,
  ScholarAttribution,
  VoiceProfile,
} from "schema";

// ─── Error classes ────────────────────────────────────────────────────────────

export class SoundBiteGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoundBiteGenerationError";
  }
}

export class SoundBiteContentPolicyError extends SoundBiteGenerationError {
  constructor(
    message = "Couldn't generate a sound bite for this entity. Try enriching its lore.",
  ) {
    super(message);
    this.name = "SoundBiteContentPolicyError";
  }
}

// ─── Output type ─────────────────────────────────────────────────────────────

export interface GenerationOutput {
  transcript: string;
  voiceProfile: VoiceProfile;
  scholarAttribution?: ScholarAttribution;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseGenerationOutput(
  raw: string,
  voiceMode: SoundBiteVoiceMode,
): GenerationOutput {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new SoundBiteGenerationError(
      "Failed to parse sound bite response. Please try again.",
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).transcript !== "string" ||
    !(parsed as Record<string, unknown>).voiceProfile
  ) {
    throw new SoundBiteGenerationError(
      "Unexpected sound bite response shape. Please try again.",
    );
  }

  const obj = parsed as Record<string, unknown>;
  const vp = obj.voiceProfile as Record<string, unknown>;

  const VALID_GENDERS = [
    "male",
    "female",
    "neutral",
  ] as const satisfies ReadonlyArray<VoiceProfile["gender"]>;
  const VALID_AGE_RANGES = [
    "child",
    "young-adult",
    "middle-aged",
    "elder",
  ] as const satisfies ReadonlyArray<VoiceProfile["ageRange"]>;

  const voiceProfile: VoiceProfile = {
    gender: (VALID_GENDERS.includes(vp.gender as VoiceProfile["gender"])
      ? vp.gender
      : "neutral") as VoiceProfile["gender"],
    ageRange: (VALID_AGE_RANGES.includes(
      vp.ageRange as VoiceProfile["ageRange"],
    )
      ? vp.ageRange
      : "middle-aged") as VoiceProfile["ageRange"],
    accent: typeof vp.accent === "string" ? vp.accent : null,
    tone: typeof vp.tone === "string" ? vp.tone : "neutral",
  };

  const result: GenerationOutput = {
    transcript: (obj.transcript as string).trim(),
    voiceProfile,
  };

  if (voiceMode === "scholar" && obj.scholarAttribution) {
    const sa = obj.scholarAttribution as Record<string, unknown>;
    if (typeof sa.name === "string" && typeof sa.title === "string") {
      result.scholarAttribution = {
        name: sa.name.trim(),
        title: sa.title.trim(),
      };
    }
  }

  return result;
}
