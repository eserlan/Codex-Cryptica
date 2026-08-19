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
});
