import { describe, expect, it } from "vitest";
import {
  avoidNamesExcludingContext,
  extractProperNouns,
  formatCampaignContextBlock,
  statesDeadline,
} from "./campaign-context";

const AURELIA_HOOK =
  "Broker a tense truce between striking miners on Amalthea and corporate " +
  "executives on Phobos-Zero before sabotage disables the station's primary " +
  "reaction mass pumps.";

describe("extractProperNouns", () => {
  it("keeps names that appear mid-sentence", () => {
    const nouns = extractProperNouns(AURELIA_HOOK);
    expect(nouns).toContain("Amalthea");
    expect(nouns).toContain("Phobos-Zero");
  });

  it("skips a plain capitalised word that only opens a sentence", () => {
    expect(
      extractProperNouns("Investigate the missing grain shipments."),
    ).not.toContain("Investigate");
  });

  it("keeps a distinctive token even at the start of a sentence", () => {
    expect(extractProperNouns("Aurelia-7 is starving.")).toContain("Aurelia-7");
  });

  it("keeps a multi-word name at the start of a sentence", () => {
    expect(extractProperNouns("Demeter Outpost went dark.")).toContain(
      "Demeter Outpost",
    );
  });

  it("returns nothing for text with no names", () => {
    expect(extractProperNouns("a crashed skycar in the undercity")).toEqual([]);
  });
});

describe("statesDeadline", () => {
  it("detects a 'before X happens' consequence", () => {
    expect(statesDeadline(AURELIA_HOOK)).toBe(true);
  });

  it("detects an explicit time window", () => {
    expect(statesDeadline("Recover the core within six hours.")).toBe(true);
  });

  it("is false for text with no stated pressure", () => {
    expect(statesDeadline("A crashed skycar in the undercity.")).toBe(false);
  });
});

describe("avoidNamesExcludingContext", () => {
  it("drops names the context itself introduced", () => {
    expect(
      avoidNamesExcludingContext(["Amalthea", "Kestrel Vane"], AURELIA_HOOK),
    ).toEqual(["Kestrel Vane"]);
  });

  it("drops a partial match of a context name", () => {
    expect(
      avoidNamesExcludingContext(
        ["Demeter"],
        "Grain moves through Demeter Outpost.",
      ),
    ).toEqual([]);
  });

  it("returns the list untouched when there is no context", () => {
    expect(avoidNamesExcludingContext(["Kestrel Vane"])).toEqual([
      "Kestrel Vane",
    ]);
  });
});

describe("formatCampaignContextBlock", () => {
  it("returns an empty string for empty input", () => {
    expect(formatCampaignContextBlock()).toBe("");
    expect(formatCampaignContextBlock("   ")).toBe("");
  });

  it("marks the context as outranking the form options", () => {
    const block = formatCampaignContextBlock("The Kestrel Reach is besieged.");
    expect(block).toContain("[HIGHEST PRIORITY — Campaign context");
    expect(block).toContain("this wins");
    expect(block).toContain("The Kestrel Reach is besieged.");
  });

  it("pins the names the context introduced", () => {
    const block = formatCampaignContextBlock(AURELIA_HOOK);
    expect(block).toContain("The names below are established");
    expect(block).toContain("Amalthea");
    expect(block).toContain("Phobos-Zero");
  });

  it("omits the name clause when the context names nothing", () => {
    const block = formatCampaignContextBlock("a damp underground place");
    expect(block).not.toContain("The names below are established");
  });
});

describe("avoid-list exclusion is wired into the prompt builders", () => {
  const context = "The strike on Amalthea has cut the Phobos-Zero supply line.";

  it("world does not ask the model to avoid a context name", async () => {
    const { buildWorldPrompt } = await import("./public-world");
    const msg = buildWorldPrompt({
      campaignContext: context,
      avoidNames: ["Amalthea", "Kestrel Vane"],
    }).userMessage;
    expect(msg).toContain("Kestrel Vane");
    expect(msg).not.toContain("campaign-specific names: Amalthea");
  });

  it("star system does not ask the model to avoid a context name", async () => {
    const { buildStarSystemPrompt } = await import("./public-star-system");
    const msg = buildStarSystemPrompt({
      campaignContext: context,
      avoidNames: ["Amalthea", "Kestrel Vane"],
    }).userMessage;
    expect(msg).toContain("Kestrel Vane");
    expect(msg).not.toContain("campaign-specific names: Amalthea");
  });

  it("dungeon does not list a context name as already used", async () => {
    const { buildDungeonPrompt } = await import("./public-dungeon");
    const msg = buildDungeonPrompt({
      campaignContext: context,
      avoidNames: ["Amalthea", "Kestrel Vane"],
    }).userMessage;
    const avoidSection = msg.slice(msg.indexOf("Already used elsewhere"));
    expect(avoidSection).toContain("Kestrel Vane");
    expect(avoidSection).not.toContain("- Amalthea\n");
  });

  it("adventure excludes names from context as well as from the seed", async () => {
    const { buildAdventurePrompt } = await import("./public-adventure");
    const msg = buildAdventurePrompt({
      campaignContext: context,
      avoidNames: ["Amalthea", "Kestrel Vane"],
    }).userMessage;
    const avoidSection = msg.slice(msg.indexOf("Already used elsewhere"));
    expect(avoidSection).toContain("Kestrel Vane");
    expect(avoidSection).not.toContain("- Amalthea\n");
  });
});
