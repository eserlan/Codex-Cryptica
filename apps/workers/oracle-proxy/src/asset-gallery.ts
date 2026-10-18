import {
  SILHOUETTES,
  SILHOUETTE_ASSET_VERSION,
} from "../../../../packages/schema/src/silhouettes";

/**
 * Live browsable index of the public `codex-cryptica-statics` R2 bucket,
 * served at assets.codexcryptica.com/gallery.
 *
 * This is an allowlist, not a blocklist, on purpose: the bucket also holds
 * `published/*` (real guest vault content), `vault-samples/*` (our own demo
 * vault art, still vault-shaped), `cloud-backup/*` (private per-user CC
 * Cloud Backup bundles — not even in the reference doc this page started
 * from, which is exactly the risk), and whatever gets added next that isn't
 * marketing/content art. A blocklist has to be updated every time something
 * new and private lands in the bucket; an allowlist just never shows it.
 * `silhouettes/` is deliberately excluded from this raw prefix walk too —
 * it's rendered separately below from the `SILHOUETTES` catalog, which has
 * names/categories a bare object key doesn't.
 */
const ALLOWED_PREFIXES = [
  "announcements/",
  "blog/",
  "discussions/",
  "images/",
  "og/",
  "screenshots/",
];

const ASSET_BASE = "https://assets.codexcryptica.com/";

interface GalleryEnv {
  BUCKET?: any;
}

interface BucketObject {
  key: string;
  size: number;
}

async function listAllObjects(bucket: any): Promise<BucketObject[]> {
  const objects: BucketObject[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 25; i++) {
    const page = await bucket.list({ cursor, limit: 1000 });
    for (const obj of page.objects) {
      objects.push({ key: obj.key, size: obj.size });
    }
    if (!page.truncated) break;
    cursor = page.cursor;
  }
  return objects;
}

function isAllowed(key: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function titleFromFilename(key: string): string {
  const filename = key.split("/").pop() || key;
  const stem = filename.replace(/\.[a-z0-9]+$/i, "");
  return stem
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const GROUP_META: Record<string, { title: string; note: string }> = {
  announcements: {
    title: "Announcements",
    note: "Launch & discussion imagery for Bluesky and GitHub Discussions posts.",
  },
  blog: { title: "Blog", note: "Legacy inline blog asset." },
  discussions: {
    title: "Discussions",
    note: "GitHub Discussions announcement images.",
  },
  images: {
    title: "Blog & Docs",
    note: "Blog post inline images and old in-app help screenshots.",
  },
  og: {
    title: "OpenGraph Cards",
    note: "16:9 social share cards for /for landing pages and reference answers.",
  },
  screenshots: {
    title: "Screenshots",
    note: "/generators and /tools page cards, feature cards, og:image.",
  },
};

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg)$/i;

function buildGroups(objects: BucketObject[]) {
  const byPrefix = new Map<string, BucketObject[]>();
  for (const obj of objects) {
    if (!isAllowed(obj.key)) continue;
    if (!IMAGE_EXTENSIONS.test(obj.key)) continue;
    const prefix = obj.key.split("/")[0];
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix)!.push(obj);
  }

  // Fixed order, fixed set — every id here has an ALLOWED_PREFIXES entry, so
  // nothing outside the allowlist can ever surface through this loop.
  const order = [
    "screenshots",
    "og",
    "announcements",
    "images",
    "blog",
    "discussions",
  ];
  const groups = [];
  for (const id of order) {
    const items = byPrefix.get(id);
    if (!items || !items.length) continue;
    items.sort((a, b) => a.key.localeCompare(b.key));
    const meta = GROUP_META[id] ?? { title: titleFromFilename(id), note: "" };
    groups.push({
      id,
      title: meta.title,
      note: meta.note,
      items: items.map((it) => ({
        key: it.key,
        url: ASSET_BASE + it.key,
        size: formatBytes(it.size),
        purpose: titleFromFilename(it.key),
      })),
    });
  }
  return groups;
}

function buildSilhouettes() {
  return SILHOUETTES.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    archetype: s.archetype,
    r2Path: s.r2Path,
    url: `${ASSET_BASE}${s.r2Path}?v=${SILHOUETTE_ASSET_VERSION}`,
  }));
}

