import { describe, expect, it } from "vitest";
import { getGenerator } from "./campaign-generator-registry";
import { generateCampaignMysteryWithAI } from "./campaign-mystery-generation";

describe("campaign mystery generation", () => {
  it("keeps user instructions and selected vault context in the one-pass fallback", async () => {
    const sent: string[] = [];
    const draft = await generateCampaignMysteryWithAI(
      {
        complete: async (prompt) => {
          sent.push(prompt);
          return JSON.stringify({
            title: "The Silent Relay",
            summary: "A missing technician left a disputed signal log.",
            content: "## Opening Hook\nThe relay stopped at midnight.",
            lore: "## GM-Only Truth\nThe operator altered the record.",
            labels: ["mystery", "investigation"],
          });
        },
      },
      getGenerator("mystery-investigation"),
      {
        generatorId: "mystery-investigation",
        options: { staged: false, genre: "Science Fiction" },
        useAI: true,
        themeId: "science-fiction",
        instructions: "Tie the clues to the broken relay at Nacre Station.",
        vaultContext: {
          themeName: "Science Fiction",
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [
            {
              id: "station",
              title: "Nacre Station",
              type: "location",
              contentExcerpt:
                "A remote relay station at the edge of settled space.",
            },
          ],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      },
      new Set(),
    );

    expect(draft?.title).toBe("The Silent Relay");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain(
      "Tie the clues to the broken relay at Nacre Station.",
    );
    expect(sent[0]).toContain(
      "A remote relay station at the edge of settled space.",
    );
  });
});
