import { describe, expect, it } from "vitest";
import { appendUniqueClipped, clipText } from "../src/gm-director-brief-text";

describe("director brief text", () => {
  it("normalizes whitespace and preserves text that fits exactly", () => {
    expect(clipText("  bell\n tower\t clue  ", 15)).toBe("bell tower clue");
    expect(clipText("  ", 10)).toBe("");
  });

  it("reserves the final character for an ellipsis when clipping", () => {
    expect(clipText("bell tower", 5)).toBe("bell…");
    expect(clipText("bell", 1)).toBe("…");
  });

  it("deduplicates after normalization and clipping without adding empty entries", () => {
    const items: string[] = [];
    appendUniqueClipped(items, " bell\n tower ", 6);
    appendUniqueClipped(items, "bell towpath", 6);
    appendUniqueClipped(items, "  ", 6);
    appendUniqueClipped(items, "clue", 6);
    expect(items).toEqual(["bell …", "clue"]);
  });
});
