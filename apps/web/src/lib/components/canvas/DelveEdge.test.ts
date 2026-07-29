import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/lib/components/canvas/DelveEdge.svelte"),
  "utf8",
);

describe("DelveEdge", () => {
  it("uses the same straight connection path as the general canvas edges", () => {
    expect(source).toContain("getStraightPath");
    expect(source).not.toContain("getSmoothStepPath");
  });
});
