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
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const shellFile = resolve(__dirname, "../build/index.html");

// Kept in sync with the tags in `(app)/+page.svelte` so a crawler and a
// hydrated browser describe the page the same way.
const TITLE =
  "Codex Cryptica — Local-First RPG Campaign Manager & Worldbuilding Tool";
const DESCRIPTION =
  "Codex Cryptica is a free, local-first RPG campaign manager and worldbuilding tool for GMs: private Markdown notes, visual lore graphs, timelines, offline prep, and optional AI — all in your browser.";
const IMAGE = "https://assets.codexcryptica.com/screenshots/living-lore-graph.png";
const IMAGE_ALT =
  "Codex Cryptica campaign vault showing an interactive knowledge graph and note editor";
const URL_ = "https://codexcryptica.com/";

const OG_BLOCK = `	<!-- Fallback social metadata for CSR-only routes (see scripts/inject-shell-og.mjs) -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Codex Cryptica" />
	<meta property="og:title" content="${TITLE}" />
	<meta property="og:description" content="${DESCRIPTION}" />
	<meta property="og:url" content="${URL_}" />
	<meta property="og:image" content="${IMAGE}" />
	<meta property="og:image:alt" content="${IMAGE_ALT}" />
	<meta property="og:image:width" content="1600" />
	<meta property="og:image:height" content="1000" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="${TITLE}" />
	<meta name="twitter:description" content="${DESCRIPTION}" />
	<meta name="twitter:image" content="${IMAGE}" />
	<meta name="twitter:image:alt" content="${IMAGE_ALT}" />
`;

const html = readFileSync(shellFile, "utf-8");

if (html.includes('property="og:image"')) {
  console.log("[shell-og] build/index.html already has OG tags — skipping.");
  process.exit(0);
}

if (!html.includes("</head>")) {
  console.error("[shell-og] No </head> found in build/index.html — aborting.");
  process.exit(1);
}

writeFileSync(shellFile, html.replace("</head>", `${OG_BLOCK}</head>`));
console.log("[shell-og] Injected fallback OG/Twitter tags into build/index.html.");
