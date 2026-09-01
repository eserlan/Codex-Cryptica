/**
 * Post-build script: inject fallback Open Graph / Twitter tags into the SPA
 * shell (`build/index.html`).
 *
 * Why this exists: the app routes are CSR-only (`ssr = false` in
 * `(app)/+layout.ts` and `(app)/+page.ts`), so the OG tags declared in
 * `(app)/+page.svelte`'s `<svelte:head>` are only added once client JS runs.
 * Social crawlers (Bluesky, Discord, Slack, …) fetch the raw HTML and never
 * execute JS, so they saw a shell with no `og:` tags at all and rendered a
 * link preview with no image.
 *
 * Why not `src/app.html`: that template also backs every *prerendered* page,
 * which already carries its own specific OG image (see #2510). Adding tags
 * there would give those pages a second, generic `og:image` — and most
 * crawlers take the first one, quietly overriding the specific artwork.
 * `build/index.html` is the adapter-static fallback (see `svelte.config.js`)
 * served for `/` and every non-prerendered route, so injecting here reaches
 * exactly the pages that lack tags and nothing else.
 *
 * Deliberately does NOT inject `<title>` or `<meta name="description">`:
 * client-side `<svelte:head>` appends its own, and a browser uses the *first*
 * `<title>` in the document, so a static one would freeze dynamic page titles.
 * Link previews read `og:title`/`og:description` anyway.
 *
 * Must run before the build script's `cp build/index.html build/404.html` so
 * the 404 copy inherits the tags. Idempotent — re-running is a no-op.
 *
 * `injectShellOg` is exported as a pure function so the rewriting rules are
 * unit-testable (see inject-shell-og.test.js); everything below the
 * direct-run guard is a thin CLI wrapper around it.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Default metadata, kept in sync with the tags in `(app)/+page.svelte` so a
 * crawler and a hydrated browser describe the page the same way.
 */
export const DEFAULT_SHELL_META = {
  title:
    "Codex Cryptica — Local-First RPG Campaign Manager & Worldbuilding Tool",
  description:
    "Codex Cryptica is a free, local-first RPG campaign manager and worldbuilding tool for GMs: private Markdown notes, visual lore graphs, timelines, offline prep, and optional AI — all in your browser.",
  image: "https://assets.codexcryptica.com/screenshots/living-lore-graph.png",
  imageAlt:
    "Codex Cryptica campaign vault showing an interactive knowledge graph and note editor",
  imageWidth: "1600",
  imageHeight: "1000",
  url: "https://codexcryptica.com/",
  siteName: "Codex Cryptica",
};

/** Marker so a re-run recognises its own output regardless of tag contents. */
const MARKER = "<!-- fallback-social-metadata (scripts/inject-shell-og.mjs) -->";

/**
 * Escapes a string for use inside a double-quoted HTML attribute. `&` must go
 * first so it doesn't double-encode the entities introduced below it.
 */
export function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Builds the tag block for the given metadata, escaping every value. */
export function buildOgBlock(meta = DEFAULT_SHELL_META) {
  const e = escapeAttribute;
  return [
    `\t${MARKER}`,
    `\t<meta property="og:type" content="website" />`,
    `\t<meta property="og:site_name" content="${e(meta.siteName)}" />`,
    `\t<meta property="og:title" content="${e(meta.title)}" />`,
    `\t<meta property="og:description" content="${e(meta.description)}" />`,
    `\t<meta property="og:url" content="${e(meta.url)}" />`,
    `\t<meta property="og:image" content="${e(meta.image)}" />`,
    `\t<meta property="og:image:alt" content="${e(meta.imageAlt)}" />`,
    `\t<meta property="og:image:width" content="${e(meta.imageWidth)}" />`,
    `\t<meta property="og:image:height" content="${e(meta.imageHeight)}" />`,
    `\t<meta name="twitter:card" content="summary_large_image" />`,
    `\t<meta name="twitter:title" content="${e(meta.title)}" />`,
    `\t<meta name="twitter:description" content="${e(meta.description)}" />`,
    `\t<meta name="twitter:image" content="${e(meta.image)}" />`,
    `\t<meta name="twitter:image:alt" content="${e(meta.imageAlt)}" />`,
    "",
  ].join("\n");
}

/**
 * Injects the fallback block immediately before `</head>`.
 *
 * Returns `{ status, html }` rather than throwing so the caller decides what
 * is fatal:
 * - `injected`    — tags added, `html` is the rewritten document
 * - `already-present` — the marker or a real `og:image` is already there
 *   (an SSR change that starts emitting genuine tags must not be duplicated)
 * - `no-head`     — no `</head>` to anchor to; `html` is returned unchanged
 */
export function injectShellOg(html, meta = DEFAULT_SHELL_META) {
  if (html.includes(MARKER) || html.includes('property="og:image"')) {
    return { status: "already-present", html };
  }
  if (!html.includes("</head>")) {
    return { status: "no-head", html };
  }
  return {
    status: "injected",
    html: html.replace("</head>", `${buildOgBlock(meta)}</head>`),
  };
}

const __filename = fileURLToPath(import.meta.url);

// Only run the CLI when executed directly, so tests can import the helpers.
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  const shellFile = resolve(dirname(__filename), "../build/index.html");
  const { status, html } = injectShellOg(readFileSync(shellFile, "utf-8"));

  if (status === "already-present") {
    console.log("[shell-og] build/index.html already has OG tags — skipping.");
  } else if (status === "no-head") {
    console.error("[shell-og] No </head> found in build/index.html — aborting.");
    process.exit(1);
  } else {
    writeFileSync(shellFile, html);
    console.log(
      "[shell-og] Injected fallback OG/Twitter tags into build/index.html.",
    );
  }
}
