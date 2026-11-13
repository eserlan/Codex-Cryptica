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
});
