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

    const comicEvent = getGeneratorContinuationConfig(
      "comic-book-event-generator",
    );
    expect(comicEvent).toMatchObject({
      headline: "Track this crisis across your campaign",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });

    const plotTwist = getGeneratorContinuationConfig("plot-twist-generator");
    expect(plotTwist).toMatchObject({
      headline: "Keep this reversal tied to your plot",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });

    const villainScheme = getGeneratorContinuationConfig(
      "villain-scheme-generator",
    );
    expect(villainScheme).toMatchObject({
      headline: "Keep this plot moving in your vault",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });
  });

  it("configures the council vote as an Event import with GM-only lore and gates it on completed generation", () => {
    const config = getGeneratorContinuationConfig("council-vote");
    expect(config).not.toBeNull();
    expect(config?.capabilities.join(" ")).toContain("Event entry");
    expect(config?.capabilities.join(" ")).toContain("GM-only lore");
    expect(
      [config?.headline, config?.summary, ...(config?.capabilities ?? [])]
        .join(" ")
        .match(/[–—]/),
    ).toBeNull();

    expect(
      shouldShowGeneratorContinuation({
        generatorType: "council-vote",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(true);
    expect(
      shouldShowGeneratorContinuation({
        generatorType: "council-vote",
        userGenerationSucceeded: true,
        isExampleDraft: true,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(false);
  });

  it("configures the holiday as a Note import with GM-only lore and gates it on completed generation", () => {
    const config = getGeneratorContinuationConfig("holiday");
    expect(config).not.toBeNull();
    expect(config?.capabilities.join(" ")).toContain("Note entry");
    expect(config?.capabilities.join(" ")).toContain("GM-only lore");
    expect(config?.capabilities.join(" ")).toContain("remove table hooks");
  });

  it("configures the encounter as an Event import with GM-only lore and gates it on completed generation", () => {
    const config = getGeneratorContinuationConfig("encounter");
    expect(config).not.toBeNull();
    expect(config?.capabilities.join(" ")).toContain("Event entry");
    expect(config?.capabilities.join(" ")).toContain("GM-only lore");
    expect(
      [config?.headline, config?.summary, ...(config?.capabilities ?? [])]
        .join(" ")
        .toLowerCase(),
    ).not.toContain("undefined");

    expect(
      shouldShowGeneratorContinuation({
        generatorType: "encounter",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(true);
    expect(
      shouldShowGeneratorContinuation({
        generatorType: "encounter",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: true,
        variant: "default",
      }),
    ).toBe(false);
  });

  it("configures the constellation as a Note import with GM-only lore and gates it on completed generation", () => {
    const config = getGeneratorContinuationConfig("constellation");
    expect(config).not.toBeNull();
    expect(config?.capabilities.join(" ")).toContain("Note entry");
    expect(config?.capabilities.join(" ")).toContain("GM-only lore");
    expect([config?.headline, config?.summary].join(" ")).toContain(
      "constellation or full sky",
    );
    expect(config?.capabilities.join(" ")).toContain(
      "Night Sky season index stays in public Note content",
    );
    expect(config?.capabilities.join(" ")).toContain(
      "Keep omens and adventure hooks as GM-only lore",
    );
    expect(config?.capabilities.join(" ")).not.toContain(
      "detailed visibility notes",
    );
    expect(
      [config?.headline, config?.summary, ...(config?.capabilities ?? [])]
        .join(" ")
        .match(/[–—]/),
    ).toBeNull();

    expect(
      shouldShowGeneratorContinuation({
        generatorType: "constellation",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(true);
    expect(
      shouldShowGeneratorContinuation({
        generatorType: "constellation",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: true,
        variant: "default",
      }),
    ).toBe(false);
  });

  it("configures the alien race as a Creature import with GM-only lore and gates it on completed generation", () => {
    const config = getGeneratorContinuationConfig("alien-race");
    expect(config).not.toBeNull();
    expect(config?.capabilities.join(" ")).toContain("Creature entry");
    expect(config?.capabilities.join(" ")).toContain("GM-only lore");
    expect(
      [config?.headline, config?.summary, ...(config?.capabilities ?? [])]
        .join(" ")
        .match(/[–—]/),
    ).toBeNull();

    expect(
      shouldShowGeneratorContinuation({
        generatorType: "alien-race",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(true);
    expect(
      shouldShowGeneratorContinuation({
        generatorType: "alien-race",
        userGenerationSucceeded: false,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(false);
  });

  it("configures the tome, secret society, and world imports with GM-only lore and generation gates", () => {
    for (const [generatorType, entryType] of [
      ["tome", "Item entry"],
      ["secret-society", "Faction entry"],
      ["dark-fantasy-faction", "Faction entry"],
      ["nation", "Faction entry"],
      ["world", "Location entry"],
    ]) {
      const config = getGeneratorContinuationConfig(generatorType);
      expect(config).not.toBeNull();
      expect(config?.capabilities.join(" ")).toContain(entryType);
      expect(config?.capabilities.join(" ")).toContain("GM-only lore");
      expect(
        [config?.headline, config?.summary, ...(config?.capabilities ?? [])]
          .join(" ")
          .match(/[–—]/),
      ).toBeNull();
      expect(
        shouldShowGeneratorContinuation({
          generatorType,
          userGenerationSucceeded: true,
          isExampleDraft: false,
          isBusy: false,
          variant: "default",
        }),
      ).toBe(true);
      expect(
        shouldShowGeneratorContinuation({
          generatorType,
          userGenerationSucceeded: false,
          isExampleDraft: false,
          isBusy: false,
          variant: "default",
        }),
      ).toBe(false);
      expect(
        shouldShowGeneratorContinuation({
          generatorType,
          userGenerationSucceeded: true,
          isExampleDraft: true,
          isBusy: false,
          variant: "default",
        }),
      ).toBe(false);
    }
  });

  it("gates the holiday continuation on completed non-example generation", () => {
    expect(
      shouldShowGeneratorContinuation({
        generatorType: "holiday",
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(true);
    expect(
      shouldShowGeneratorContinuation({
        generatorType: "holiday",
        userGenerationSucceeded: false,
        isExampleDraft: false,
        isBusy: false,
        variant: "default",
      }),
    ).toBe(false);
  });

  it("configures the quest Event handoff near the result", () => {
    const config = getGeneratorContinuationConfig("quest");
    expect(config).toMatchObject({
      headline: "Keep this quest alive between sessions",
      placement: "near-result",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });
    expect(config?.summary).toContain("Event");
    expect(config?.capabilities.join(" ")).toContain("GM-only lore");
    expect(getGeneratorContinuationConfig("npc")?.placement).toBeUndefined();
  });

  it("configures the roster as one Note near the result, not a batch of Characters", () => {
    const roster = getGeneratorContinuationConfig("faction-roster");
    expect(roster).toMatchObject({
      headline: "Keep the faction's people in play",
      placement: "near-result",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });
    expect(roster?.summary).toContain("one Note");
    expect(roster?.capabilities.join(" ")).toContain("named connections");
  });

  it("configures the canonical RPG Item route without promising additional graph entries", () => {
    const config = getGeneratorContinuationConfig("item");
    expect(config).toMatchObject({
      headline: "Keep the find's history with the item",
      placement: "near-result",
      ctaLabel: "Add to my Codex",
      localFirstNotice: "No account needed; stored locally in this browser.",
    });
    expect(config?.summary).toContain("one Item");
    expect(config?.capabilities.join(" ")).toContain(
      "sections headed GM Reference Information or Magical Properties in GM reference",
    );
    expect(config?.capabilities.join(" ")).toContain(
      "AI headings can vary, so check the rendered document before sharing it",
    );
    for (const overrides of [
      {},
      { userGenerationSucceeded: false },
      { isExampleDraft: true },
      { isBusy: true },
    ]) {
      expect(
        shouldShowGeneratorContinuation({
          generatorType: "item",
          userGenerationSucceeded: true,
          isExampleDraft: false,
          isBusy: false,
          variant: "default",
          ...overrides,
        }),
      ).toBe(Object.keys(overrides).length === 0);
    }
  });

  it("returns null for Wave 2, names, and unknown generator types", () => {
    for (const type of [
      "point-crawl",
      "personality",
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
