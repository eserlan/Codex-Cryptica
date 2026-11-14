import { describe, expect, it } from "vitest";
import { mergeNoticeLines } from "./cloud-backup-merge-notice";

describe("mergeNoticeLines", () => {
  it("counts changes in the singular and plural", () => {
    expect(mergeNoticeLines({ merged: 1, copies: [] })).toEqual([
      "Merged 1 change",
    ]);
    expect(mergeNoticeLines({ merged: 3, copies: [] })).toEqual([
      "Merged 3 changes",
    ]);
  });

  it("adds a line per copy and skips a zero count", () => {
    expect(mergeNoticeLines({ merged: 0, copies: ["Mara", "Fen"] })).toEqual([
      "Kept your version of Mara as a copy",
      "Kept your version of Fen as a copy",
    ]);
  });

  it("is empty without a notice", () => {
    expect(mergeNoticeLines(null)).toEqual([]);
  });

  it("keeps duplicate titles as separate lines", () => {
    expect(mergeNoticeLines({ merged: 0, copies: ["Mara", "Mara"] })).toEqual([
      "Kept your version of Mara as a copy",
      "Kept your version of Mara as a copy",
    ]);
  });

  it("falls back to Untitled for a blank title", () => {
    expect(mergeNoticeLines({ merged: 0, copies: ["  "] })).toEqual([
      "Kept your version of Untitled as a copy",
    ]);
  });

  it("caps the copy lines at five and counts the rest", () => {
    const copies = Array.from({ length: 8 }, (_, i) => `E${i}`);
    const lines = mergeNoticeLines({ merged: 0, copies });
    expect(lines).toHaveLength(6);
    expect(lines[5]).toBe("and 3 more kept as copies");
  });
});
