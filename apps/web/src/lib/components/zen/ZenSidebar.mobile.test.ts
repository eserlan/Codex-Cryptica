import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ZenSidebar mobile layout", () => {
  it("keeps connections visible below the desktop breakpoint", () => {
    const source = readFileSync(
      `${process.cwd()}/src/lib/components/zen/ZenSidebar.svelte`,
      "utf8",
    );

    const contentMatch = source.match(
      /<div[^>]*data-testid="zen-sidebar-content"[^>]*>/,
    );
    const classMatch = contentMatch?.[0].match(/class="([^"]*)"/);
    const classes = classMatch?.[1].split(/\s+/) ?? [];

    expect(classes).toContain("space-y-4");
    expect(classes).not.toContain("hidden");
    expect(source).toMatch(/>\s*Connections\s*</);
  });
});
