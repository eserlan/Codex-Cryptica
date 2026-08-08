import { describe, expect, it } from "vitest";
import { buildWorldPrompt } from "./public-world";
import { buildStarSystemPrompt } from "./public-star-system";
import { buildAdventurePrompt } from "./public-adventure";
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

describe("prompt builders do not contradict the context block", () => {
  // The block tells the model that names the user introduced are established
  // and must be kept. Any generator that also emits an avoid-list has to drop
  // those names from it, or the prompt argues with itself.
  const CONTEXT =
    "The crew answers to Kestrel Vane aboard the Aurelia-7 before the Dominion arrives.";

  it("world omits context names from its avoid list", () => {
    const prompt = buildWorldPrompt({
      themeId: "scifi",
      campaignContext: CONTEXT,
      avoidNames: ["Kestrel Vane", "Unrelated Name"],
    });

    expect(prompt.userMessage).toContain("Unrelated Name");
    expect(prompt.userMessage).not.toContain(
      "campaign-specific names: Kestrel Vane",
    );
  });

  it("star system omits context names from its avoid list", () => {
    const prompt = buildStarSystemPrompt({
      themeId: "scifi",
      campaignContext: CONTEXT,
      avoidNames: ["Aurelia-7", "Unrelated Name"],
    });

    const restriction =
      prompt.userMessage.match(/campaign-specific names: ([^.]*)/)?.[1] ?? "";
    expect(restriction).toContain("Unrelated Name");
    expect(restriction).not.toContain("Aurelia-7");
  });

  it("adventure omits context names from its avoid list, not just seed names", () => {
    const prompt = buildAdventurePrompt({
      themeId: "scifi",
      campaignContext: CONTEXT,
      avoidNames: ["Kestrel Vane", "Unrelated Name"],
    });

    expect(prompt.userMessage).toContain("Unrelated Name");
    expect(prompt.userMessage).not.toMatch(/^- Kestrel Vane$/m);
  });
});
