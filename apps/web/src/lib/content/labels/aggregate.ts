import { getAllAnswers, answerPath } from "../answers/registry";
import { getAllLandingPages, landingPageLabels } from "../for/registry";
import { getLandingPageCanonicalUrl } from "../for/canonical";
import { getAllExamples, examplePath } from "../examples/registry";
import { slugMeta } from "$lib/components/seo/generator-page-meta";
import { isContentClusterSlug, isPublicLabel } from "../labels";
import { HUB_THEME_LABELS, HUB_THEME_SLUGS } from "../hub-themes";
import { getEntryByPath } from "../discovery/registry";

/**
 * "world" is produced by the `/explore` loader (from the public directory
 * API), not by this module — it's part of the shared result type so the
 * loader can merge both sources into one typed list.
 */
export type PublicContentKind =
  "answer" | "for" | "example" | "generator" | "world" | "topic";

export interface PublicLabelResult {
  kind: PublicContentKind;
  title: string;
  summary: string;
  href: string;
}

const TOPIC_HUBS: Record<string, PublicLabelResult> = {
  heist: {
    kind: "topic",
    title: "Running and Designing RPG Heists",
    summary:
      "The central cluster hub for tabletop RPG heists: core running frameworks, prize design checklists, worked examples across genres, and generator tools.",
    href: "/topics/heists",
  },
  puzzle: {
    kind: "topic",
    title: "Designing and Running RPG Puzzles",
    summary:
      "The central cluster hub for tabletop RPG puzzles: stall-proof design, hint ladders, worked examples with alternate solutions, and the puzzle generator.",
    href: "/topics/puzzles",
  },
};

const answerResults = (label: string, isCluster: boolean) =>
  getAllAnswers()
    .filter(
      (answer) =>
        (answer.labels as string[]).includes(label) ||
        (isCluster && (answer.discovery?.clusters ?? []).includes(label)),
    )
    .map((answer): PublicLabelResult => ({
      kind: "answer",
      title: answer.question,
      summary: answer.shortAnswer,
      href: answerPath(answer),
    }));

const landingPageResults = (label: string) =>
  getAllLandingPages()
    .filter((page) => landingPageLabels(page).includes(label))
    .map((page): PublicLabelResult => ({
      kind: "for",
      title: page.hero.title,
      summary: page.hero.tagline,
      href: getLandingPageCanonicalUrl(page),
    }));

const exampleResults = (label: string, isCluster: boolean) =>
  getAllExamples()
    .filter(
      (example) =>
        (example.labels as string[]).includes(label) ||
        (isCluster && example.kind === label),
    )
    .map((example): PublicLabelResult => ({
      kind: "example",
      title: example.title,
      summary: example.summary,
      href: examplePath(example),
    }));

const generatorResults = (label: string) =>
  Object.values(slugMeta)
    .filter((entry) => entry.labels?.includes(label))
    .map((entry): PublicLabelResult => ({
      kind: "generator",
      title: entry.pageTitle,
      summary: entry.metaDescription,
      href: entry.canonicalPath,
    }));

/**
 * Public content across every family tagged with `label` (#2762). Mirrors
 * `groupExamplesByKind` in spirit — a small read-only aggregation, not a new
 * registry — so `/explore?label=X` has something to show without touching
 * `discovery/entries`, which is governance metadata, not rendering content.
 */
export function getPublicContentByLabel(label: string): PublicLabelResult[] {
  if (!isPublicLabel(label)) {
    return [];
  }

  const isCluster = isContentClusterSlug(label);
  const hub = Object.hasOwn(TOPIC_HUBS, label) ? [TOPIC_HUBS[label]] : [];

  return [
    ...hub,
    ...answerResults(label, isCluster),
    ...landingPageResults(label),
    ...exampleResults(label, isCluster),
    ...generatorResults(label),
  ];
}

/** Results grouped by content kind, for a sectioned discovery view. */
export function groupPublicLabelResults(
  results: PublicLabelResult[],
): Map<PublicContentKind, PublicLabelResult[]> {
  const groups = new Map<PublicContentKind, PublicLabelResult[]>();
  for (const result of results) {
    groups.set(result.kind, [...(groups.get(result.kind) ?? []), result]);
  }
  return groups;
}

/**
 * A public page plus the extra words a visitor might type to find it (labels
 * and, for `/for` guides, the discovery registry's intent aliases). Feeds
 * `/explore` search (#3339).
 */
export interface SearchablePublicContent extends PublicLabelResult {
  keywords: string[];
}

/** Every public answer, guide, example and generator, unfiltered. */
export function getAllPublicContent(): SearchablePublicContent[] {
  return [
    ...getAllAnswers().map((answer): SearchablePublicContent => ({
      kind: "answer",
      title: answer.question,
      summary: answer.shortAnswer,
      href: answerPath(answer),
      keywords: [...answer.labels],
    })),
    ...getAllLandingPages().map((page): SearchablePublicContent => {
      const entry = getEntryByPath(`/for/${page.slug}`);
      return {
        kind: "for",
        title: page.hero.title,
        summary: page.hero.tagline,
        href: getLandingPageCanonicalUrl(page),
        keywords: [
          ...landingPageLabels(page),
          ...(entry ? [entry.primaryIntent, ...entry.intentAliases] : []),
        ],
      };
    }),
    ...getAllExamples().map((example): SearchablePublicContent => ({
      kind: "example",
      title: example.title,
      summary: example.summary,
      href: examplePath(example),
      keywords: [...example.labels],
    })),
    ...Object.values(slugMeta).map((entry): SearchablePublicContent => ({
      kind: "generator",
      title: entry.pageTitle,
      summary: entry.metaDescription,
      href: entry.canonicalPath,
      keywords: [...(entry.labels ?? [])],
    })),
    ...HUB_THEME_SLUGS.map((slug): SearchablePublicContent => ({
      kind: "generator",
      title: `${HUB_THEME_LABELS[slug]} Generators`,
      summary: `Generators suited to a ${HUB_THEME_LABELS[slug]} campaign.`,
      href: `/generators/${slug}`,
      keywords: [slug],
    })),
    ...Object.values(TOPIC_HUBS).map((hub): SearchablePublicContent => ({
      ...hub,
      keywords: [],
    })),
  ];
}
