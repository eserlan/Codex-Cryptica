// Relative rather than `$lib`: this module is loaded by
// `scripts/discovery-audit.mjs`, which runs in `prebuild` — before Vite, and
// therefore with no alias resolution beyond whatever tsconfig happens to be on
// disk. `$lib` only resolves through the generated `.svelte-kit/tsconfig.json`,
// so an alias here makes the build depend on a file `svelte-kit sync` may not
// have written yet.
import { solutions } from "../../config/seo-pages";
import { featuresConfig } from "../../config/seo-features";
import { importsConfig } from "../../config/seo-imports";
import { comparisons } from "../../config/seo-comparisons";
import { getAllLandingPageSlugs } from "../for/registry";
import { getAllAnswerSlugs } from "../answers/registry";
import { getAllExampleSlugs } from "../examples/registry";
import { HUB_THEME_SLUGS } from "../hub-themes";
import { GENERATOR_SLUGS } from "../../../params/generator_slug";

/**
 * The public routes the registry governs, derived from the same configuration
 * the routes are built from.
 *
 * Deriving rather than listing is the point: a new `/for` pack or `/answers`
 * page appears here the moment it is added, so the audit notices it has no
 * registry entry without anyone remembering to update a second list.
 *
 * Governance is scoped to discovery surfaces. Application routes, legal pages
 * and dated devlog posts are deliberately outside it — the governance rule is
 * meant to shape the search-facing surface, not to tax ordinary work.
 */

/** `/tools/[page]` landing pages, which are individual route directories. */
const TOOL_PAGES = [
  "cyberpunk-nomad-clan-generator",
  "dnd-npc-generator",
  "faction-generator",
  "fantasy-name-generator",
  "quest-hook-generator",
  "rpg-npc-generator",
  "vampire-clan-generator",
] as const;

/** Standalone landing pages and family index routes. */
const STANDALONE_PATHS = [
  "/for",
  "/answers",
  "/examples",
  "/tools",
  "/generators",
  "/blog",
  "/migrations",
  "/alternatives",
  "/free-rpg-campaign-manager",
  "/worldbuilding-tool",
  "/ai-rpg-campaign-manager",
  "/responsible-ai-worldbuilding",
] as const;

/**
 * Evergreen blog posts inside the governed set.
 *
 * Listed explicitly rather than derived, because most of the blog is a dated
 * devlog and registering all of it would be noise. Adding a post here is a
 * deliberate statement that it competes for a search intent.
 */
const GOVERNED_BLOG_PATHS = [
  "/blog/why-codex-cryptica-over-obsidian",
  "/blog/gm-guide-data-sovereignty",
  "/blog/worldbuilding-tool-without-ai",
  "/blog/ai-slop-is-context-failure",
] as const;

export function listGovernedPaths(): string[] {
  return [
    ...STANDALONE_PATHS,
    ...GOVERNED_BLOG_PATHS,
    ...getAllLandingPageSlugs().map((slug) => `/for/${slug}`),
    ...getAllAnswerSlugs().map((slug) => `/answers/${slug}`),
    ...getAllExampleSlugs().map((slug) => `/examples/${slug}`),
    ...Object.keys(solutions).map((slug) => `/solutions/${slug}`),
    ...Object.keys(featuresConfig).map((slug) => `/features/${slug}`),
    ...Object.keys(importsConfig).map((slug) => `/import/${slug}`),
    ...Object.keys(comparisons).map((slug) => `/vs/${slug}`),
    ...GENERATOR_SLUGS.map((slug) => `/generators/${slug}`),
    ...HUB_THEME_SLUGS.map((slug) => `/generators/${slug}`),
    ...TOOL_PAGES.map((slug) => `/tools/${slug}`),
  ];
}
