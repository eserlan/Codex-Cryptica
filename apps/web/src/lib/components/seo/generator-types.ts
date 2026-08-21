export type ValidSlug =
  | "npc"
  | "settlement"
  | "magic-item"
  | "minor-magic-item"
  | "artifact-generator"
  | "faction"
  | "quest"
  | "item"
  | "tavern"
  | "social-hub"
  | "kingdom"
  | "nation"
  | "vampire-clan"
  | "nomad-clan"
  | "names"
  | "fantasy-names"
  | "dnd-npc"
  | "pantheon-generator"
  | "god-generator"
  | "ship-generator"
  | "language-generator"
  | "news-sheet-generator"
  | "dungeon-generator"
  | "adventure-generator"
  | "adventure-idea-generator"
  | "plot-twist-generator"
  | "bbeg-generator"
  | "world"
  | "council-vote"
  | "secret-society"
  | "star-system"
  | "alien-race"
  | "creature";

export type SlugMetaEntry = {
  pageTitle: string;
  metaDescription: string;
  introTitle: string;
  eyebrow: string;
  introText: string;
  canonicalPath: string;
  /**
   * Link-preview image for this generator, as a plain (untransformed) R2 URL —
   * social crawlers do not negotiate formats, so they must not go through
   * `cdn-cgi/image`. Falls back to the shared product screenshot when unset.
   * Capture new ones with `scripts/og-images/capture-generator-og.mjs`.
   */
  ogImage?: string;
  ogImageAlt?: string;
  keywords?: string[];
  faqs?: {
    question: string;
    answer: string;
    image?: string;
    imageAlt?: string;
    inlineImage?: string;
    inlineImageAlt?: string;
    exclusiveLabel?: string;
    inlineImageCaption?: string;
  }[];
  relatedLinks?: { href: string; label: string }[];
};
