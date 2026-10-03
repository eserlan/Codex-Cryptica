import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appCssPath = resolve(process.cwd(), "src/app.css");

async function getProseThemeOverrides() {
  const css = await readFile(appCssPath, "utf8");
  const proseBlockStart = css.lastIndexOf("\n.prose {");
  const proseBlockEnd = css.indexOf("\n}", proseBlockStart);

  return {
    css,
    proseBlock: css.slice(proseBlockStart, proseBlockEnd + 2),
    proseBlockStart,
  };
}

describe("Markdown Typography theme contract", () => {
  it("overrides Typography's utility-layer defaults with world-theme tokens", async () => {
    const { css, proseBlock, proseBlockStart } = await getProseThemeOverrides();

    expect(proseBlockStart).toBeGreaterThan(
      css.lastIndexOf("@layer utilities"),
    );
    expect(proseBlock).toContain("--tw-prose-body: var(--color-text-primary)");
    expect(proseBlock).toContain(
      "--tw-prose-links: var(--link, var(--color-accent-primary))",
    );
    expect(proseBlock).toContain("--tw-prose-kbd: var(--color-text-primary)");
  });

  it("does not leave Markdown prose on Typography's fixed gray palette", async () => {
    const { proseBlock } = await getProseThemeOverrides();

    expect(proseBlock).not.toMatch(
      /--tw-prose-(?:body|links|headings):\s*#(?:[0-9a-f]{3}){1,2}/i,
    );
  });
});

describe("Mobile typography contract (#3718)", () => {
  it("defines semantic type tokens that grow on mobile only", async () => {
    const css = await readFile(appCssPath, "utf8");
    expect(css).toContain("--text-meta: var(--type-meta)");
    expect(css).toContain("--text-body-ui: var(--type-body-ui)");
    expect(css).toContain("--text-nano: var(--type-nano)");
    expect(css).toContain("--text-xs: var(--type-helper)");
    // Desktop keeps Tailwind's stock text-xs line-height (1 / 0.75).
    expect(css).toContain("--type-xs-lh: 1.33333");

    const mobile = css.slice(css.indexOf("@media (max-width: 639.98px)"));
    expect(mobile).toContain("--type-meta: 0.8125rem");
    expect(mobile).toContain("--type-helper: 0.875rem");
    expect(mobile).toContain("--type-body-ui: 1rem");
    // Desktop/tablet values stay unchanged.
    expect(css).toContain("--type-meta: 0.6875rem");
    expect(css).toContain("--type-body-ui: 0.75rem");
  });

  it("forces text-entry controls to at least 16px on mobile", async () => {
    const css = await readFile(appCssPath, "utf8");
    expect(css).toMatch(
      /textarea,\s*select,[\s\S]*font-size: max\(1rem, 16px\) !important/,
    );
  });

  it("provides a mobile-only 44px touch target utility", async () => {
    const css = await readFile(appCssPath, "utf8");
    expect(css).toMatch(
      /\.touch-target \{[\s\S]*min-height: 2\.75rem[\s\S]*min-width: 2\.75rem/,
    );
  });
});
