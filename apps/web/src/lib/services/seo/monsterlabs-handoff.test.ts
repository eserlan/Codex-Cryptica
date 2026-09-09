import { describe, it, expect, vi } from "vitest";
import {
  buildMonsterLabsPrompt,
  isMonsterLabsEligibleType,
  sendToMonsterLabsMonsterGenerator,
  MONSTERLABS_MONSTER_GENERATOR_URL,
} from "./monsterlabs-handoff";

describe("isMonsterLabsEligibleType", () => {
  it("accepts character and creature entity types", () => {
    expect(isMonsterLabsEligibleType("character")).toBe(true);
    expect(isMonsterLabsEligibleType("creature")).toBe(true);
  });

  it("rejects other entity types", () => {
    expect(isMonsterLabsEligibleType("location")).toBe(false);
    expect(isMonsterLabsEligibleType("faction")).toBe(false);
    expect(isMonsterLabsEligibleType("note")).toBe(false);
    expect(isMonsterLabsEligibleType(undefined)).toBe(false);
  });
});

describe("buildMonsterLabsPrompt", () => {
  it("puts name and title-cased type up front, then the description", () => {
    const prompt = buildMonsterLabsPrompt({
      name: "Ash-Eater Varkesh",
      type: "creature",
      description: "A soot-caked horror that hunts along collapsed mineshafts.",
    });

    expect(prompt).toBe(
      [
        "Name: Ash-Eater Varkesh",
        "Type: Creature",
        "",
        "A soot-caked horror that hunts along collapsed mineshafts.",
      ].join("\n"),
    );
  });

  it("title-cases character the same way", () => {
    const prompt = buildMonsterLabsPrompt({
      name: "Lord Varkesh",
      type: "character",
      description: "A disgraced noble scheming to reclaim his estate.",
    });

    expect(prompt.startsWith("Name: Lord Varkesh\nType: Character\n")).toBe(
      true,
    );
  });

  it("trims a padded description", () => {
    const prompt = buildMonsterLabsPrompt({
      name: "Grand Vizier",
      type: "character",
      description: "  cunning and ruthless  ",
    });

    expect(prompt.endsWith("cunning and ruthless")).toBe(true);
  });
});

describe("sendToMonsterLabsMonsterGenerator", () => {
  it("opens the monster generator with the prompt and attribution params", () => {
    const open = vi.fn();

    const result = sendToMonsterLabsMonsterGenerator(
      {
        name: "Ash-Eater Varkesh",
        type: "creature",
        description: "A soot-caked horror.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.origin + url.pathname).toBe(MONSTERLABS_MONSTER_GENERATOR_URL);
      expect(url.searchParams.get("prompt")).toBe(
        "Name: Ash-Eater Varkesh\nType: Creature\n\nA soot-caked horror.",
      );
      expect(url.searchParams.get("utm_source")).toBe("codexcryptica");
    }
  });

  it("survives markdown, unicode, and special characters in the description", () => {
    const description =
      "# Notes\n\n*Cunning & ruthless* — wields a +2 blade\nHP: 120 | 世界";
    const result = sendToMonsterLabsMonsterGenerator(
      {
        name: "Grand Vizier",
        type: "character",
        description,
      },
      { open: vi.fn() },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.searchParams.get("prompt")).toBe(
        `Name: Grand Vizier\nType: Character\n\n${description}`,
      );
    }
  });

  it("reports an explicit failure instead of opening a tab for an oversized entity", () => {
    const open = vi.fn();
    const result = sendToMonsterLabsMonsterGenerator(
      {
        name: "Wall of Text",
        type: "creature",
        description: "a".repeat(9000),
      },
      { open },
    );

    expect(result.ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.reason).toBe("url-too-long");
    }
  });
});
