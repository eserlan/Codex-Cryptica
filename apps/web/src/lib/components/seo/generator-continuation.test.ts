import { describe, expect, it } from "vitest";
import {
  getGeneratorContinuationConfig,
  shouldShowGeneratorContinuation,
} from "./generator-continuation";

describe("generator-continuation", () => {
  it("returns Wave 1 configs for star-system, npc, rpg-npc-generator, and origin-generator", () => {
    const starSystem = getGeneratorContinuationConfig("star-system");
    expect(starSystem).not.toBeNull();
    expect(starSystem?.headline).toBe("Keep this system connected");
    expect(starSystem?.ctaLabel).toBe("Add to my Codex");
    expect(starSystem?.localFirstNotice).toBe(
      "No account needed; stored locally in this browser.",
    );

    const npc = getGeneratorContinuationConfig("npc");
    const rpgNpc = getGeneratorContinuationConfig("rpg-npc-generator");
    expect(npc).not.toBeNull();
    expect(rpgNpc).toBe(npc);
    expect(npc?.headline).toBe("Give this character a place in your world");
    expect(npc?.ctaLabel).toBe("Add to my Codex");
    expect(npc?.localFirstNotice).toBe(
      "No account needed; stored locally in this browser.",
    );

    const origin = getGeneratorContinuationConfig("origin-generator");
    expect(origin).not.toBeNull();
    expect(origin?.headline).toBe("Keep developing this origin");
    expect(origin?.ctaLabel).toBe("Add to my Codex");
    expect(origin?.localFirstNotice).toBe(
      "No account needed; stored locally in this browser.",
    );
  });

  it("returns null for Wave 2, names, and unknown generator types", () => {
    for (const type of [
      "point-crawl",
      "personality",
      "alien-race",
      "names",
      "fantasy-names",
      "dnd-npc",
      "unknown-generator",
      "",
      null,
      undefined,
    ]) {
      expect(getGeneratorContinuationConfig(type)).toBeNull();
    }
  });

  it("gates visibility strictly on explicit completed generation for Wave 1 non-names generators", () => {
    expect(
      shouldShowGeneratorContinuation({
        generatorType: "star-system",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(true);

    expect(
      shouldShowGeneratorContinuation({
        generatorType: "star-system",
        userGenerationSucceeded: false,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(false);

    expect(
      shouldShowGeneratorContinuation({
        generatorType: "npc",
        userGenerationSucceeded: true,
        isExampleDraft: true,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(false);

    expect(
      shouldShowGeneratorContinuation({
        generatorType: "origin-generator",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: true,
        variant: "default",
      }),
    ).toBe(false);

    expect(
      shouldShowGeneratorContinuation({
        generatorType: "npc",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: false,
        variant: "names",
      }),
    ).toBe(false);

    expect(
      shouldShowGeneratorContinuation({
        generatorType: "point-crawl",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(false);
  });
});
