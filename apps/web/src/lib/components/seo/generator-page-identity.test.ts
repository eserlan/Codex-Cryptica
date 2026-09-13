import { describe, expect, it } from "vitest";
import {
  resolveWorldThemeId,
  resolveGeneratorType,
  resolveGeneratedNoun,
  resolveGeneratedSingular,
} from "./generator-page-identity";

describe("resolveWorldThemeId", () => {
  it("maps a known theme label to its world theme id", () => {
    expect(resolveWorldThemeId("Classic Fantasy")).toBe("fantasy");
    expect(resolveWorldThemeId("Sci-Fi / Space Opera")).toBe("scifi");
  });

  it("falls back to the workspace theme for an unrecognized label", () => {
    expect(resolveWorldThemeId("Not A Real Theme")).toBe("workspace");
  });
});

describe("resolveGeneratorType", () => {
  it("uses the last segment of the canonical path when present", () => {
    expect(resolveGeneratorType("/generators/npc", "NPC Generator")).toBe(
      "npc",
    );
  });

  it("falls back to a slugified eyebrow when there is no canonical path", () => {
    expect(resolveGeneratorType(undefined, "RPG Faction Generator")).toBe(
      "rpg-faction-generator",
    );
  });

  it("falls back to unknown when neither source yields a slug", () => {
    expect(resolveGeneratorType(undefined, "")).toBe("unknown");
    expect(resolveGeneratorType("/", "")).toBe("unknown");
  });
});

describe("resolveGeneratedNoun", () => {
  it("matches the most specific eyebrow keyword", () => {
    expect(resolveGeneratedNoun("RPG NPC Generator")).toBe("RPG NPCs");
    expect(resolveGeneratedNoun("D&D NPC Generator")).toBe("D&D NPCs");
    expect(resolveGeneratedNoun("Name Generator")).toBe("fantasy names");
    expect(resolveGeneratedNoun("Deity Generator")).toBe("deities");
    expect(resolveGeneratedNoun("God Generator")).toBe("deities");
  });

  it("falls back to a generic label for an unrecognized eyebrow", () => {
    expect(resolveGeneratedNoun("Ship Generator")).toBe("RPG elements");
  });
});

describe("resolveGeneratedSingular", () => {
  it("strips the word Generator from the eyebrow", () => {
    expect(resolveGeneratedSingular("Faction Generator")).toBe("Faction");
    expect(resolveGeneratedSingular("RPG NPC Generator")).toBe("RPG NPC");
  });

  it("falls back to Draft when nothing is left", () => {
    expect(resolveGeneratedSingular("Generator")).toBe("Draft");
    expect(resolveGeneratedSingular("")).toBe("Draft");
  });
});
