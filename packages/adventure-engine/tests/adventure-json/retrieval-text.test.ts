import { describe, expect, it } from "vitest";
import {
  buildText,
  readLine,
  referenceLine,
  referenceLines,
  type Line,
} from "../../src/adventure-json/retrieval-text";

describe("bounded retrieval lines", () => {
  it("joins present values in order and preserves structured references", () => {
    const lines: Line[] = [
      ["Missing", undefined],
      ["Empty", []],
      ["Name", "Hall"],
      ["Paths", ["North", "South"]],
    ];
    expect(buildText(lines, 100)).toBe("Name: Hall\nPaths: North; South");
    expect(referenceLine("Scene", "s1")).toEqual([
      "Scene",
      "s1",
      undefined,
      ["s1"],
    ]);
    expect(referenceLine("Scene", undefined)[3]).toEqual([]);
    expect(referenceLines("Actors", ["a1", "a2"])[3]).toEqual(["a1", "a2"]);
  });

  it("stops lazy text after the cap overflow character", () => {
    let reads = 0;
    function* lines(): Iterable<Line> {
      while (true) {
        reads++;
        yield ["Body", "x".repeat(100)];
      }
    }
    expect(buildText(lines(), 20)).toBe("Body: " + "x".repeat(15));
    expect(reads).toBeLessThanOrEqual(2);
  });

  it("bounds lazy line parts without discarding secrecy metadata", () => {
    let reads = 0;
    function* parts() {
      while (true) {
        reads++;
        yield "abcd";
      }
    }
    expect(readLine(["Related", parts(), true, ["hidden"]], 10)).toEqual([
      "Related",
      ["abcd", "abcd"],
      true,
      ["hidden"],
    ]);
    expect(reads).toBe(2);
  });
});
