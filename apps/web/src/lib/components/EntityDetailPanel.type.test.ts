import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  `${process.cwd()}/src/lib/components/EntityDetailPanel.svelte`,
  "utf8",
);

describe("EntityDetailPanel type", () => {
  it("is not monospace at the root", () => {
    const aside = source.match(/<aside[^>]*>/)?.[0] ?? "";
    expect(aside).toContain("font-body");
    expect(aside).not.toContain("font-mono");
  });

  it("uses EntityNotices for the demo notice", () => {
    expect(source).toContain("<EntityNotices");
    expect(source).not.toContain("TRANSIENT MODE");
  });
});
