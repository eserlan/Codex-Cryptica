import { describe, expect, it } from "vitest";
import {
  getGeneratorContinuationConfig,
  shouldShowGeneratorContinuation,
} from "./generator-continuation";

describe("generator-continuation", () => {
  it("returns Wave 1 configs for star-system, npc, rpg-npc-generator, and origin-generator", () => {
    const starSystem = getGeneratorContinuationConfig("star-system");
    expect(starSystem).toMatchObject({
      headline: "Keep this system connected",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });

    const npc = getGeneratorContinuationConfig("npc");
    const rpgNpc = getGeneratorContinuationConfig("rpg-npc-generator");
    const dndNpc = getGeneratorContinuationConfig("dnd-npc");
    expect(rpgNpc).toBe(npc);
    expect(dndNpc).toBe(npc);
    expect(npc).toMatchObject({
      headline: "Give this character a place in your world",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });

    const origin = getGeneratorContinuationConfig("origin-generator");
    expect(origin).toMatchObject({
      headline: "Keep developing this origin",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });

    const nomadClan = getGeneratorContinuationConfig("nomad-clan");
    expect(nomadClan).toMatchObject({
      headline: "Keep this clan on the road",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });

    const pantheon = getGeneratorContinuationConfig("pantheon-generator");
    expect(pantheon).toMatchObject({
      headline: "Bring this pantheon into your world",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });

    const newsSheet = getGeneratorContinuationConfig("news-sheet-generator");
    expect(newsSheet).toMatchObject({
      headline: "Keep this issue in your campaign archive",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });
    const ship = getGeneratorContinuationConfig("ship-generator");
    expect(ship).toMatchObject({
      headline: "Dock this vessel in your campaign",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });

    const dungeon = getGeneratorContinuationConfig("dungeon-generator");
    expect(dungeon).toMatchObject({
      headline: "Turn this delve into a playable site",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });
    const adventureIdea = getGeneratorContinuationConfig(
      "adventure-idea-generator",
    );
    expect(adventureIdea).toMatchObject({
      headline: "Turn this scenario into an active thread",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });

    const oneShot = getGeneratorContinuationConfig(
      "one-shot-adventure-generator",
    );
    expect(oneShot).toMatchObject({
      headline: "Save this run sheet for tonight's table",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });
  });

  it("returns null for Wave 2, names, and unknown generator types", () => {
    for (const type of [
      "point-crawl",
      "personality",
      "alien-race",
      "names",
      "fantasy-names",
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
