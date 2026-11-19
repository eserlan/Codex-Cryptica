import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  `${process.cwd()}/src/lib/components/zen/ZenView.svelte`,
  "utf8",
);

describe("ZenView tab labels", () => {
  it("uses the shared label map", () => {
    expect(source).toContain("entityDetailTabLabels");
  });

  it("has no upper-case tab literals or theme tab jargon", () => {
    for (const word of ["OVERVIEW", "CONNECTIONS", "TIMELINE"]) {
      expect(source).not.toContain(word);
    }
    expect(source).not.toContain("jargon.tab_status");
    expect(source).not.toContain("jargon.tab_lore");
  });

  it("renders the notices", () => {
    expect(source).toContain("<EntityNotices");
  });

  it("clears the copy indicator timer when the view is destroyed", () => {
    expect(source).toContain("clearTimeout(copyResetTimeout)");
  });
});
