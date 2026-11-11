import { describe, expect, it } from "vitest";
import {
  AdventureSelectionError,
  selectAdventureForPlay,
  type SelectedAdventureForPlay,
} from "../src/adventure-play-selection";
import { generateAdventureLocal } from "../src/public-adventure";

function seededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("selectAdventureForPlay", () => {
  it("parses a system-neutral fantasy adventure generated locally into a strictly separated player/GM record", () => {
    const draft = generateAdventureLocal(
      { themeId: "fantasy", genre: "Classic Fantasy" },
      seededRng(42),
    );

    const selected: SelectedAdventureForPlay = selectAdventureForPlay(
      draft,
      "source-rec-1",
      "manual-scenario-1",
    );

    expect(selected.origin.kind).toBe("manual");
    expect(selected.origin.manualId).toBe("manual-scenario-1");
    expect(selected.origin.sourceRecordId).toBe("source-rec-1");

    // Player-safe fields
    expect(selected.playerVisible.title).toBe(draft.title);
    expect(selected.playerVisible.openingSituation.length).toBeGreaterThan(0);
    expect(selected.playerVisible.openingSituation.length).toBeLessThanOrEqual(
      600,
    );
    expect(selected.playerVisible.primaryObjective.length).toBeGreaterThan(0);
    expect(selected.playerVisible.primaryObjective.length).toBeLessThanOrEqual(
      600,
    );
    expect(
      selected.playerVisible.startingLocations.length,
    ).toBeGreaterThanOrEqual(1);

    // GM-only fields
    expect(selected.gmOnly.truth.length).toBeGreaterThan(0);
    expect(selected.gmOnly.truth.length).toBeLessThanOrEqual(600);
    expect(selected.gmOnly.ifInvestigated.length).toBeGreaterThan(0);
    expect(selected.gmOnly.ifInvestigated.length).toBeLessThanOrEqual(600);
    expect(selected.gmOnly.npcsAndFactions.length).toBeGreaterThanOrEqual(1);

    // Strict Secrecy: secrets, threats, and complications must NEVER appear in playerVisible
    expect(selected.playerVisible.openingSituation).not.toContain(
      "Threats & Antagonists",
    );
    expect(selected.playerVisible.openingSituation).not.toContain(
      "Clues, Secrets & Discoveries",
    );
    expect(selected.playerVisible.openingSituation).not.toContain(
      "Complications",
    );
    expect(selected.playerVisible.primaryObjective).not.toContain(
      "Threats & Antagonists",
    );
    expect(selected.playerVisible.primaryObjective).not.toContain(
      "Clues, Secrets & Discoveries",
    );
    expect(selected.playerVisible.primaryObjective).not.toContain(
      "Complications",
    );
  });

  it("parses a sci-fi/horror adventure fixture without secret leakage", () => {
    const draft = generateAdventureLocal(
      { themeId: "horror", genre: "Cosmic Horror" },
      seededRng(77),
    );

    const selected = selectAdventureForPlay(draft);

    expect(selected.origin.kind).toBe("manual");
    expect(typeof selected.origin.manualId).toBe("string");
    expect(selected.origin.manualId.length).toBeGreaterThan(0);
    expect(selected.playerVisible.title).toBe(draft.title);
    expect(selected.playerVisible.startingLocations.length).toBeGreaterThan(0);
    expect(selected.gmOnly.npcsAndFactions.length).toBeGreaterThan(0);

    // Player-visible content matches the initial situation and objective
    expect(draft.content).toContain(selected.playerVisible.openingSituation);
    expect(draft.content).toContain(selected.playerVisible.primaryObjective);

    // Truth and investigated notes remain secluded in gmOnly
    expect(selected.gmOnly.truth).not.toEqual(
      selected.playerVisible.openingSituation,
    );
    expect(selected.gmOnly.truth.length).toBeLessThanOrEqual(600);
    expect(selected.gmOnly.ifInvestigated.length).toBeLessThanOrEqual(600);
  });

  it("bounds long text fields to <= 600 characters for scenario schema compatibility", () => {
    const longProse = "A".repeat(800);
    const draft = {
      title: "The Endless Spire",
      content: [
        "## Initial Situation",
        longProse,
        "## Primary Objective & Pressure",
        longProse,
        "## Key Locations",
        "- The High Spire",
        "- The Sunken Catacombs",
        "## Important NPCs & Factions",
        "- Archmage Vane",
        "## Threats & Antagonists",
        longProse,
        "## Clues, Secrets & Discoveries",
        longProse,
      ].join("\n\n"),
      lore: [
        "### Complications & Escalating Pressures",
        longProse,
        "### Rewards & Stakes",
        longProse,
        "### Possible Outcomes",
        longProse,
        "### Adventure Hooks",
        "- A message arrives by raven",
      ].join("\n\n"),
    };

    const selected = selectAdventureForPlay(draft, undefined, "custom-id");

    expect(selected.playerVisible.openingSituation.length).toBeLessThanOrEqual(
      600,
    );
    expect(selected.playerVisible.primaryObjective.length).toBeLessThanOrEqual(
      600,
    );
    expect(selected.gmOnly.truth.length).toBeLessThanOrEqual(600);
    expect(selected.gmOnly.ifInvestigated.length).toBeLessThanOrEqual(600);
    expect(selected.playerVisible.startingLocations).toEqual([
      "The High Spire",
      "The Sunken Catacombs",
    ]);
    expect(selected.gmOnly.npcsAndFactions).toEqual(["Archmage Vane"]);
  });

  it("bounds a long adventure title to the scenario text limit", () => {
    const draft = generateAdventureLocal(
      { themeId: "fantasy", genre: "Classic Fantasy" },
      seededRng(42),
    );
    const selected = selectAdventureForPlay({
      ...draft,
      title: "A".repeat(601),
    });

    expect(selected.playerVisible.title).toHaveLength(600);
    expect(selected.playerVisible.title.endsWith("…")).toBe(true);
  });

  it("throws invalid-adventure-draft when title, content or lore are missing", () => {
    expect(() =>
      selectAdventureForPlay({ title: "", content: "abc", lore: "def" }),
    ).toThrow(AdventureSelectionError);

    expect(() =>
      selectAdventureForPlay({
        title: "Test",
        content: undefined as unknown as string,
        lore: "def",
      }),
    ).toThrow(AdventureSelectionError);

    try {
      selectAdventureForPlay({ title: "  ", content: "x", lore: "y" });
    } catch (e) {
      expect(e).toBeInstanceOf(AdventureSelectionError);
      expect((e as AdventureSelectionError).reason).toBe(
        "invalid-adventure-draft",
      );
    }
  });

  it("throws missing-player-section when Initial Situation or Primary Objective are absent", () => {
    const draftWithoutObjective = {
      title: "Broken Road",
      content: [
        "## Initial Situation",
        "The bridge is broken.",
        "## Key Locations",
        "- Old Crossing",
        "## Threats & Antagonists",
        "- River bandits",
        "## Clues, Secrets & Discoveries",
        "- A lost map",
      ].join("\n\n"),
      lore: [
        "### Complications & Escalating Pressures",
        "- High water",
        "### Possible Outcomes",
        "- Bridge repaired",
      ].join("\n\n"),
    };

    try {
      selectAdventureForPlay(draftWithoutObjective);
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AdventureSelectionError);
      expect((e as AdventureSelectionError).reason).toBe(
        "missing-player-section",
      );
    }
  });

  it("throws missing-gm-section when Threats or Outcomes are missing", () => {
    const draftWithoutGM = {
      title: "Broken Road",
      content: [
        "## Initial Situation",
        "The bridge is broken.",
        "## Primary Objective & Pressure",
        "Cross before nightfall.",
        "## Key Locations",
        "- Old Crossing",
      ].join("\n\n"),
      lore: ["### Complications & Escalating Pressures", "- High water"].join(
        "\n\n",
      ),
    };

    try {
      selectAdventureForPlay(draftWithoutGM);
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AdventureSelectionError);
      expect((e as AdventureSelectionError).reason).toBe("missing-gm-section");
    }
  });
  it("uses the injected idGenerator when manualId is absent", () => {
    const draft = generateAdventureLocal(
      { themeId: "fantasy", genre: "Classic Fantasy" },
      seededRng(42),
    );

    let calls = 0;
    const mockedIdGenerator = {
      uuid: () => {
        calls++;
        return "mocked-uuid-42";
      },
    };

    const selected = selectAdventureForPlay(
      draft,
      undefined,
      undefined,
      mockedIdGenerator,
    );

    expect(calls).toBe(1);
    expect(selected.origin.manualId).toBe("mocked-uuid-42");
  });
});