export async function handleAssetGallery(
  _request: Request,
  env: GalleryEnv,
): Promise<Response> {
  if (!env.BUCKET) {
    return new Response("Gallery storage is not configured", { status: 500 });
  }

  const objects = await listAllObjects(env.BUCKET);
  const groups = buildGroups(objects);
  const silhouettes = buildSilhouettes();
  const totalFiles =
    groups.reduce((n, g) => n + g.items.length, 0) + silhouettes.length;

  const html = renderPage({ groups, silhouettes, totalFiles });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function renderPage(data: {
  groups: ReturnType<typeof buildGroups>;
  silhouettes: ReturnType<typeof buildSilhouettes>;
  totalFiles: number;
}): string {
  const dataJson = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Asset Ledger</title>
<meta name="robots" content="noindex, follow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #2c2013; --ink-dim: #6b5a3e; --parchment: #f7eed9; --parchment-deep: #efe2c2;
    --parchment-flat: #e8d9b4; --rule: #cdb98c; --rule-soft: #ddcda2; --gold: #b8862a;
    --gold-bright: #d4af37; --gold-ink: #6e4c14; --swatch: #fbf4e3; --shadow: rgba(60, 42, 12, 0.14);
    --font-display: "Cinzel", "Iowan Old Style", Georgia, serif;
    --font-body: "Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ink: #ecdfc0; --ink-dim: #b3a074; --parchment: #191308; --parchment-deep: #241b0e;
      --parchment-flat: #2c2110; --rule: #4a3c1f; --rule-soft: #3a2f18; --gold: #d9ae42;
      --gold-bright: #e6c158; --gold-ink: #f0d488; --swatch: #fbf4e3; --shadow: rgba(0, 0, 0, 0.45);
    }
  }
  :root[data-theme="dark"] {
    --ink: #ecdfc0; --ink-dim: #b3a074; --parchment: #191308; --parchment-deep: #241b0e;
    --parchment-flat: #2c2110; --rule: #4a3c1f; --rule-soft: #3a2f18; --gold: #d9ae42;
    --gold-bright: #e6c158; --gold-ink: #f0d488; --swatch: #fbf4e3; --shadow: rgba(0, 0, 0, 0.45);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--parchment); color: var(--ink); font-family: var(--font-body);
    -webkit-font-smoothing: antialiased; padding-inline: max(16px, calc((100vw - 1180px) / 2));
    background-image: radial-gradient(circle at 15% 8%, color-mix(in srgb, var(--gold) 7%, transparent), transparent 40%),
      radial-gradient(circle at 90% 0%, color-mix(in srgb, var(--gold) 5%, transparent), transparent 35%);
  }
  a { color: inherit; }
  h1, h2 { text-wrap: balance; font-family: var(--font-display); font-weight: 600; margin: 0; }
  header.masthead { padding-block: 40px 28px; border-bottom: 1px solid var(--rule); }
  .eyebrow {
    font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--gold-ink); display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
  }
  .eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--gold); }
  h1.title { font-size: clamp(32px, 5vw, 48px); letter-spacing: 0.01em; color: var(--ink); }
  .subtitle { margin-top: 12px; max-width: 62ch; line-height: 1.55; color: var(--ink-dim); font-size: 15px; }
  .subtitle code { font-family: var(--font-mono); background: var(--parchment-deep); border: 1px solid var(--rule-soft); padding: 1px 5px; border-radius: 4px; font-size: 0.92em; }
  .ledger-strip { display: flex; flex-wrap: wrap; gap: 10px 28px; margin-top: 22px; font-family: var(--font-mono); font-size: 12.5px; color: var(--ink-dim); }
  .ledger-strip strong { color: var(--ink); font-variant-numeric: tabular-nums; }
  .controls {
    position: sticky; top: 0; z-index: 5; background: color-mix(in srgb, var(--parchment) 92%, transparent);
    backdrop-filter: blur(6px); border-bottom: 1px solid var(--rule); padding-block: 14px; margin-top: 4px;
    display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px;
  }
  .search-field { position: relative; flex: 1 1 260px; max-width: 380px; }
  .search-field input {
    width: 100%; font-family: var(--font-body); font-size: 14px; padding: 9px 12px 9px 32px; border-radius: 8px;
    border: 1px solid var(--rule); background: var(--parchment-deep); color: var(--ink);
  }
  .search-field input:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; }
  .search-field input::placeholder { color: var(--ink-dim); }
  .search-field svg { position: absolute; left: 10px; top: 50%; translate: 0 -50%; width: 14px; height: 14px; color: var(--ink-dim); }
  nav.jumplist { display: flex; flex-wrap: wrap; gap: 6px; font-family: var(--font-mono); font-size: 11.5px; }
  nav.jumplist a {
    text-decoration: none; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--rule);
    color: var(--ink-dim); white-space: nowrap; transition: border-color 120ms, color 120ms, background 120ms;
  }
  nav.jumplist a:hover, nav.jumplist a:focus-visible { border-color: var(--gold); color: var(--gold-ink); background: var(--parchment-deep); }
  nav.jumplist a .count { font-variant-numeric: tabular-nums; color: var(--ink-dim); margin-left: 4px; }
  .no-results { display: none; padding: 60px 0; text-align: center; color: var(--ink-dim); font-family: var(--font-mono); font-size: 13px; }
  .no-results.visible { display: block; }
  section.group { padding-block: 34px; border-bottom: 1px solid var(--rule-soft); scroll-margin-top: 96px; }
  section.group:last-of-type { border-bottom: none; }
  section.group.hidden { display: none; }
  .group-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 6px; }
  .group-head h2 { font-size: 21px; color: var(--ink); display: flex; align-items: baseline; gap: 10px; }
  .group-head h2 .path { font-family: var(--font-mono); font-size: 12px; font-weight: 400; color: var(--gold-ink); letter-spacing: 0.02em; }
  .group-tally { font-family: var(--font-mono); font-size: 12px; color: var(--ink-dim); font-variant-numeric: tabular-nums; }
  .group-note { margin: 0 0 20px; max-width: 66ch; color: var(--ink-dim); font-size: 13.5px; line-height: 1.5; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 14px; }
  .grid.silhouette-grid { grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 10px; }
  figure.tile {
    margin: 0; background: var(--parchment-deep); border: 1px solid var(--rule-soft); border-radius: 10px; overflow: hidden;
    display: flex; flex-direction: column; box-shadow: 0 1px 2px var(--shadow); transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  }
  figure.tile:hover { transform: translateY(-2px); border-color: var(--gold); box-shadow: 0 6px 16px var(--shadow); }
  .thumb-wrap { aspect-ratio: 4 / 3; background: var(--parchment-flat); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
  .thumb-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .silhouette-grid .thumb-wrap { aspect-ratio: 1 / 1; background: var(--swatch); padding: 14px; }
  .silhouette-grid .thumb-wrap img { width: 100%; height: 100%; object-fit: contain; }
  figcaption { padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 2px; }
  .tile-name { font-size: 12px; font-weight: 600; line-height: 1.3; color: var(--ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .silhouette-grid .tile-name { font-size: 11px; font-weight: 500; }
  .tile-meta { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-dim); display: flex; justify-content: space-between; gap: 6px; }
  .tile-purpose { font-size: 10.5px; color: var(--ink-dim); line-height: 1.35; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  a.tile-link { text-decoration: none; display: contents; }
  footer.colophon { padding-block: 32px 48px; color: var(--ink-dim); font-size: 12.5px; line-height: 1.6; max-width: 66ch; }
  footer.colophon a { color: var(--gold-ink); text-decoration: underline; text-underline-offset: 2px; }
  @media (max-width: 520px) {
    .controls { flex-direction: column; align-items: stretch; }
    .search-field { max-width: none; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
  }
</style>
</head>
<body>
<header class="masthead">
  <p class="eyebrow">assets.codexcryptica.com</p>
  <h1 class="title">Asset Ledger</h1>
  <p class="subtitle">
    A live index of Codex Cryptica's public CDN — feature art, silhouette catalogue,
    OpenGraph cards, launch imagery — read straight out of <code>codex-cryptica-statics</code>
    on every request. Guest-published vaults, demo vault portraits, and the bundled tile
    pack are left out: that's other people's content (or vault-shaped, either way), not a marketing gallery.
  </p>
  <div class="ledger-strip" id="ledgerStrip"></div>
</header>
<div class="controls">
  <label class="search-field">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
    <input type="text" id="searchInput" aria-label="Filter assets by name or purpose" placeholder="Filter by name or purpose…" autocomplete="off">
  </label>
  <nav class="jumplist" id="jumplist" aria-label="Jump to group"></nav>
</div>
<main id="groupsRoot"></main>
<p class="no-results" id="noResults">No assets match "<span id="noResultsQuery"></span>".</p>
<footer class="colophon">
  Listed live from the <code>codex-cryptica-statics</code> R2 bucket via
  <code>env.BUCKET.list()</code> on every request (5 min edge cache) — silhouette
  names and categories come from the <code>SILHOUETTES</code> catalog in code.
</footer>
<script id="gallery-data" type="application/json">${dataJson}</script>
<script>
  const data = JSON.parse(document.getElementById("gallery-data").textContent);
  function fmtCount(n) { return n.toLocaleString("en-US"); }
  const htmlEscapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => htmlEscapes[character]);
  }
  function tile(item, isSilhouette) {
    const name = isSilhouette ? item.name : item.key.split("/").pop();
    const meta = isSilhouette ? (item.category + " · " + item.archetype) : item.size;
    const purpose = isSilhouette ? item.r2Path.split("/").pop() : item.purpose;
    const safeName = escapeHtml(name);
    const safeMeta = escapeHtml(meta);
    const safePurpose = escapeHtml(purpose);
    const safeSearch = escapeHtml((name + " " + purpose).toLowerCase());
    const safeUrl = escapeHtml(item.url);
    return \`<a class="tile-link" href="\${safeUrl}" target="_blank" rel="noopener noreferrer" data-search="\${safeSearch}">
      <figure class="tile">
        <div class="thumb-wrap"><img src="\${safeUrl}" alt="\${safeName}" loading="lazy" decoding="async"></div>
        <figcaption>
          <span class="tile-name">\${safeName}</span>
          <span class="tile-meta"><span>\${safeMeta}</span></span>
          <span class="tile-purpose">\${safePurpose}</span>
        </figcaption>
      </figure>
    </a>\`;
  }
  const root = document.getElementById("groupsRoot");
  const jumplist = document.getElementById("jumplist");
  let sectionsHtml = "";
  let jumpHtml = "";
  for (const g of data.groups) {
    if (!g.items.length) continue;
    jumpHtml += \`<a href="#g-\${g.id}">\${g.title}<span class="count">\${g.items.length}</span></a>\`;
    sectionsHtml += \`<section class="group" id="g-\${g.id}" data-group>
      <div class="group-head">
        <h2>\${g.title} <span class="path">\${g.id}/</span></h2>
        <span class="group-tally">\${fmtCount(g.items.length)} files</span>
      </div>
      <p class="group-note">\${g.note}</p>
      <div class="grid">\${g.items.map((it) => tile(it, false)).join("")}</div>
    </section>\`;
  }
  jumpHtml += \`<a href="#g-silhouettes">Silhouettes<span class="count">\${data.silhouettes.length}</span></a>\`;
  sectionsHtml += \`<section class="group" id="g-silhouettes" data-group>
    <div class="group-head">
      <h2>Silhouettes <span class="path">silhouettes/</span></h2>
      <span class="group-tally">\${fmtCount(data.silhouettes.length)} files</span>
    </div>
    <p class="group-note">Curated vector silhouettes (currentColor SVGs, normally tinted per-theme) used across entity cards, the graph view, and shared generator results. Shown here on a fixed light swatch since a plain &lt;img&gt; can't recolor them.</p>
    <div class="grid silhouette-grid">\${data.silhouettes.map((it) => tile(it, true)).join("")}</div>
  </section>\`;
  root.innerHTML = sectionsHtml;
  jumplist.innerHTML = jumpHtml;
  document.getElementById("ledgerStrip").innerHTML =
    \`<span><strong>\${fmtCount(data.totalFiles)}</strong> images</span>\` +
    \`<span><strong>\${data.groups.filter((g) => g.items.length).length + 1}</strong> groups</span>\` +
    \`<span>refreshed on load</span>\`;
  const searchInput = document.getElementById("searchInput");
  const noResults = document.getElementById("noResults");
  const noResultsQuery = document.getElementById("noResultsQuery");
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    let visibleGroups = 0;
    document.querySelectorAll("section[data-group]").forEach((section) => {
      let visibleTiles = 0;
      section.querySelectorAll(".tile-link").forEach((link) => {
        const match = !q || link.dataset.search.includes(q);
        link.style.display = match ? "" : "none";
        if (match) visibleTiles++;
      });
      const show = !q || visibleTiles > 0;
      section.classList.toggle("hidden", !show);
      if (show) visibleGroups++;
    });
    noResults.classList.toggle("visible", q.length > 0 && visibleGroups === 0);
    noResultsQuery.textContent = searchInput.value.trim();
  });
</script>
</body>
</html>`;
}
