import { describe, expect, it, vi } from "vitest";
import {
  buildFilteredRows,
  buildImageAssignments,
  buildImportedTable,
  findUnmatchedImages,
  nextUniqueName,
  splitCard,
  updateColumnMapping,
} from "./import-wizard-logic";

const existingTable = () => ({
  id: "table-id",
  name: "Existing",
  kind: "table" as const,
  labels: [],
  selection: { mode: "weighted" as const },
  entries: [{ id: "old", text: "old result", weight: 1 }],
});

const tableBuildInput = (
  target: ReturnType<typeof existingTable>,
  collision: "merge" | "replace" | "new",
) => ({
  mode: "ranged" as const,
  entries: [{ id: "new", text: "result", weight: 1 }],
  target,
  collision,
  name: "Existing",
  createSource: (name: string) => ({ ...target, id: "created", name }),
  uniqueName: (name: string) => `${name} 2`,
});

describe("ImportWizard logic", () => {
  it("splits card text and builds only nonempty, non-skipped entries with fresh ids", () => {
    expect(splitCard("The Tower\tSudden ruin.")).toEqual({
      title: "The Tower",
      body: "Sudden ruin.",
    });
    const uuid = vi.fn(() => "fresh-id");
    const rows = buildFilteredRows(
      [
        { entry: { id: "old", text: "kept", weight: 1 } },
        { entry: { id: "skip", text: "skip", weight: 1 } },
        { entry: { id: "blank", text: "  ", weight: 1 } },
      ],
      { 1: { skipped: true } },
      uuid,
    );
    expect(rows).toEqual([
      { rowIndex: 0, entry: { id: "fresh-id", text: "kept", weight: 1 } },
    ]);
    expect(uuid).toHaveBeenCalledTimes(1);
  });

  it("applies manual image choices exclusively and reports unmatched images", () => {
    const files = ["tower.png", "star.png"].map(
      (name) => new File(["x"], name, { type: "image/png" }),
    );
    const cards = [
      { id: "1", title: "Tower", body: "" },
      { id: "2", title: "Star", body: "" },
    ];
    const assignments = buildImageAssignments(cards, files, [4, 5], {
      4: 1,
      5: -1,
    });
    expect(assignments[0]).toEqual({ fileIndex: 1, method: "chosen" });
    expect(assignments[1]).toBeUndefined();
    expect(findUnmatchedImages(files, assignments)).toEqual([
      { file: files[0], index: 0 },
    ]);
  });

  it("maintains exclusive range/weight mapping and chooses an unused name", () => {
    expect(
      updateColumnMapping({ text: 0, weight: 2 }, undefined, "range", 1),
    ).toEqual({ text: 0, range: 1 });
    expect(
      updateColumnMapping({ text: 0, range: 1 }, undefined, "range", undefined),
    ).toEqual({ text: 0 });
    expect(nextUniqueName("Deck", (name) => name === "Deck 2")).toBe("Deck 3");
  });

  it("merges imported entries while preserving the existing table", () => {
    const target = existingTable();
    const merged = buildImportedTable(tableBuildInput(target, "merge"));
    expect(merged.entries).toHaveLength(2);
    expect(merged.selection).toEqual(target.selection);
  });

  it("replaces entries and selection when requested", () => {
    const replaced = buildImportedTable(
      tableBuildInput(existingTable(), "replace"),
    );
    expect(replaced).toMatchObject({
      entries: [{ id: "new", text: "result", weight: 1 }],
      selection: { mode: "ranged", die: { sides: 1 } },
    });
  });

  it("creates a uniquely named table when the collision choice is new", () => {
    const createSource = vi.fn((name: string) => ({
      ...existingTable(),
      id: "created",
      name,
    }));
    const input = tableBuildInput(existingTable(), "new");
    input.createSource = createSource;
    expect(buildImportedTable(input)).toMatchObject({
      id: "created",
      name: "Existing 2",
    });
    expect(createSource).toHaveBeenCalledWith("Existing 2");
  });
});
