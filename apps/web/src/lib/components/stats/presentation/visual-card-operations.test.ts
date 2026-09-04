import { describe, expect, it } from "vitest";
import type { VisualCard } from "./visual-card-parser";
import {
  createVisualCard,
  addVisualCard,
  updateCardColumns,
  updateTableHeader,
  updateCardTitle,
  removeVisualCard,
  addRowToCard,
  removeRowFromCard,
  addFieldToCardRow,
  removeFieldFromCardRow,
  addValueToTableRow,
  updateValueInTableRow,
  removeValueFromTableRow,
  moveCard,
  reorderCards,
  moveFieldBetweenRows,
} from "./visual-card-operations";

describe("visual-card-operations", () => {
  describe("createVisualCard & addVisualCard", () => {
    it("creates a default grid visual card", () => {
      const card = createVisualCard("grid", 0, () => "fixed-id");
      expect(card).toEqual({
        id: "fixed-id",
        title: "Section 1",
        columns: 2,
        mode: "grid",
        tableHeaders: undefined,
        rows: [[]],
      });
    });

    it("creates a table visual card with default table headers", () => {
      const card = createVisualCard("table", 2, () => "table-id");
      expect(card).toEqual({
        id: "table-id",
        title: "Table 3",
        columns: 2,
        mode: "table",
        tableHeaders: ["Stat / Item", "Value / Dice"],
        rows: [[]],
      });
    });

    it("adds a visual card to the existing list", () => {
      const initial: VisualCard[] = [createVisualCard("grid", 0, () => "c1")];
      const next = addVisualCard(initial, "table", () => "c2");
      expect(next).toHaveLength(2);
      expect(next[1].id).toBe("c2");
      expect(next[1].title).toBe("Table 2");
    });
  });

  describe("updateCardColumns", () => {
    it("updates columns for a grid card within valid range", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, mode: "grid", rows: [[]] },
      ];
      const updated = updateCardColumns(cards, "c1", 4);
      expect(updated[0].columns).toBe(4);
    });

    it("clamps columns between 1 and 6", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, mode: "grid", rows: [[]] },
      ];
      expect(updateCardColumns(cards, "c1", -5)[0].columns).toBe(1);
      expect(updateCardColumns(cards, "c1", 10)[0].columns).toBe(6);
      expect(updateCardColumns(cards, "c1", 0)[0].columns).toBe(1);
    });

    it("adjusts table headers and slices rows when updating table columns", () => {
      const tableCard: VisualCard = {
        id: "t1",
        title: "T1",
        columns: 2,
        mode: "table",
        tableHeaders: ["Col 1", "Col 2"],
        rows: [
          [
            { kind: "value", value: "a" },
            { kind: "value", value: "b" },
          ],
        ],
      };
      const expanded = updateCardColumns([tableCard], "t1", 3);
      expect(expanded[0].columns).toBe(3);
      expect(expanded[0].tableHeaders).toEqual(["Col 1", "Col 2", "Column 3"]);

      const shrunk = updateCardColumns([tableCard], "t1", 1);
      expect(shrunk[0].columns).toBe(1);
      expect(shrunk[0].tableHeaders).toEqual(["Col 1"]);
      expect(shrunk[0].rows[0]).toHaveLength(1);
    });

    it("returns unchanged cards if cardId does not match", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, mode: "grid", rows: [[]] },
      ];
      const updated = updateCardColumns(cards, "non-existent", 4);
      expect(updated).toEqual(cards);
    });
  });

  describe("updateTableHeader & updateCardTitle", () => {
    it("updates table header at specified index", () => {
      const cards: VisualCard[] = [
        {
          id: "t1",
          title: "T1",
          columns: 2,
          mode: "table",
          tableHeaders: ["H1", "H2"],
          rows: [[]],
        },
      ];
      const updated = updateTableHeader(cards, "t1", 1, "New H2");
      expect(updated[0].tableHeaders).toEqual(["H1", "New H2"]);
    });

    it("does not update headers for non-table cards or non-matching id", () => {
      const cards: VisualCard[] = [
        { id: "g1", title: "G1", columns: 2, mode: "grid", rows: [[]] },
      ];
      expect(updateTableHeader(cards, "g1", 0, "Val")).toEqual(cards);
      expect(updateTableHeader(cards, "missing", 0, "Val")).toEqual(cards);
    });

    it("ignores out-of-range header indices and normalizes headers to columns", () => {
      const cards: VisualCard[] = [
        {
          id: "t1",
          title: "T1",
          columns: 2,
          mode: "table",
          tableHeaders: ["H1", "H2", "H3"],
          rows: [[]],
        },
      ];
      expect(updateTableHeader(cards, "t1", -1, "Val")).toEqual(cards);
      expect(updateTableHeader(cards, "t1", 2, "Val")).toEqual(cards);

      const updated = updateTableHeader(cards, "t1", 0, "New H1");
      expect(updated[0].tableHeaders).toEqual(["New H1", "H2"]);
    });

    it("updates card title", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "Old Title", columns: 2, rows: [[]] },
      ];
      const updated = updateCardTitle(cards, "c1", "New Title");
      expect(updated[0].title).toBe("New Title");
      expect(updateCardTitle(cards, "c2", "Other")[0].title).toBe("Old Title");
    });
  });

  describe("removeVisualCard", () => {
    it("removes the card matching id", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, rows: [[]] },
        { id: "c2", title: "C2", columns: 2, rows: [[]] },
      ];
      const result = removeVisualCard(cards, "c1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("c2");
    });

    it("returns same items if id not found", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, rows: [[]] },
      ];
      expect(removeVisualCard(cards, "unknown")).toEqual(cards);
    });
  });

  describe("addRowToCard & removeRowFromCard", () => {
    it("adds an empty row to card", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, rows: [[]] },
      ];
      const updated = addRowToCard(cards, "c1");
      expect(updated[0].rows).toHaveLength(2);
      expect(updated[0].rows[1]).toEqual([]);
    });

    it("removes a row by index", () => {
      const cards: VisualCard[] = [
        {
          id: "c1",
          title: "C1",
          columns: 2,
          rows: [
            [{ kind: "field", fieldId: "hp" }],
            [{ kind: "field", fieldId: "ac" }],
          ],
        },
      ];
      const updated = removeRowFromCard(cards, "c1", 0);
      expect(updated[0].rows).toHaveLength(1);
      expect(updated[0].rows[0][0]).toEqual({ kind: "field", fieldId: "ac" });
    });

    it("preserves at least one empty row when last row is removed", () => {
      const cards: VisualCard[] = [
        {
          id: "c1",
          title: "C1",
          columns: 2,
          rows: [[{ kind: "field", fieldId: "hp" }]],
        },
      ];
      const updated = removeRowFromCard(cards, "c1", 0);
      expect(updated[0].rows).toEqual([[]]);
    });
  });

  describe("addFieldToCardRow & removeFieldFromCardRow", () => {
    it("adds a field cell to the specified row", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, rows: [[]] },
      ];
      const updated = addFieldToCardRow(cards, "c1", 0, "strength");
      expect(updated[0].rows[0]).toEqual([
        { kind: "field", fieldId: "strength" },
      ]);
    });

    it("enforces table column capacity limit when adding field", () => {
      const tableCard: VisualCard = {
        id: "t1",
        title: "T1",
        columns: 1,
        mode: "table",
        rows: [[{ kind: "value", value: "col1" }]],
      };
      const updated = addFieldToCardRow([tableCard], "t1", 0, "overflow");
      expect(updated[0].rows[0]).toHaveLength(1);
      expect(updated[0].rows[0][0]).toEqual({ kind: "value", value: "col1" });
    });

    it("removes the matching field from the row", () => {
      const cards: VisualCard[] = [
        {
          id: "c1",
          title: "C1",
          columns: 2,
          rows: [
            [
              { kind: "field", fieldId: "f1" },
              { kind: "field", fieldId: "f2" },
            ],
          ],
        },
      ];
      const updated = removeFieldFromCardRow(cards, "c1", 0, "f1");
      expect(updated[0].rows[0]).toEqual([{ kind: "field", fieldId: "f2" }]);
    });
  });

  describe("addValueToTableRow, updateValueInTableRow, removeValueFromTableRow", () => {
    it("adds value cell to table row when under capacity", () => {
      const card: VisualCard = {
        id: "t1",
        title: "T1",
        columns: 2,
        mode: "table",
        rows: [[]],
      };
      const updated = addValueToTableRow([card], "t1", 0);
      expect(updated[0].rows[0]).toEqual([{ kind: "value", value: "" }]);

      const fullCard: VisualCard = {
        id: "t1",
        title: "T1",
        columns: 1,
        mode: "table",
        rows: [[{ kind: "value", value: "existing" }]],
      };
      const notAdded = addValueToTableRow([fullCard], "t1", 0);
      expect(notAdded[0].rows[0]).toHaveLength(1);
    });

    it("updates value cell in table row", () => {
      const card: VisualCard = {
        id: "t1",
        title: "T1",
        columns: 2,
        mode: "table",
        rows: [[{ kind: "value", value: "old" }]],
      };
      const updated = updateValueInTableRow([card], "t1", 0, 0, "new");
      expect(updated[0].rows[0][0]).toEqual({ kind: "value", value: "new" });
    });

    it("removes value cell from table row", () => {
      const card: VisualCard = {
        id: "t1",
        title: "T1",
        columns: 2,
        mode: "table",
        rows: [
          [
            { kind: "value", value: "v1" },
            { kind: "value", value: "v2" },
          ],
        ],
      };
      const updated = removeValueFromTableRow([card], "t1", 0, 0);
      expect(updated[0].rows[0]).toEqual([{ kind: "value", value: "v2" }]);
    });

    it("does not mutate non-table (grid or undefined mode) cards", () => {
      const gridCard: VisualCard = {
        id: "g1",
        title: "G1",
        columns: 2,
        mode: "grid",
        rows: [[]],
      };
      expect(addValueToTableRow([gridCard], "g1", 0)).toEqual([gridCard]);
      expect(
        updateValueInTableRow([gridCard], "g1", 0, 0, "x"),
      ).toEqual([gridCard]);
      expect(removeValueFromTableRow([gridCard], "g1", 0, 0)).toEqual([
        gridCard,
      ]);

      const undefinedModeCard: VisualCard = {
        id: "u1",
        title: "U1",
        columns: 2,
        rows: [[{ kind: "value", value: "v1" }]],
      };
      expect(addValueToTableRow([undefinedModeCard], "u1", 0)).toEqual([
        undefinedModeCard,
      ]);
      expect(
        updateValueInTableRow([undefinedModeCard], "u1", 0, 0, "x"),
      ).toEqual([undefinedModeCard]);
      expect(
        removeValueFromTableRow([undefinedModeCard], "u1", 0, 0),
      ).toEqual([undefinedModeCard]);
    });
  });

  describe("moveCard & reorderCards", () => {
    it("moves card up or down within bounds", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, rows: [[]] },
        { id: "c2", title: "C2", columns: 2, rows: [[]] },
        { id: "c3", title: "C3", columns: 2, rows: [[]] },
      ];
      const movedDown = moveCard(cards, 0, 1);
      expect(movedDown.map((c) => c.id)).toEqual(["c2", "c1", "c3"]);

      const movedUp = moveCard(cards, 2, -1);
      expect(movedUp.map((c) => c.id)).toEqual(["c1", "c3", "c2"]);
    });

    it("returns unchanged array when moveCard is out of bounds", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, rows: [[]] },
      ];
      expect(moveCard(cards, 0, -1)).toEqual(cards);
      expect(moveCard(cards, 0, 1)).toEqual(cards);
    });

    it("returns unchanged array when moveCard index itself is out of bounds", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, rows: [[]] },
        { id: "c2", title: "C2", columns: 2, rows: [[]] },
      ];
      expect(moveCard(cards, -1, 1)).toEqual(cards);
      expect(moveCard(cards, cards.length, -1)).toEqual(cards);
      expect(moveCard(cards, cards.length, 1)).toEqual(cards);
    });

    it("reorders cards from drag index to drop index", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, rows: [[]] },
        { id: "c2", title: "C2", columns: 2, rows: [[]] },
        { id: "c3", title: "C3", columns: 2, rows: [[]] },
      ];
      const reordered = reorderCards(cards, 0, 2);
      expect(reordered.map((c) => c.id)).toEqual(["c2", "c3", "c1"]);
    });

    it("handles edge cases in reorderCards gracefully", () => {
      const cards: VisualCard[] = [
        { id: "c1", title: "C1", columns: 2, rows: [[]] },
      ];
      expect(reorderCards(cards, 0, 0)).toEqual(cards);
      expect(reorderCards(cards, -1, 0)).toEqual(cards);
      expect(reorderCards(cards, 0, 5)).toEqual(cards);
    });
  });

  describe("moveFieldBetweenRows", () => {
    it("moves a field from source card row to target card row", () => {
      const cards: VisualCard[] = [
        {
          id: "c1",
          title: "C1",
          columns: 2,
          rows: [[{ kind: "field", fieldId: "hp" }]],
        },
        { id: "c2", title: "C2", columns: 2, rows: [[]] },
      ];
      const result = moveFieldBetweenRows(cards, "c1", 0, "hp", "c2", 0);
      expect(result[0].rows[0]).toEqual([]);
      expect(result[1].rows[0]).toEqual([{ kind: "field", fieldId: "hp" }]);
    });

    it("moves a field within the same card across rows", () => {
      const cards: VisualCard[] = [
        {
          id: "c1",
          title: "C1",
          columns: 2,
          rows: [[{ kind: "field", fieldId: "ac" }], []],
        },
      ];
      const result = moveFieldBetweenRows(cards, "c1", 0, "ac", "c1", 1);
      expect(result[0].rows[0]).toEqual([]);
      expect(result[0].rows[1]).toEqual([{ kind: "field", fieldId: "ac" }]);
    });

    it("returns the same reference for cards that are neither source nor target", () => {
      const unrelatedCard: VisualCard = {
        id: "c3",
        title: "C3",
        columns: 2,
        rows: [[]],
      };
      const cards: VisualCard[] = [
        {
          id: "c1",
          title: "C1",
          columns: 2,
          rows: [[{ kind: "field", fieldId: "hp" }]],
        },
        { id: "c2", title: "C2", columns: 2, rows: [[]] },
        unrelatedCard,
      ];
      const result = moveFieldBetweenRows(cards, "c1", 0, "hp", "c2", 0);
      expect(result[2]).toBe(unrelatedCard);
    });
  });
});
