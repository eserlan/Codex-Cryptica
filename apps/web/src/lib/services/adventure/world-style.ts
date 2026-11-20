import { THEMES } from "schema";
import type { AdventureWorldStyle } from "@codex/adventure-engine";

const GENRE_LABEL_OVERRIDES: Record<string, string> = {
  cyberpunk: "Cyberpunk / Corporate",
};

/**
 * The Vault's world theme as a genre hint for the GM. The neutral workspace
 * theme and unknown ids carry no genre, so they return undefined.
 */
export function worldStyleForTheme(
  themeId: string | null | undefined,
): AdventureWorldStyle | undefined {
  if (!themeId) return undefined;
  const id = themeId.replace(/_(light|dark)$/, "");
  if (id === "workspace" || !Object.hasOwn(THEMES, id)) return undefined;
  const theme = THEMES[id as keyof typeof THEMES];
  if (!theme.name || !theme.description) return undefined;
  return { name: theme.name, description: theme.description };
}

/** Generator genre label for the Vault's theme, or undefined when neutral. */
export function genreForTheme(
  themeId: string | null | undefined,
): string | undefined {
  if (!themeId) return undefined;
  const id = themeId.replace(/_(light|dark)$/, "");
  if (id === "workspace" || !Object.hasOwn(THEMES, id)) {
    return undefined;
  }
  return GENRE_LABEL_OVERRIDES[id] ?? THEMES[id as keyof typeof THEMES].name;
}
