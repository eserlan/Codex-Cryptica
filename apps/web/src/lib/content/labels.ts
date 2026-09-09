import { z } from "zod";
import { HUB_THEME_SLUGS, type HubThemeSlug } from "./hub-themes";
export { HUB_THEME_SLUGS, type HubThemeSlug };

/**
 * The content clusters supported as public labels (#2863).
 * Sourced from the discovery intent registry's curated cluster taxonomy.
 */
export const CONTENT_CLUSTER_SLUGS = ["heist", "rumour", "religion"] as const;

export type ContentClusterSlug = (typeof CONTENT_CLUSTER_SLUGS)[number];

export const isContentClusterSlug = (
  value: string,
): value is ContentClusterSlug =>
  (CONTENT_CLUSTER_SLUGS as readonly string[]).includes(value);

/**
 * The canonical public label vocabulary (#2762, #2863).
 *
 * Deliberately small and curated rather than free text, so a label chip
 * always lands on a discovery view with genuine related content instead of
 * becoming a keyword-page-factory input (Constitution XIII forbids that).
 *
 * Combines two governed dimensions:
 * 1. Theme/genre hubs (`hub-themes.ts`) shared between `/for` pages and `/generators/[hub]`.
 * 2. Curated content clusters (`discovery/entries/`) shared across generators, answers, and examples.
 */
export const PUBLIC_LABELS = [
  ...HUB_THEME_SLUGS,
  ...CONTENT_CLUSTER_SLUGS,
] as const;

export type PublicLabel = HubThemeSlug | ContentClusterSlug;

export const PublicLabelSchema = z.enum(
  PUBLIC_LABELS as unknown as [PublicLabel, ...PublicLabel[]],
);

export const isPublicLabel = (value: string): value is PublicLabel =>
  (PUBLIC_LABELS as readonly string[]).includes(value);

/** The `/explore` URL that surfaces public content tagged with this label. */
export const labelHref = (label: string): string =>
  `/explore?label=${encodeURIComponent(label)}`;
