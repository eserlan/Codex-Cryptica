import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SEOGeneratorLayout", () => {
  it("binds generated preview theming through data-theme", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/components/seo/SEOGeneratorLayout.svelte"),
      "utf8",
    );

    expect(source).toContain("data-theme={worldTheme}");
    expect(source).not.toContain("data-world-theme={worldTheme}");
  });
});
