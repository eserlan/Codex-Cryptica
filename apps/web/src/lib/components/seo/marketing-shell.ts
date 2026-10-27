/**
 * Shell configuration for public pages.
 *
 * Kept out of the component so the nav set and the analytics identifiers are
 * testable without mounting anything, and so there is exactly one list to edit
 * when a public page is added.
 */

export interface MarketingNavItem {
  href: string;
  label: string;
}

/**
 * The public nav. Two items, deliberately (#3140): Generators is the
 * strongest direct use entry point, Explore is the way into everything
 * else (Answers, Topics, Examples, Tools, Devlog, ...) — the header is a
 * way back into the site from a page someone landed on, not a sitemap.
 * Sentence case per the grammar in docs/design/public-shell-grammar.md.
 */
export const MARKETING_NAV: MarketingNavItem[] = [
  { href: "/generators", label: "Generators" },
  { href: "/explore", label: "Explore" },
];

/**
 * Content widths and responsive layout tokens from the grammar in
 * docs/design/public-shell-grammar.md.
 *
 * Pages pick a documented token; they do not invent ad-hoc variants.
 *
 * Implements the two-width concept:
 * - Outer canvas constraint (narrow, default, wide, or full for widescreen).
 * - Inner readable measure (prose, lead) so paragraphs remain at ~65–75 chars
 *   independent of outer canvas expansion.
 * - Responsive split layout primitives for content + contextual aside.
 *
 * Not applied globally by MarketingShell: it deliberately leaves width to the
 * page so adding the shell does not reflow thirty pages in one commit. Child
 * migrations adopt these tokens individually.
 */
export const SHELL_WIDTHS = {
  narrow: "max-w-2xl",
  default: "max-w-4xl",
  wide: "max-w-6xl",
  full: "max-w-7xl",
} as const;

export type ShellWidth = keyof typeof SHELL_WIDTHS;

/**
 * Reusable layout primitives for public marketing pages.
 */
export const PUBLIC_LAYOUT = {
  /** Outer page canvas containers */
  canvas: {
    narrow: "mx-auto w-full max-w-2xl",
    default: "mx-auto w-full max-w-4xl",
    wide: "mx-auto w-full max-w-6xl",
    full: "mx-auto w-full max-w-7xl",
  },
  /** Standard responsive horizontal padding */
  padding: {
    canvas: "px-4 sm:px-6 lg:px-8",
    prose: "px-4 sm:px-6",
  },
  /** Inner readable measure: preserves 65-75ch line length */
  prose: {
    measure: "max-w-2xl",
    lead: "max-w-3xl",
  },
  /**
   * No-aside modifier: a centred reading column for articles without a
   * contextual rail. Wide blocks (tables) fill the column; every other direct
   * child is centred at its own measure, so edges line up when measures match.
   */
  solo: {
    column: "mx-auto w-full max-w-4xl [&>*]:mx-auto",
  },
  /** Content + contextual aside responsive split */
  split: {
    container:
      "grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16 items-start",
    content: "lg:col-span-8 min-w-0",
    aside: "lg:col-span-4 min-w-0",
  },
} as const;

/**
 * The `utm_source` the wordmark and the header CTA carry.
 *
 * These strings predate the shared shell: the comparison, solution, and
 * generator layouts each hardcoded their own, and attribution reporting is
 * built on them. Deriving them from the path keeps that history continuous
 * rather than collapsing three sources into one and breaking the series.
 */
export function shellUtmSource(pathname: string, slot: "logo" | "nav"): string {
  const path = pathname.replace(/\/+$/, "");
  const kind = path.includes("/vs/")
    ? "vs"
    : path.includes("/solutions/")
      ? "solution"
      : path.includes("/generators") || path.includes("/tools")
        ? "generator"
        : "marketing";

  // Spelled out rather than templated, because the existing values are not
  // consistent with each other: the generator layout's CTA was
  // "generator-header-cta" while the others were "<kind>-nav". Reproducing the
  // inconsistency is the point; renaming them would split the reporting series.
  const sources: Record<string, { logo: string; nav: string }> = {
    vs: { logo: "vs-logo", nav: "vs-nav" },
    solution: { logo: "solution-logo", nav: "solution-nav" },
    generator: { logo: "generator-logo", nav: "generator-header-cta" },
    marketing: { logo: "marketing-logo", nav: "marketing-nav" },
  };
  return sources[kind][slot];
}

/** Where the wordmark and CTA point, with attribution attached. */
export function shellCtaHref(
  base: string,
  pathname: string,
  slot: "logo" | "nav",
): string {
  // Strip every trailing slash: during prerendering `resolve("")` is relative
  // ("./", "../../"), and keeping it would emit a broken "..//" path.
  const cleanBase = base.replace(/\/+$/, "");
  const source = shellUtmSource(pathname, slot);
  return `${cleanBase}/?utm_source=${source}&utm_medium=nav&utm_campaign=seo-funnel`;
}

/**
 * Footer links that only some public pages carried.
 *
 * SEOPageLayout passed these two as `extraLinks` while every other page showed
 * the standard set. Now that the shell owns the footer, the rule moves here
 * rather than disappearing: these are internal SEO links, and quietly dropping
 * them from the pages that had them would be an unannounced change to the
 * site's link graph.
 */
export function shellFooterLinks(pathname: string): MarketingNavItem[] {
  const seoLandingPages = [
    "/features/",
    "/solutions/",
    "/vs/",
    "/ai-rpg-campaign-manager",
    "/worldbuilding-tool",
  ];
  const isSeoLanding = seoLandingPages.some((p) => pathname.includes(p));
  if (!isSeoLanding) return [];
  return [
    { href: "/free-rpg-campaign-manager", label: "Free RPG campaign manager" },
    { href: "/worldbuilding-tool", label: "worldbuilding tool" },
  ];
}

/**
 * The header CTA's page-specific side effect.
 *
 * The generator pages tracked an `open_codex` action from their own header,
 * which the shared shell replaced. The shell is rendered by the route-group
 * layout, above the page in the tree, so the page cannot pass a handler down to
 * it; it registers one here instead. A plain module variable rather than a
 * store because this is an event hook, not rendered state.
 */
let ctaHandler: (() => void) | undefined;

/** Registers the handler and returns its cleanup, for use in an effect. */
export function registerShellCtaHandler(fn: () => void): () => void {
  ctaHandler = fn;
  return () => {
    if (ctaHandler === fn) ctaHandler = undefined;
  };
}

export function runShellCtaHandler(): void {
  ctaHandler?.();
}
