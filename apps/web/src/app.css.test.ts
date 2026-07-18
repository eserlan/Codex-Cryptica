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
      "--tw-prose-links: var(--color-accent-primary)",
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
