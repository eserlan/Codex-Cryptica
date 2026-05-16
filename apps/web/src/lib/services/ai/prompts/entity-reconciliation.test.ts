import { describe, expect, it } from "vitest";
import { buildEntityReconciliationPrompt } from "./entity-reconciliation";

describe("buildEntityReconciliationPrompt", () => {
  it("allows richer markdown output for reconciled records", () => {
    const prompt = buildEntityReconciliationPrompt(
      {
        id: "szass-tam",
        title: "Szass Tam",
        type: "npc",
        content: "Old chronicle",
        lore: "Old lore",
      } as any,
      {
        chronicle: "New chronicle",
        lore: "New lore",
      },
      [
        {
          title: "Thay",
          type: "location",
          relation: "rules",
          summary:
            "A dread realm ruled through necromancy and political terror.",
        },
      ],
    );

    expect(prompt).toContain("Markdown usage differs by field");
    expect(prompt).toContain("Chronicle: prose only");
    expect(prompt).toContain("short section headings");
    expect(prompt).toContain("bold emphasis");
    expect(prompt).toContain("bullet lists");
    expect(prompt).toContain(
      "Make the lore richer and more complete when the source material supports it.",
    );
    expect(prompt).toContain(
      "Only integrate incoming details that directly reveal new information about Szass Tam",
    );
    expect(prompt).toContain("Preserve named developments, power shifts");
    expect(prompt).toContain("RELATED ENTITY CONTEXT:");
    expect(prompt).toContain("Thay (location) [rules]");
  });

  it("asks for a category only when allowed categories are provided", () => {
    const prompt = buildEntityReconciliationPrompt(
      {
        id: "glass-key",
        title: "The Glass Key",
        type: "note",
        content: "",
        lore: "",
      } as any,
      {
        chronicle: "A crystalline archive key.",
        lore: "It opens sealed memory vaults.",
      },
      [],
      [
        { id: "note", label: "Note" },
        { id: "item", label: "Item" },
      ],
    );

    expect(prompt).toContain("ALLOWED CATEGORIES:");
    expect(prompt).toContain("- item (Item)");
    expect(prompt).toContain(
      "based on the final reconciled chronicle and lore",
    );
    expect(prompt).toContain('"categoryId": "one allowed category id"');
  });
});
