import { PUBLIC_LAYOUT } from "#lib/components/seo/marketing-shell.js";

/**
 * One layout grammar for every topic hub (TopicHubPage, TopicJobHubPage), on
 * top of the public shell tokens: a wide outer canvas, prose held to the
 * reading measure, and card groups laid out as responsive grids so desktop
 * width goes to the cards rather than to margins.
 */
export const TOPIC_LAYOUT = {
  /** Outer canvas for the whole article. */
  canvas: `${PUBLIC_LAYOUT.canvas.full} ${PUBLIC_LAYOUT.padding.canvas}`,
  /** Intro copy and paragraphs that sit above a card group. */
  measure: PUBLIC_LAYOUT.prose.measure,
  /** Header text: title and lead paragraph. */
  lead: PUBLIC_LAYOUT.prose.lead,
  /** Header with the hero beside the text from lg; stacked below. */
  header: "mb-12 grid items-center gap-8 lg:grid-cols-12 lg:gap-12",
  headerText: "lg:col-span-7",
  headerHero: "lg:col-span-5",
  /** Substantial cards (guides, examples, tools). */
  cards: "grid list-none grid-cols-1 gap-4 md:grid-cols-2",
  /** Compact cards and link rows that stay scannable in three columns. */
  compactCards:
    "grid list-none grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3",
  /** Short ruled items (thesis points, related topics, steps). */
  ruled: "grid list-none grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2",
} as const;
