import { describe, expect, it } from "vitest";
import { getPublicContentByLabel } from "./aggregate";

describe("getPublicContentByLabel", () => {
  it("leads the heist label with its topic hub", () => {
    const results = getPublicContentByLabel("heist");
    expect(results[0]).toMatchObject({ kind: "topic", href: "/topics/heists" });
    expect(results.filter((r) => r.kind === "topic")).toHaveLength(1);
  });

  it("leads the puzzle label with its topic hub", () => {
    const results = getPublicContentByLabel("puzzle");
    expect(results[0]).toMatchObject({
      kind: "topic",
      href: "/topics/puzzles",
    });
  });

  it("adds no topic hub for other public labels", () => {
    const results = getPublicContentByLabel("cyberpunk");
    expect(results.some((r) => r.kind === "topic")).toBe(false);
  });

  it("returns nothing for labels that are not public", () => {
    expect(getPublicContentByLabel("not-a-label")).toEqual([]);
    expect(getPublicContentByLabel("")).toEqual([]);
  });

  it("does not resolve inherited object keys as topic hubs", () => {
    expect(getPublicContentByLabel("constructor")).toEqual([]);
    expect(getPublicContentByLabel("__proto__")).toEqual([]);
  });
});
