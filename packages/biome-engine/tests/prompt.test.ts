import { describe, expect, it } from "bun:test";
import {
  addAlteration,
  createBlankProfile,
  createProfileFromReference,
  setOwnField,
} from "../src/profile";
import {
  buildIllustrationPrompt,
  ILLUSTRATION_PROMPT_PREFIX,
} from "../src/prompt";
import { getBiome } from "../src/catalogue";

const tundra = getBiome("tundra")!;

describe("buildIllustrationPrompt", () => {
  it("always begins with the exact prefix", () => {
    expect(ILLUSTRATION_PROMPT_PREFIX).toBe("fantasy, illustration of");
    for (const profile of [
      createBlankProfile(),
      createProfileFromReference(tundra, 1),
      setOwnField(createBlankProfile(), "terrain", "Floating islands"),
    ]) {
      expect(
        buildIllustrationPrompt(profile).startsWith("fantasy, illustration of"),
      ).toBe(true);
    }
  });

  it("names the biome and uses the reference's landscape and plants when the user wrote nothing", () => {
    const prompt = buildIllustrationPrompt(
      createProfileFromReference(tundra, 1),
    );
    expect(prompt).toContain("Tundra");
    expect(prompt).toContain("permafrost");
    expect(prompt).toContain("sedges");
  });

  it("prefers the user's own text over the reference for that aspect", () => {
    let profile = createProfileFromReference(tundra, 1);
    profile = setOwnField(profile, "vegetation", "Glowing blue moss");
    const prompt = buildIllustrationPrompt(profile);
    expect(prompt).toContain("Glowing blue moss");
    expect(prompt).not.toContain("sedges");
  });

  it("uses the given name for a blank-start profile", () => {
    const prompt = buildIllustrationPrompt(
      setOwnField(createBlankProfile(), "terrain", "Floating islands"),
      { name: "Sky Reach" },
    );
    expect(prompt).toContain("Sky Reach");
    expect(prompt).toContain("Floating islands");
  });

  it("falls back to a neutral phrase when there is no name or reference", () => {
    expect(buildIllustrationPrompt(createBlankProfile())).toBe(
      "fantasy, illustration of an imagined landscape",
    );
  });

  it("includes every fictional alteration", () => {
    let profile = createProfileFromReference(tundra, 1);
    profile = addAlteration(
      profile,
      { aspect: "climate", description: "It rains ash" },
      "a1",
    );
    profile = addAlteration(
      profile,
      { aspect: "water", description: "Rivers of liquid glass" },
      "a2",
    );
    const prompt = buildIllustrationPrompt(profile);
    expect(prompt).toContain("It rains ash");
    expect(prompt).toContain("Rivers of liquid glass");
  });

  it("is deterministic", () => {
    const profile = createProfileFromReference(tundra, 1);
    expect(buildIllustrationPrompt(profile)).toBe(
      buildIllustrationPrompt(profile),
    );
  });

  it("trims at a clause boundary to the maximum length, keeping the alterations", () => {
    let profile = createProfileFromReference(tundra, 1);
    profile = setOwnField(profile, "terrain", "T".repeat(300));
    profile = setOwnField(profile, "water", "W".repeat(300));
    profile = addAlteration(
      profile,
      { aspect: "climate", description: "It rains ash" },
      "a1",
    );
    const prompt = buildIllustrationPrompt(profile, { maxLength: 600 });
    expect(prompt.length).toBeLessThanOrEqual(600);
    expect(prompt).toContain("It rains ash");
    expect(prompt.endsWith(",")).toBe(false);
  });

  it("never exceeds a tiny maximum, even for one long clause", () => {
    const profile = setOwnField(
      createBlankProfile(),
      "terrain",
      "word ".repeat(100),
    );
    const prompt = buildIllustrationPrompt(profile, { maxLength: 80 });
    expect(prompt.length).toBeLessThanOrEqual(80);
    expect(prompt.startsWith("fantasy, illustration of")).toBe(true);
  });
});
