import { describe, expect, it } from "vitest";
import { getGenerator } from "./campaign-generator-registry";
import { generateCampaignMysteryWithAI } from "./campaign-mystery-generation";

describe("campaign mystery generation", () => {
  it("keeps the stall-recovery table in Lore when staged generation falls back to one-pass", async () => {
    const sent: string[] = [];
    const onePass = JSON.stringify({
      title: "The Silent Relay",
      summary: "A missing technician left a disputed signal log.",
      content: "## Opening Hook\nThe relay stopped at midnight.",
      lore: `## GM-Only Truth\nThe operator altered the record.\n\n## If the Investigation Stalls: Next NPC Moves\n| Actor | Trigger | Next Move | Observable Consequence | Testable Lead |\n|---|---|---|---|---|\n| The operator | The investigation stalls | Moves a copied record | A clerk notices a disturbed shelf | Check the archive log |`,
    });
    const draft = await generateCampaignMysteryWithAI(
      {
        complete: async (prompt) => {
          sent.push(prompt);
          return prompt.includes("Create a playable, system-neutral mystery")
            ? onePass
            : "{}";
        },
      },
      getGenerator("mystery-investigation"),
      {
        generatorId: "mystery-investigation",
        options: { genre: "Science Fiction" },
        useAI: true,
        themeId: "science-fiction",
        vaultContext: {
          themeName: "Science Fiction",
          categoryLabels: [],
          applyTemplate: false,
          neighbors: [],
          worldSample: [],
          existingTitles: [],
          labelSuggestions: [],
          includedContext: [],
        },
      },
      new Set(),
    );

    expect(draft?.lore).toContain("If the Investigation Stalls");
    expect(draft?.lore).toContain(
      "| The operator | The investigation stalls |",
    );
    expect(sent.some((prompt) => prompt.includes("STAGE 1 OF 7"))).toBe(true);
    expect(
      sent.some((prompt) =>
        prompt.includes("Create a playable, system-neutral mystery"),
      ),
    ).toBe(true);
  });

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
            lore: `## GM-Only Truth\nThe operator altered the record.\n\n## If the Investigation Stalls: Next NPC Moves\n| Actor | Trigger | Next Move | Observable Consequence | Testable Lead |\n|---|---|---|---|---|\n| The operator | The investigation stalls | Moves a copied record | A clerk notices a disturbed shelf | Check the archive log |`,
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
