import { describe, it, expect } from "vitest";
import { howDoIOrganiseATalesOfTheValiantCampaign } from "./how-do-i-organise-a-tales-of-the-valiant-campaign";

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
  });

  it("uses British English spellings and avoids American travel conjugations", () => {
    const serialized = JSON.stringify(howDoIOrganiseATalesOfTheValiantCampaign);
    expect(serialized).toContain("organise");
    expect(serialized).not.toContain("organize");
    expect(serialized).not.toContain("traveled");
    expect(serialized).not.toContain("traveling");
  });
});
