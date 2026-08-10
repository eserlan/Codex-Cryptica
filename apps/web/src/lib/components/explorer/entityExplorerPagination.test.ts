import { describe, expect, it } from "vitest";
import {
  clampExplorerPage,
  getExplorerPageCount,
  getExplorerPageItems,
  paginateExplorerGroups,
} from "./entityExplorerPagination";

describe("entity explorer pagination", () => {
  it("keeps a 1,600-row explorer bounded to 100 rows per page", () => {
    const rows = Array.from({ length: 1600 }, (_, index) => index);

    expect(getExplorerPageCount(rows.length)).toBe(16);
    expect(getExplorerPageItems(rows, 16)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1500),
    );
  });

  it("clamps a stale page after filtering removes its rows", () => {
    expect(clampExplorerPage(16, 2)).toBe(1);
    expect(getExplorerPageItems(["a", "b"], 2)).toEqual([]);
  });

  it("repeats a group header when a group spans pages", () => {
    const entries = [
      { kind: "group" as const, groupKey: "npc" },
      ...Array.from({ length: 100 }, (_, index) => ({
        kind: "entity" as const,
        groupKey: "npc",
        id: index,
      })),
    ];

    const pages = paginateExplorerGroups(entries, 10);
    expect(pages).toHaveLength(12);
    expect(pages[0]).toHaveLength(10);
    expect(pages[1][0]).toEqual({ kind: "group", groupKey: "npc" });
    expect(pages[11]).toHaveLength(2);
  });
});
