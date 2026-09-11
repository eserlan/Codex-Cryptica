import { describe, it, expect } from "vitest";
import {
  parseGenerationOutput,
  SoundBiteGenerationError,
  SoundBiteContentPolicyError,
} from "./response-parser";

describe("parseGenerationOutput", () => {
  it("parses valid JSON response into GenerationOutput", () => {
    const raw = JSON.stringify({
      transcript: "I guard these ancient halls with my life.",
      voiceProfile: {
        gender: "male",
        ageRange: "elder",
        accent: "scottish",
        tone: "gruff and stern",
      },
    });

    const result = parseGenerationOutput(raw, "entity");
    expect(result).toEqual({
      transcript: "I guard these ancient halls with my life.",
      voiceProfile: {
        gender: "male",
        ageRange: "elder",
        accent: "scottish",
        tone: "gruff and stern",
      },
    });
  });

  it("strips markdown json code fences before parsing", () => {
    const raw =
      "```json\n" +
      JSON.stringify({
        transcript: "Wisdom speaks quietly.",
        voiceProfile: {
          gender: "female",
          ageRange: "young-adult",
          accent: null,
          tone: "serene",
        },
      }) +
      "\n```";

    const result = parseGenerationOutput(raw, "entity");
    expect(result.transcript).toBe("Wisdom speaks quietly.");
    expect(result.voiceProfile.gender).toBe("female");
  });

  it("applies fallbacks for unrecognized gender and ageRange", () => {
    const raw = JSON.stringify({
      transcript: "An entity speaks.",
      voiceProfile: {
        gender: "alien",
        ageRange: "timeless",
        accent: 123, // not a string
        tone: 456, // not a string
      },
    });

    const result = parseGenerationOutput(raw, "entity");
    expect(result.voiceProfile).toEqual({
      gender: "neutral",
      ageRange: "middle-aged",
      accent: null,
      tone: "neutral",
    });
  });

  it("extracts scholarAttribution when voiceMode is scholar", () => {
    const raw = JSON.stringify({
      transcript: "The records of the third epoch mention this creature.",
      voiceProfile: {
        gender: "neutral",
        ageRange: "elder",
      },
      scholarAttribution: {
        name: " Archivist Vane ",
        title: " High Chronologer ",
      },
    });

    const result = parseGenerationOutput(raw, "scholar");
    expect(result.scholarAttribution).toEqual({
      name: "Archivist Vane",
      title: "High Chronologer",
    });
  });

  it("omits scholarAttribution when voiceMode is entity even if provided", () => {
    const raw = JSON.stringify({
      transcript: "I am the sword.",
      voiceProfile: { gender: "neutral" },
      scholarAttribution: { name: "Historian", title: "Keeper" },
    });

    const result = parseGenerationOutput(raw, "entity");
    expect(result.scholarAttribution).toBeUndefined();
  });

  it("throws SoundBiteGenerationError on invalid JSON", () => {
    expect(() => parseGenerationOutput("not json", "entity")).toThrow(
      SoundBiteGenerationError,
    );
  });

  it("throws SoundBiteGenerationError when required fields are missing", () => {
    expect(() =>
      parseGenerationOutput(JSON.stringify({ transcript: 123 }), "entity"),
    ).toThrow(SoundBiteGenerationError);

    expect(() =>
      parseGenerationOutput(
        JSON.stringify({ transcript: "Present" }),
        "entity",
      ),
    ).toThrow(SoundBiteGenerationError);

    expect(() =>
      parseGenerationOutput(JSON.stringify("a string"), "entity"),
    ).toThrow(SoundBiteGenerationError);
  });
});

describe("SoundBiteContentPolicyError", () => {
  it("subclasses SoundBiteGenerationError with default message", () => {
    const err = new SoundBiteContentPolicyError();
    expect(err).toBeInstanceOf(SoundBiteGenerationError);
    expect(err.name).toBe("SoundBiteContentPolicyError");
    expect(err.message).toContain("Try enriching its lore");
  });
});
