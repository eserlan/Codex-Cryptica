import { getAllAnswers, answerPath } from "../answers/registry";
import { getAllLandingPages, landingPageLabels } from "../for/registry";
import { getLandingPageCanonicalUrl } from "../for/canonical";
import { getAllExamples, examplePath } from "../examples/registry";
import { slugMeta } from "$lib/components/seo/generator-page-meta";

/**
 * "world" is produced by the `/explore` loader (from the public directory
 * API), not by this module — it's part of the shared result type so the
 * loader can merge both sources into one typed list.
 */
export type PublicContentKind =
  "answer" | "for" | "example" | "generator" | "world";

export interface PublicLabelResult {
  kind: PublicContentKind;
  title: string;
  summary: string;
  href: string;
}

/**
 * Public content across every family tagged with `label` (#2762). Mirrors
 * `groupExamplesByKind` in spirit — a small read-only aggregation, not a new
 * registry — so `/explore?label=X` has something to show without touching
 * `discovery/entries`, which is governance metadata, not rendering content.
 */
export function getPublicContentByLabel(label: string): PublicLabelResult[] {
  const results: PublicLabelResult[] = [];

  for (const answer of getAllAnswers()) {
    if (!(answer.labels as string[]).includes(label)) continue;
    results.push({
      kind: "answer",
      title: answer.question,
      summary: answer.shortAnswer,
      href: answerPath(answer),
    });
  }

  for (const page of getAllLandingPages()) {
    if (!landingPageLabels(page).includes(label)) continue;
    results.push({
      kind: "for",
      title: page.hero.title,
      summary: page.hero.tagline,
      href: getLandingPageCanonicalUrl(page),
    });
  }

  for (const example of getAllExamples()) {
    if (!(example.labels as string[]).includes(label)) continue;
    results.push({
      kind: "example",
      title: example.title,
      summary: example.summary,
      href: examplePath(example),
    });
  }

  for (const entry of Object.values(slugMeta)) {
    if (!entry.labels?.includes(label)) continue;
    results.push({
      kind: "generator",
      title: entry.pageTitle,
      summary: entry.metaDescription,
      href: entry.canonicalPath,
    });
  }

  return results;
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
