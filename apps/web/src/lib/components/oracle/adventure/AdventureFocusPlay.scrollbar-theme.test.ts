import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as schema from "schema";
import { FANTASY_DARK, SCIFI_LIGHT, THEMES } from "schema";

const scrollbarStyles = resolve(
  process.cwd(),
  "src/lib/components/oracle/adventure/adventure-focus-scrollbar.css",
);
const themeStore = resolve(process.cwd(), "src/lib/theme/theme-dom.ts");
const BASE_THUMB_ACCENT_SHARE = 0.8;
const HOVER_THUMB_ACCENT_SHARE = 0.9;

interface Palette {
  id: string;
  tokens: { primary: string; surface: string; background: string };
}

function isPalette(value: unknown): value is Palette {
  if (typeof value !== "object" || value === null || !("tokens" in value)) {
    return false;
  }

  const { id, tokens } = value as Partial<Palette>;
  return (
    typeof id === "string" &&
    typeof tokens?.primary === "string" &&
    typeof tokens.surface === "string" &&
    typeof tokens.background === "string"
  );
}

function parseHexColor(value: string): [number, number, number] {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  if (!match) throw new Error(`Expected a six-digit hex color, got ${value}`);
  return [
    Number.parseInt(match[1]!, 16),
    Number.parseInt(match[2]!, 16),
    Number.parseInt(match[3]!, 16),
  ];
}

function mixSrgb(
  foreground: string,
  background: string,
  foregroundShare: number,
): [number, number, number] {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);
  return foregroundRgb.map((channel, index) =>
    Math.round(
      channel * foregroundShare + backgroundRgb[index]! * (1 - foregroundShare),
    ),
  ) as [number, number, number];
}

function relativeLuminance([red, green, blue]: [number, number, number]) {
  const linear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

function contrastRatio(
  first: [number, number, number],
  second: [number, number, number],
): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

const schemaPalettes = Object.values(schema).reduce<Palette[]>(
  (palettes, value) => {
    if (isPalette(value)) palettes.push(value);
    return palettes;
  },
  [],
);
const allPalettes = [
  ...(Object.values(THEMES) as Palette[]),
  ...schemaPalettes,
].filter(
  (palette, index, palettes) =>
    palettes.findIndex((candidate) => candidate.id === palette.id) === index,
);

describe("Adventure Mode scrollbar theme contract (#5069)", () => {
  it("uses live world-theme tokens, not a fixed sci-fi scrollbar palette", async () => {
    const stylesheet = await readFile(scrollbarStyles, "utf8");

    expect(stylesheet).toContain("var(--color-accent-primary)");
    expect(stylesheet).toContain("var(--color-bg-primary)");
    expect(stylesheet).toContain("var(--color-bg-surface)");
    expect(stylesheet).toContain("scrollbar-color:");
    expect(stylesheet).not.toMatch(/#[a-f0-9]{3,8}\b/i);
  });

  it("inherits genre and appearance variants from ThemeStore", async () => {
    const store = await readFile(themeStore, "utf8");

    expect(store).toContain(
      'root.style.setProperty("--color-accent-primary", tokens.primary)',
    );
    expect(store).toContain(
      'root.style.setProperty("--color-bg-primary", tokens.background)',
    );
    expect(store).toContain(
      'root.style.setProperty("--color-bg-surface", tokens.surface)',
    );

    // Sci-fi terminal green, fantasy parchment brown, horror crimson,
    // and cyberpunk pink must remain distinct; appearance variants
    // also have their own palette and are resolved by ThemeStore.
    const genres = [
      THEMES.scifi,
      THEMES.fantasy,
      THEMES.horror,
      THEMES.cyberpunk,
    ];
    expect(new Set(genres.map((theme) => theme.tokens.primary)).size).toBe(
      genres.length,
    );
    expect(FANTASY_DARK.tokens.primary).not.toBe(THEMES.fantasy.tokens.primary);
    expect(SCIFI_LIGHT.tokens.primary).not.toBe(THEMES.scifi.tokens.primary);
  });

  it("keeps base and hover scrollbar thumbs visible across every theme palette", async () => {
    const stylesheet = await readFile(scrollbarStyles, "utf8");

    expect(stylesheet).toContain("var(--color-accent-primary) 80%");
    expect(stylesheet).toContain("var(--color-accent-primary) 90%");
    expect(allPalettes.length).toBeGreaterThan(30);

    for (const palette of allPalettes) {
      const track = parseHexColor(palette.tokens.background);
      const baseThumb = mixSrgb(
        palette.tokens.primary,
        palette.tokens.surface,
        BASE_THUMB_ACCENT_SHARE,
      );
      const hoverThumb = mixSrgb(
        palette.tokens.primary,
        palette.tokens.surface,
        HOVER_THUMB_ACCENT_SHARE,
      );
      const baseContrast = contrastRatio(baseThumb, track);
      const hoverContrast = contrastRatio(hoverThumb, track);

      expect(baseContrast, `${palette.id} base thumb`).toBeGreaterThanOrEqual(
        3,
      );
      expect(hoverContrast, `${palette.id} hover thumb`).toBeGreaterThanOrEqual(
        3,
      );
      expect(hoverContrast, `${palette.id} hover strength`).toBeGreaterThan(
        baseContrast,
      );
    }
  });

  it("reverts custom scrollbar styling in forced-colours mode", async () => {
    const stylesheet = await readFile(scrollbarStyles, "utf8");
    const forcedColours = stylesheet.match(
      /@media \(forced-colors:\s+active\)\s*\{([\s\S]*?)\n\}/,
    )?.[1];

    expect(forcedColours).toBeDefined();
    expect(forcedColours).toContain("scrollbar-color: auto");
    expect(forcedColours).toContain("scrollbar-width: auto");
    for (const pseudoElement of [
      "::-webkit-scrollbar",
      "::-webkit-scrollbar-track",
      "::-webkit-scrollbar-thumb",
      "::-webkit-scrollbar-thumb:hover",
    ]) {
      expect(forcedColours).toContain(`.adventure-scrollbar${pseudoElement}`);
    }
    expect(forcedColours).toContain("all: revert");
  });
});
