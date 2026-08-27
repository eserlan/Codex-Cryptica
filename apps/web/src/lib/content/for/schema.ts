import { z } from "zod";
import { HUB_THEME_SLUGS, type HubThemeSlug } from "../hub-themes";

export const LandingPageKindSchema = z.enum(["system", "genre", "use-case"]);
export type LandingPageKind = z.infer<typeof LandingPageKindSchema>;

export const LandingPageUseCaseSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
});
export type LandingPageUseCase = z.infer<typeof LandingPageUseCaseSchema>;

/**
 * Entity category a graph node belongs to. Mirrors DEFAULT_CATEGORIES in the
 * schema package so preview nodes colour themselves the same way real vault
 * entities do — the graph component never inspects node text to guess a type.
 */
export const LandingPageGraphCategorySchema = z.enum([
  "character",
  "creature",
  "location",
  "item",
  "event",
  "faction",
  "note",
]);
export type LandingPageGraphCategory = z.infer<
  typeof LandingPageGraphCategorySchema
>;

export const LandingPageGraphStepSchema = z.object({
  label: z.string(),
  sublabel: z.string().optional(),
  /**
   * Relation from the hub node (the first step) to **this** node — never from
   * the step above it. The graph is drawn hub-and-spoke, so every relation has
   * to read as `<first step> <relation> <this step>` standing on its own.
   *
   * A `steps` array reads like a sequence, which makes it tempting to write
   * relations as a chain. #2197 had to correct exactly that mistake across
   * seven packs; if a relation only makes sense when read against the previous
   * entry, it is wrong.
   */
  relation: z.string().optional(),
  category: LandingPageGraphCategorySchema.optional(),
});
export type LandingPageGraphStep = z.infer<typeof LandingPageGraphStepSchema>;

/** Node/edge colour family used inside the dark graph canvas. */
export const LandingPageGraphPaletteSchema = z.enum(["default", "oxblood"]);
export type LandingPageGraphPalette = z.infer<
  typeof LandingPageGraphPaletteSchema
>;

export const LandingPageGraphSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  /**
   * The first step is the hub; every later step is a spoke drawn off it. This
   * is a star, not a path — see `relation` on the step schema before writing
   * one.
   */
  steps: z.array(LandingPageGraphStepSchema),
  /** Badge shown beside the section heading. Defaults to "Interactive Graph View". */
  badgeLabel: z.string().optional(),
  palette: LandingPageGraphPaletteSchema.optional(),
  /**
   * "dark" drops the whole section onto a dark ground, so a light page reveals
   * the graph as a distinct layer. Defaults to the page surface.
   */
  surface: z.enum(["page", "dark"]).optional(),
});
export type LandingPageGraph = z.infer<typeof LandingPageGraphSchema>;

export const RecommendedToolSchema = z.object({
  title: z.string(),
  description: z.string(),
  href: z.string(),
  badge: z.string().optional(),
});
export type RecommendedTool = z.infer<typeof RecommendedToolSchema>;

export const LandingPageSectionSchema = z.enum([
  "hero",
  "useCases",
  "graph",
  "tools",
  "hub",
  "cta",
  "disclaimer",
]);

export type LandingPageSection = z.infer<typeof LandingPageSectionSchema>;

/**
 * Corner treatment for the page's cards, panels and CTA. "sharp" gives an
 * archival/printed-document feel; "soft" is the default app-like rounding.
 */
export const LandingPageSurfaceStyleSchema = z.enum(["soft", "sharp"]);
export type LandingPageSurfaceStyle = z.infer<
  typeof LandingPageSurfaceStyleSchema
>;

export const LandingPageConfigSchema = z.object({
  slug: z.string().min(1),
  kind: z.enum(["system", "genre"]),
  theme: z.string().optional(),
  surfaceStyle: LandingPageSurfaceStyleSchema.optional(),
  /**
   * Theme hub at /generators/[hub] this page belongs to. Drives the link out
   * to the hub, and the hub's links back to its landing pages.
   */
  hub: z.enum(HUB_THEME_SLUGS as [HubThemeSlug, ...HubThemeSlug[]]).optional(),
  sectionOrder: z.array(LandingPageSectionSchema).optional(),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    canonical: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
  hero: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    tagline: z.string(),
    problemStatement: z.string(),
  }),
  useCases: z.array(LandingPageUseCaseSchema),
  exampleGraph: LandingPageGraphSchema.optional(),
  recommendedTools: z.array(RecommendedToolSchema),
  cta: z.object({
    title: z.string(),
    description: z.string().optional(),
    buttonText: z.string(),
    buttonHref: z.string(),
  }),
  disclaimer: z.string().optional(),
});
export type LandingPageConfig = z.infer<typeof LandingPageConfigSchema>;
