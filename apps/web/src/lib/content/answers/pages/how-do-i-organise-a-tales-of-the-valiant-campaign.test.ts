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
    expect(JSON.stringify(sections)).not.toContain("five minutes");
    expect(JSON.stringify(sections)).toContain(
      "The Doom is an encounter resource that can help any creature in the encounter",
    );
  });

  it("uses an organisation table without caricaturing baseline 5e", () => {
    const comparison = howDoIOrganiseATalesOfTheValiantCampaign.sections.find(
      (section) => section.kind === "table",
    );

    expect(comparison).toBeDefined();
    if (!comparison || comparison.kind !== "table") return;

    expect(comparison.headers).toEqual(["Campaign layer", "What to record"]);
    expect(comparison.rows).toContainEqual([
      "Session journal",
      "What happened, what the players decided, and changes to promote to campaign pages. The journal is the archive; it is not the run sheet.",
    ]);

    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);
    expect(serialized).toContain("not a prescribed ToV plot");
    expect(serialized).not.toContain(
      "tiered Martial, Magic and Technical talents",
    );
  });

  it("keeps Luck and Doom claims aligned with the BFRD and current UI", () => {
    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);

    expect(serialized).toContain("starts with 0 Luck");
    expect(serialized).toContain(
      "Once per turn, a failed attack roll or failed save grants 1 Luck",
    );
    expect(serialized).toContain(
      "immediately roll a d4 and reset their total to that result",
    );
    expect(serialized).toContain(
      "3 Luck can reroll a d20 immediately after a check",
    );
    expect(serialized).toContain("do not prescribe a Long Rest reset");
    expect(serialized).toContain("based on encounter CR");
    expect(serialized).toContain("Doom can affect creatures in that encounter");
    expect(serialized).toContain("house rules");
    expect(serialized).not.toContain("replace Legendary Resistance with Doom");
    expect(serialized).not.toContain("Doom points are strictly scoped");
    expect(serialized).not.toContain("roll 1d4 on a Long Rest");
    expect(serialized).not.toContain("resting variant");
    expect(serialized).toContain(
      "vault-wide profile selection is not currently available",
    );
    expect(serialized).not.toContain("TovChargen Import");
  });

  it("connects character identity and motivation to playable campaign threads", () => {
    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);
    expect(serialized).toContain(
      "Lineage, Heritage, Background and Adventuring Motivation",
    );
    expect(serialized).toContain("river-port contacts");
    expect(serialized).toContain(
      "The necromancer's bone-splinter teleport and reaction hex are invented homebrew abilities",
    );
    expect(serialized).toContain(
      "that new point cannot affect the missed attack",
    );
    expect(serialized).toContain("the reroll can still fail");
  });

  it("limits offline claims and has reciprocal related-answer links", () => {
    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);
    expect(serialized).toContain("are available offline");
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
