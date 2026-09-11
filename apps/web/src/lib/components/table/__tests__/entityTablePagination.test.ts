import { describe, expect, it } from "vitest";
import {
  clampEntityTablePage,
  getEntityTablePageCount,
  getEntityTablePageItems,
} from "../entityTablePagination";

describe("entity table pagination", () => {
  it("keeps page count and slices bounded for large collections", () => {
    const items = Array.from({ length: 1600 }, (_, index) => index);

    expect(getEntityTablePageCount(items.length, 50)).toBe(32);
    expect(getEntityTablePageItems(items, 32, 50)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1550),
    );
  });

  it("clamps stale pages after filtering removes the last page", () => {
    expect(clampEntityTablePage(32, 2, 50)).toBe(1);
    expect(getEntityTablePageItems(["a", "b"], 2, 50)).toEqual([]);
  });
});
