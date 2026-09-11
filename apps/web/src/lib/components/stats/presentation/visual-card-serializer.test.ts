import { describe, expect, it } from "vitest";
import { syncSourceFromVisualCards } from "./visual-card-serializer";
import type { VisualCard } from "./visual-card-parser";

describe("syncSourceFromVisualCards", () => {
  it("serializes a table card to a markdown table", () => {
    const cards: VisualCard[] = [
      {
        id: "1",
        title: "Characteristics",
        mode: "table",
        columns: 2,
        tableHeaders: ["STR", "DEX"],
        rows: [
          [
            { kind: "field", fieldId: "str" },
            { kind: "field", fieldId: "dex" },
          ],
        ],
      },
    ];

    const source = syncSourceFromVisualCards(cards, [], {});

    expect(source).toContain("### Characteristics");
    expect(source).toContain("| STR | DEX |");
    expect(source).toContain("| --- | --- |");
    expect(source).toContain("| [str] | [dex] |");
  });

  it("serializes a grid card to a markdown card", () => {
    const cards: VisualCard[] = [
      {
        id: "2",
        title: "Stats",
        mode: "grid",
        columns: 2,
        rows: [
          [
            { kind: "field", fieldId: "hp" },
            { kind: "field", fieldId: "mp" },
          ],
        ],
      },
    ];

    const source = syncSourceFromVisualCards(cards, [], {});

    expect(source).toContain("### Stats");
    expect(source).toContain(":::card");
    expect(source).toContain(":::stat-group columns=2");
    expect(source).toContain("[hp]");
    expect(source).toContain("[mp]");
  });

  it("applies field display overrides correctly", () => {
    const cards: VisualCard[] = [
      {
        id: "3",
        title: "Health",
        mode: "grid",
        columns: 1,
        rows: [[{ kind: "field", fieldId: "hp" }]],
      },
    ];

    const schemaFields = [{ id: "hp", type: "number", label: "HP" }];

    const overrides = {
      hp: { displayMode: "progress", hideLabel: true },
    };

    const source = syncSourceFromVisualCards(
      cards,
      schemaFields as any,
      overrides,
    );
    expect(source).toContain('{{stat.hp display="progress" hide-label}}');
  });

  it("omits markdown heading line when table card title is blank or whitespace", () => {
    const cards: VisualCard[] = [
      {
        id: "4",
        title: "",
        mode: "table",
        columns: 2,
        tableHeaders: ["Item", "Notes"],
        rows: [[{ kind: "field", fieldId: "hp" }]],
      },
    ];

    const source = syncSourceFromVisualCards(cards, [], {});
    expect(source).not.toContain("###");
    expect(source).toContain("| Item | Notes |");
    expect(source).toContain("| [hp] | - |");
  });

  it("omits markdown heading line when grid card title is blank or whitespace", () => {
    const cards: VisualCard[] = [
      {
        id: "5",
        title: "   ",
        mode: "grid",
        columns: 2,
        rows: [[{ kind: "field", fieldId: "hp" }]],
      },
    ];

    const source = syncSourceFromVisualCards(cards, [], {});
    expect(source).not.toContain("###");
    expect(source).toContain(":::card");
  });
});
