import { slugMeta } from "../components/seo/generator-page-meta";
import { generatorEntries } from "../content/discovery/entries/generators";

export interface LlmsGeneratorListing {
  slug: string;
  path: string;
  title: string;
  description: string;
}

const TITLE_CASE_ACRONYMS: Record<string, string> = {
  rpg: "RPG",
  npc: "NPC",
  dnd: "D&D",
  ai: "AI",
  vtt: "VTT",
  osr: "OSR",
  dm: "DM",
};

function titleCaseIntent(intent: string): string {
  return intent
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (TITLE_CASE_ACRONYMS[lower]) return TITLE_CASE_ACRONYMS[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * Every live, indexable generator in the discovery registry, in registry
 * order, joined with its display metadata from slugMeta (#3163).
 *
 * Entries without slugMeta (e.g. bespoke pages like /generators/random)
 * fall back to the registry's own intent strings so a released generator
 * can never silently disappear from AI-readable discovery surfaces.
 */
export function getLiveGeneratorListings(): LlmsGeneratorListing[] {
  return generatorEntries
    .filter(
      (entry) =>
        entry.pageKind === "generator" &&
        entry.indexable &&
        entry.status === "live",
    )
    .map((entry) => {
      const slug = entry.canonicalPath.replace(/^\/generators\//, "");
      const meta = (
        slugMeta as Record<string, { introTitle?: string; introText?: string }>
      )[slug];
      return {
        slug,
        path: entry.canonicalPath,
        title: meta?.introTitle?.trim() || titleCaseIntent(entry.primaryIntent),
        description: meta?.introText?.trim() || entry.uniqueValue?.trim() || "",
      };
    });
}

/** Markdown bullet lines for the Live In-Browser Generators section. */
export function renderLlmsGeneratorLines(
  listings: LlmsGeneratorListing[] = getLiveGeneratorListings(),
): string[] {
  return listings.map(
    (listing) =>
      `- [${listing.title}](https://codexcryptica.com${listing.path}): ${listing.description}`,
  );
}
