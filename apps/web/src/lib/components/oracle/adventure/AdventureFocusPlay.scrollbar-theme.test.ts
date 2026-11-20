import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FANTASY_DARK, SCIFI_LIGHT, THEMES } from "schema";

const playSurface = resolve(
  process.cwd(),
  "src/lib/components/oracle/adventure/AdventureFocusPlay.svelte",
);
const themeStore = resolve(process.cwd(), "src/lib/stores/theme.svelte.ts");

describe("Adventure Mode scrollbar theme contract (#5069)", () => {
  it("uses live world-theme tokens, not a fixed sci-fi scrollbar palette", async () => {
    const component = await readFile(playSurface, "utf8");
    const stylesheet = component.slice(component.lastIndexOf("<style>"));

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
});
