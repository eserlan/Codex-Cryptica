import { describe, expect, it } from "vitest";
import { parseCardsFromSource } from "./visual-card-parser";

describe("parseCardsFromSource", () => {
  it("keeps the title of a Markdown-heading table after it becomes a section", () => {
    const cards = parseCardsFromSource(
      "### Characteristics\n\n| STR | DEX |\n| --- | --- |\n| [str] | [dex] |",
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      title: "Characteristics",
      mode: "table",
      tableHeaders: ["STR", "DEX"],
    });
  });

  it("preserves intentionally blank table title without restoring default name", () => {
    const cards = parseCardsFromSource(
      "| STR | DEX |\n| --- | --- |\n| [str] | [dex] |",
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      title: "",
      mode: "table",
      tableHeaders: ["STR", "DEX"],
    });
  });

  it("preserves intentionally blank card title without restoring default name", () => {
    const cards = parseCardsFromSource(
      ":::card\n:::stat-group columns=2\n[hp]\n[mp]\n:::\n:::",
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      title: "",
      mode: "grid",
    });
  });

  it("preserves untitled continuation blocks following a titled section", () => {
    const cards = parseCardsFromSource(
      "### Primary Stats\n\n| STR | DEX |\n| --- | --- |\n| [str] | [dex] |\n\n| INT | WIS |\n| --- | --- |\n| [int] | [wis] |",
    );

    expect(cards).toHaveLength(2);
    expect(cards[0].title).toBe("Primary Stats");
    expect(cards[1].title).toBe("");
  });

  it("extracts formatted text from headings without formatting artifacts", () => {
    const cards = parseCardsFromSource(
      "### **Attributes**\n\n| STR | DEX |\n| --- | --- |\n| [str] | [dex] |",
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("Attributes");
  });

  it("generates starter cards only when source is empty", () => {
    const schemaFields = [
      { id: "hp", label: "Hit Points", type: "counter" as const },
    ];
    const cardsFromEmpty = parseCardsFromSource("", schemaFields);
    expect(cardsFromEmpty).toHaveLength(1);
    expect(cardsFromEmpty[0].title).toBe("Overview");

    const cardsFromCustomUntitled = parseCardsFromSource(
      "| STR |\n| --- |\n| [str] |",
      schemaFields,
    );
    expect(cardsFromCustomUntitled).toHaveLength(1);
    expect(cardsFromCustomUntitled[0].title).toBe("");
  });
});
