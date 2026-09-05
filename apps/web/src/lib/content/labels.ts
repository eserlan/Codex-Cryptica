import { z } from "zod";
import { HUB_THEME_SLUGS, type HubThemeSlug } from "./hub-themes";

/**
 * The canonical public label vocabulary (#2762).
 *
 * Deliberately small and curated rather than free text, so a label chip
 * always lands on a discovery view with genuine related content instead of
 * becoming a keyword-page-factory input (Constitution XIII forbids that).
 *
 * Reuses the existing genre/theme-hub vocabulary already shared between
 * `/for` pages and `/generators/[hub]` rather than inventing a second one —
 * see `hub-themes.ts`.
 */
export const PUBLIC_LABELS = HUB_THEME_SLUGS;
export type PublicLabel = HubThemeSlug;

export const PublicLabelSchema = z.enum(
  PUBLIC_LABELS as [PublicLabel, ...PublicLabel[]],
);

export const isPublicLabel = (value: string): value is PublicLabel =>
  (PUBLIC_LABELS as readonly string[]).includes(value);

/** The `/explore` URL that surfaces public content tagged with this label. */
export const labelHref = (label: string): string =>
  `/explore?label=${encodeURIComponent(label)}`;
