import { describe, it, expect } from "vitest";
import { howDoIOrganiseATalesOfTheValiantCampaign } from "./how-do-i-organise-a-tales-of-the-valiant-campaign";
import { howDoIOrganiseADndCampaign } from "./how-do-i-organise-a-dnd-campaign";
import { howDoYouOrganiseRpgCampaignNotes } from "./how-do-you-organise-rpg-campaign-notes";
import { howDoYouKeepTrackOfNpcsInALongCampaign } from "./how-do-you-keep-track-of-npcs-in-a-long-campaign";
import { howDoYouTrackUnresolvedPlotHooksInAnRpgCampaign } from "./how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign";

describe("howDoIOrganiseATalesOfTheValiantCampaign answer", () => {
  it("defines valid answer configuration with required minimum length", () => {
    expect(howDoIOrganiseATalesOfTheValiantCampaign.slug).toBe(
      "how-do-i-organise-a-tales-of-the-valiant-campaign",
    );
    expect(howDoIOrganiseATalesOfTheValiantCampaign.category).toBe(
      "campaign-notes",
    );
    expect(
      howDoIOrganiseATalesOfTheValiantCampaign.shortAnswer.length,
    ).toBeGreaterThanOrEqual(140);
  });

  it("contains zero em dashes, zero en dashes, and zero emojis in all text content", () => {
    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);
    // Disallow em dash (U+2014) and en dash (U+2013)
    expect(serialized).not.toContain("\u2014");
    expect(serialized).not.toContain("\u2013");
    // Disallow emojis
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(serialized)).toBe(false);
  });

  it("includes at least 3 sections with a worked example and a checklist", () => {
    const { sections } = howDoIOrganiseATalesOfTheValiantCampaign;
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections.some((s) => s.kind === "example")).toBe(true);
    expect(sections.some((s) => s.kind === "checklist")).toBe(true);
    expect(JSON.stringify(sections)).not.toContain("five-minute loop");
  });

  it("covers the comparison table and names ToV spell sources accurately", () => {
    const comparison = howDoIOrganiseATalesOfTheValiantCampaign.sections.find(
      (section) => section.kind === "table",
    );

    expect(comparison).toBeDefined();
    if (!comparison || comparison.kind !== "table") return;

    expect(comparison.headers).toEqual([
      "Campaign layer",
      "Standard 5e habit",
      "Tales of the Valiant organisation",
    ]);
    expect(comparison.rows).toContainEqual([
      "Between-session party state",
      "Track hit points, spell slots and exhaustion; Inspiration is binary and rarely persists in notes.",
      "Record each character's current Luck (0 to 5) at session end, plus the campaign's chosen Long Rest Luck rule so next week's opening encounter starts with accurate pools.",
    ]);
    expect(comparison.rows).toContainEqual([
      "Boss and lieutenant prep",
      "Copy a stat block with static Legendary Actions and Legendary Resistances.",
      "Attach a specific Doom pool and two or three named Doom actions to the adversary's card or token, keeping Doom scoped to that creature rather than a shared GM pool.",
    ]);

    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);
    expect(serialized).toContain(
      "four primary spell sources (Arcane, Divine, Primordial or Wyrd)",
    );
    expect(serialized).not.toContain("spell circles");
  });

  it("qualifies Luck rests and avoids claiming unavailable profile or import flows", () => {
    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);

    expect(serialized).toContain("resting variant");
    expect(serialized).toContain("update each counter manually");
    expect(serialized).toContain(
      "vault-wide profile selection is not currently available",
    );
    expect(serialized).not.toContain("TovChargen Import");
    expect(serialized).not.toContain(
      "Luck resets to a character's starting value",
    );
  });

  it("limits offline claims and has reciprocal related-answer links", () => {
    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);
    expect(serialized).toContain("remain available offline");
    expect(serialized).toContain("require the AI Lore Co-Author");
    expect(serialized).toContain("produce system-neutral lore and notes");
    expect(serialized).not.toContain("run sessions entirely offline");

    const slug = howDoIOrganiseATalesOfTheValiantCampaign.slug;
    for (const answer of [
      howDoIOrganiseADndCampaign,
      howDoYouOrganiseRpgCampaignNotes,
      howDoYouKeepTrackOfNpcsInALongCampaign,
      howDoYouTrackUnresolvedPlotHooksInAnRpgCampaign,
    ]) {
      expect(answer.relatedAnswers).toContain(slug);
    }
  });

  it("uses British English spellings and avoids American travel conjugations", () => {
    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);
    expect(serialized).toContain("organise");
    expect(serialized).not.toContain("organize");
    expect(serialized).not.toContain("traveled");
    expect(serialized).not.toContain("traveling");
  });
});
