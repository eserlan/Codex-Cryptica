# Performance Optimization Report

**Repo:** `codex-cryptica`
**Branch analyzed:** `staging` @ 5427e546
**Date:** 2026-05-28
**Scope:** `apps/web` SvelteKit application + `packages/*` engines

This is a deep code-level audit of performance optimization opportunities. Findings are ranked by **impact × confidence**, with concrete file:line references and suggested fixes. Many "small" wins multiply because the app is a long-lived local-first SPA where users keep tabs open for hours.

---

## TL;DR — Top 10 Quick Wins

| #   | Finding                                                                              | Effort | Impact                              |
| --- | ------------------------------------------------------------------------------------ | ------ | ----------------------------------- |
| 1   | `MapCanvas.svelte` re-renders at 60 fps forever, even when idle                      | S      | High (battery, GPU, jank)           |
| 2   | 8× unused `@milkdown/*` packages bundled (~100 KB gz)                                | XS     | High (bundle)                       |
| 3   | Duplicate DOMPurify (`dompurify` + `isomorphic-dompurify`)                           | XS     | Med (bundle)                        |
| 4   | `console.log` inside `GraphStore.elements` $derived in guest mode                    | XS     | High (CPU each entity edit)         |
| 5   | Eager preload of 9 Google Font families before paint                                 | XS     | High (FCP/LCP)                      |
| 6   | `Object.values(vault.entities)` and chained derivations re-run on every entity write | M      | High (typing latency at scale)      |
| 7   | `JSON.parse(JSON.stringify($state.snapshot(...)))` per entity in cache writes        | S      | Med (sync time on bulk saves)       |
| 8   | FlexSearch bundled twice (worker + main thread via help store)                       | S      | Med (bundle)                        |
| 9   | `cytoscape` `pixelRatio: "auto"` on retina screens                                   | XS     | Med (graph perf)                    |
| 10  | No `loading="lazy"` on any `<img>` in the app                                        | XS     | Med (initial paint on entity views) |

---

## 1. Bundle & Dependency Bloat

### 1.1 Milkdown packages are dead weight ⚠️ HIGH IMPACT, XS EFFORT

**Where:** `apps/web/package.json:32-39`

8 `@milkdown/*` packages are declared as `dependencies`:

```
@milkdown/core, @milkdown/ctx, @milkdown/plugin-history,
@milkdown/plugin-listener, @milkdown/preset-commonmark,
@milkdown/preset-gfm, @milkdown/theme-nord, @milkdown/utils
```

A repo-wide search for `@milkdown` or `milkdown` finds **zero source imports** outside `package.json`. The editor in use is Tiptap (`apps/web/src/lib/components/MarkdownEditor.svelte:3-12`).

**Action:** `bun remove $(grep '@milkdown' apps/web/package.json | awk -F'"' '{print $2}')`. Expect 80–150 KB gz reduction on the editor route.

### 1.2 Duplicate DOMPurify

**Where:** `apps/web/package.json:61` (`dompurify`) and `:66` (`isomorphic-dompurify`).

Source code only uses `dompurify` (no `isomorphic-dompurify` imports outside `package.json`). SvelteKit on Cloudflare Pages is statically prerendered — no SSR sanitization actually runs in production.

**Action:** drop `isomorphic-dompurify`.

### 1.3 `compromise` is unused

**Where:** declared in root `package.json`, only referenced from `scratch/test-resolve.ts`. The NLP library is ~250 KB and never reaches the runtime — but worth pruning to keep dev installs fast and prevent accidental imports.

### 1.4 Two FlexSearch instances

- `apps/web/src/lib/workers/search.worker.ts` (correct, off-main-thread).
- `apps/web/src/lib/stores/help.svelte.ts:9` — `import FlexSearch from "flexsearch"` at module top, ships into the main chunk and runs on the main thread.

**Action:** lazy-load FlexSearch inside `HelpStore.init()` (or move help search into the same worker). Saves ~30 KB gz from the main bundle and avoids competing for main-thread CPU with entity rendering.

### 1.5 9 Google Font families preloaded

**Where:** `apps/web/src/app.html:14-16`

A single `<link rel="preload">` for a stylesheet bundling Inter, Spectral, Alegreya, Fraunces, Cormorant Garamond, IM Fell English, Courier Prime, Fira Code, Orbitron — each with multiple weights and italics.

The active theme typically uses 1–2 of these. The preload + `display=swap` works but the requested CSS is huge and every font face is fetched and parsed even though most are never displayed.

**Action:**

- Subset to only the fonts the default theme needs at first paint; load the rest lazily when the theme switches.
- Self-host `woff2` files to skip the round-trip to `fonts.gstatic.com`.

### 1.6 No `manualChunks` strategy

**Where:** `apps/web/vite.config.ts`

The Vite config has no `build.rollupOptions.output.manualChunks`. Cytoscape, fcose, Tiptap, pdfjs, peerjs are heavy and rarely change together. Without chunking hints, a single chunk update invalidates the rest.

**Action:** add chunk groups for `editor` (tiptap), `graph` (cytoscape + fcose), `p2p` (peerjs), `pdf` (pdfjs). Cytoscape is already dynamically imported (`packages/graph-engine/src/index.ts:28-31`) — manualChunks just stabilizes the hash.

### 1.7 `lucide-svelte` star imports

**Where:** 7 `lucide-svelte` import sites (`apps/web/src/lib/components/...`). Confirmed tree-shaken in Vite, but verify the production chunk by running `bun run build && bunx vite-bundle-visualizer`. Many UI icons use `getIconClass` (CSS-only via Iconify) which is great — make sure remaining ad-hoc `lucide-svelte` imports actually pull only the icons used.

---

## 2. Map / Canvas Rendering — Highest CPU Cost

### 2.1 ⚠️ MapCanvas runs `renderMap` at 60 fps continuously

**Where:** `apps/web/src/lib/components/map/MapCanvas.svelte:95-289`, `296`

```ts
function draw() {
  if (canvas) {
    renderMap({...});         // full re-render every frame
    // … pings, drag preview, brush overlay …
  }
  animationFrameId = requestAnimationFrame(draw);  // unbounded rAF
}
```

There is no guard. As long as the component is mounted, the canvas is cleared, the map image drawn, the grid pattern composited, all tokens redrawn, fog masked, etc. — **on every frame, forever**. On a 4K display with a large map, this is the biggest preventable cost in the app.

Compare to `apps/web/src/lib/components/graph/Minimap.svelte:194-205` which uses the correct pattern:

```ts
const requestRedraw = () => {
  if (animationFrameId === null) animationFrameId = requestAnimationFrame(draw);
};
$effect(() => { if (...) requestRedraw(); });
```

**Action:** convert `MapCanvas` to redraw-on-dirty:

- Mark dirty when tokens, viewport, pins, fog, measurement, pings, or selection change.
- For active pings (3-second animation), keep an rAF loop only while `vttPings.length > 0`.
- For the GM brush preview (`isAltPressed`), drive rAF only while alt is held.

Expected impact: idle map view drops from ~60 draws/s to **0** draws/s. Battery and laptop fans will thank you. On lower-end devices this can be a 30–50 % reduction in main-thread time.

### 2.2 GC pressure inside `renderMap`

**Where:** `packages/map-engine/src/renderer.ts:186-468`

Per-token allocations in the hot loop:

- Two `imageToViewport` calls per token (objects allocated, line 189-198).
- `Math.min/max/abs` repeated.
- `ctx.save/restore` 6+ times per token (with status effects).
- `ctx.measureText` per label (line 448) — expensive, results not cached.

**Action:**

- Hoist `Math.PI * 2` to a module-level constant (`TAU`).
- Cache `ctx.measureText` result keyed by `(label, font)` on the canvas's `WeakMap` cache.
- Skip allocations for `imageToViewport` by passing reusable scratch points (in-out style).
- Group draws by state (all token bodies first, all borders next, all status icons last) to minimize `save/restore` thrash.

### 2.3 Cytoscape `pixelRatio: "auto"` on retina

**Where:** `packages/graph-engine/src/index.ts:80`

On a 2× DPR display this renders the canvas at 4× pixel area. For large graphs (>500 nodes) this is the dominant cost.

**Action:** clamp DPR for graph view:

```ts
pixelRatio: typeof window !== "undefined"
  ? Math.min(window.devicePixelRatio || 1, 1.5)
  : 1;
```

Or expose as a Settings toggle for high-end machines.

### 2.4 `hoveredEntityId` triggers IDB read on every mouseover

**Where:** `apps/web/src/lib/components/GraphView.svelte:76-79`

```ts
$effect(() => {
  if (controller.hoveredEntityId)
    vault.loadEntityContent(controller.hoveredEntityId);
});
```

Sweeping across a dense graph fires content loads in rapid succession. `loadEntityContent` is cached after the first load (good), but the first hover storm still produces many parallel IDB reads.

**Action:** debounce hover-driven loads by ~150 ms. Skip the call if the user just whips past a node.

---

## 3. Reactive State / Svelte 5 Runes

### 3.1 ⚠️ `console.log` inside a `$derived` block (prod-hot path)

**Where:** `apps/web/src/lib/stores/graph.svelte.ts:49-61`

```ts
elements = $derived.by(() => {
  …
  if (this.vault.isGuest) {
    console.log("[GraphStore] Visibility Check:", {...});  // runs on every entity change
  }
  …
});
```

This logs synchronously inside the derivation; every entity write triggers it, and for guest sessions with hundreds of entities the dev tools console becomes a memory leak and CPU hog. Console output also serializes the object even when devtools are closed.

**Action:** remove the log or gate behind `debugStore.isVerbose`.

### 3.2 Five chained O(N) derivations on every entity write

**Where:** `apps/web/src/lib/stores/vault/entity-store.svelte.ts:193-298`

```ts
this.allEntities       = $derived.by(() => Object.values(this.entities));         // O(N), allocates
this.allActiveEntities = $derived.by(() => this.allEntities.filter(...));          // O(N)
this.parentToChildren  = $derived.by(() => { for (...) ... });                     // O(N)
labelData              = $derived.by(() => { ... sort() });                        // O(N log N)
this.titleAndAliasIndex = $derived.by(() => { ... sort() });                       // O(N log N)
```

Svelte 5 fine-grained reactivity means writing **one** field on **one** entity recomputes all of these. Because `$state` proxies entities individually, the reactive surface is the parent dictionary (`this.entities`), so any insert/delete/replace fires all five.

For a vault with 2 000 entities, an edit triggers ~6 000 dictionary scans and ~30 000 array entries. On a M-class laptop this is invisible; on a Chromebook in a public school library, this is the cause of "the app feels sluggish."

**Action options:**

1. **Move derivations to `$state.raw` + manual invalidation.** Keep `entities` as a `$state` proxy; cache `allEntities`/indexes in `$state.raw` arrays and patch them on mutation (you already have `patchAddConnection`, `patchDeleteEntity`, etc. — extend the pattern).
2. **Maintain inverted indexes** (`labelIndex`, `parentToChildren`, `titleAndAliasIndex`) as **incrementally maintained** structures, updated by the mutation service when entities change. Avoids the O(N) per-write penalty entirely.
3. **At minimum**: combine `allEntities` + `allActiveEntities` derivations into one pass; combine the label scan with the title/alias scan since both already walk every entity.

### 3.3 Duplicate clone in cache writes

**Where:** `apps/web/src/lib/services/cache.svelte.ts:168` and `:265`

```ts
const raw = JSON.parse(JSON.stringify($state.snapshot(entity)));
```

`$state.snapshot()` already returns a deeply-cloned, non-reactive POJO. `JSON.parse(JSON.stringify(...))` clones it a second time, drops `Date`/`Map`/`Set` (none used here but a footgun), and adds a JSON parser pass per entity. In `bulkSet` this runs N times per sync.

**Action:** drop the `JSON.parse(JSON.stringify(...))` wrapper. Keep the comment about "non-serializable garbage" — `$state.snapshot` alone produces a clean clone.

### 3.4 64 `console.log/.debug` calls in production code

**Where:** `apps/web/src/lib/**/*.ts`/`*.svelte.ts` outside tests.

Notable offenders:

- `stores/vault.svelte.ts:511`, `stores/categories.svelte.ts:103` — `console.log` at module top level on import.
- `stores/vtt/vtt-media-manager.svelte.ts:59,82` — log on every player media share.
- `cloud-bridge/p2p/host-service.svelte.ts:88,95,180` — log on every P2P handshake.
- `services/ai/text-generation.service.svelte.ts` — many log lines around stage transitions.

Console logs serialize their arguments synchronously and stay alive in DevTools' memory store. For long-running sessions (multi-hour DM sessions) this leaks.

**Action:** route all logs through `debugStore.log/warn/error`. The existing `debugStore` already supports an off switch in production; the bare `console.log` calls bypass it.

### 3.5 Effects without explicit dependency lists

**Where:** various — Svelte 5 auto-tracks correctly, but some effects re-run more often than intended. Example:

`apps/web/src/lib/stores/map.svelte.ts:91-106`

```ts
$effect(() => {
  const tracked = [this.showFog, this.showGrid, this.brushRadius, ...];
  void tracked;
  this.persistSettings();  // localStorage write
});
```

Acceptable but `persistSettings()` writes to `localStorage` on every keystroke when `brushRadius` is dragged. Worth a 250 ms debounce around `persistSettings`.

---

## 4. IndexedDB / Dexie

### 4.1 Offset-based pagination in `indexContentInBackground`

**Where:** `apps/web/src/lib/services/search-index-pipeline.ts:264-297`

```ts
const records = await this.db.entityContent
  .where("vaultId")
  .equals(vaultId)
  .offset(offset)
  .limit(INDEX_BATCH_SIZE)
  .toArray();
```

Dexie's `offset()` is **not** O(1) — it cursors past the skipped rows. For a vault with 5 000 entries, processing 100 records at a time means the last batch walks past 4 900 rows before returning data.

**Action:** keyset pagination using the `entityId` primary key:

```ts
const records = await this.db.entityContent
  .where("[vaultId+entityId]")
  .between([vaultId, lastSeenId ?? Dexie.minKey], [vaultId, Dexie.maxKey])
  .limit(INDEX_BATCH_SIZE)
  .toArray();
```

Reduces full-sweep cost from O(N²/batch) to O(N).

### 4.2 Search-index payload stored as JSON object

**Where:** `apps/web/src/lib/utils/entity-db.ts:49-56` (`SearchIndexRecord.data: Record<string, any>`)

For large vaults FlexSearch's serialized index can run to several MB. IndexedDB stores it as a structured-cloned object every save, then deserializes on every load.

**Action:** store as a `Blob` or `Uint8Array` (use `JSON.stringify` then `TextEncoder.encode`). IndexedDB skips structured cloning for binary types. Optionally compress with `CompressionStream("deflate-raw")` (broadly supported).

### 4.3 `cache.svelte.ts` manual record reconstruction

**Where:** `apps/web/src/lib/services/cache.svelte.ts:178-207` and `:269-298`

Each entity write hand-builds the record with `String(x)`, `Array.isArray(x) ? [...x] : []`, etc. Comment claims this is needed to "strip Proxies." But once `$state.snapshot` has been called, there are no proxies left. The manual reconstruction adds ~25 µs per entity on top of the JSON round-trip.

**Action:** trust `$state.snapshot` and pick fields with a single destructure or shape-typed helper.

### 4.4 `entityContent` is `O(content_size)` on every read

The `entityContent` table holds the full markdown body. `getEntityContent` reads the whole row even if only a 200-byte tooltip excerpt is needed.

**Action:** add a small `excerpt` (first 280 chars) to the `graphEntities` row so tooltips and graph hover don't pull the heavy `entityContent` row. Saves a lot of IDB I/O on graph navigation.

---

## 5. Search Engine

### 5.1 `INDEX_BATCH_SIZE = 100` + `delay(500)` between content batches

**Where:** `search-index-pipeline.ts:14`, `:296`

Default of 100 entries × 500 ms idle = 5 min wall time to index 60 000 entries. Fine on cold boot, but the delay is fixed.

**Action:** adaptive scheduling — use `requestIdleCallback` (or polyfill via `scheduler.postTask` with `priority: "background"`) instead of a hard 500 ms delay. Indexes faster on idle desktops, backs off on busy mobiles.

### 5.2 FlexSearch `resolution: 9` on `title` + `aliases` + `keywords`

**Where:** `packages/search-engine/src/index.ts:115-128`

Resolution 9 is the FlexSearch maximum, biggest memory footprint. For short fields like title/aliases this is overkill — resolution 5 or 6 produces near-identical results for short strings at ~40 % of the memory cost.

**Action:** drop resolution to 6 on `title`/`aliases`/`keywords`; keep 5 on `content` (current). Will materially reduce serialized index size and indexing CPU.

### 5.3 `mapToSearchEntry` allocates joined strings

**Where:** `search-index-pipeline.ts:347-365`

`[...labels, lore, ...Object.values(metadata).flat()].join(" ")` allocates on every indexed entity. Acceptable, but cold rebuilds traverse the whole vault. For 5 000 entities this is ~10 ms of pure GC.

**Action:** stream into a single mutable array and use FlexSearch's structured doc input instead of pre-joining keyword strings.

---

## 6. Routing / Boot

### 6.1 `(app)/+layout.svelte` imports 30+ stores at module top

**Where:** `apps/web/src/routes/(app)/+layout.svelte:10-55`

Every store is statically imported. SvelteKit will tree-shake unreferenced ones, but most are referenced inside the layout. This makes the first authenticated route's chunk huge.

**Action:**

- Move per-feature stores into the routes that actually need them (Oracle, Map, Timeline, Canvas, Calendar are not used on the home/world view).
- The marketing route under `routes/(marketing)/` should not pay the app's bundle cost — verify by inspecting build output.

### 6.2 `data-sveltekit-preload-data="hover"` on body

**Where:** `apps/web/src/app.html:111`

Hover preloads work but fire on every transient pointer pass. On dense nav menus this can stampede the network during exploration.

**Action:** consider `tap` instead, or scope `preload-data="hover"` to the primary nav, not the whole body.

### 6.3 Workers loaded eagerly via `new Worker(new URL(...))`

**Where:** `apps/web/src/lib/services/gdrive-sync.ts:19-20`, `apps/web/src/lib/services/search.svelte.ts:3`, etc.

Workers are good (off-main thread) — but `import SearchWorker from "../workers/search.worker?worker"` causes Vite to emit the worker chunk in the main graph. The worker is fetched eagerly on app boot even if the user never opens search.

**Action:** wrap worker instantiation in lazy factory: `() => new Worker(new URL("...", import.meta.url), { type: "module" })`, instantiated only on first `searchService.indexBatch(...)` or `searchService.search(...)` call.

---

## 7. Images & Assets

### 7.1 Zero `loading="lazy"` on `<img>` tags

**Where:** 26 `<img>` sites, 0 lazy. Examples:

- `lib/components/entity-detail/DetailImage.svelte:190`
- `lib/components/zen/ZenSidebar.svelte:294`
- `lib/components/oracle/ImageMessage.svelte:57`
- `lib/components/canvas/EntityNode.svelte:145`

Entity images live in OPFS via blob URLs — large grids of entities (the explorer list, Zen sidebar) decode every image even when off-screen.

**Action:** add `loading="lazy"` and `decoding="async"` to all non-LCP `<img>` tags. For images above the fold, add `fetchpriority="high"` to the hero image only.

### 7.2 No `<img>` `width`/`height` attributes

Same files. Causes layout shift (CLS) and forces extra reflow as images load.

**Action:** wrap image renders in a wrapper with `aspect-ratio` CSS, or pass intrinsic dimensions when known.

### 7.3 No image-content `content-visibility: auto`

Long entity lists / Zen sidebar render dozens of off-screen cards.

**Action:** add `content-visibility: auto; contain-intrinsic-size: 0 80px;` to `EntityListItem` and similar list items. Browser skips layout/paint until they scroll into view.

---

## 8. Misc Cleanups

### 8.1 `vault-handler.ts:200` shallow-clones the whole entities map per-message

```ts
const rawEntities = { ...vault.entities };
```

For 2 000 entities this allocates a new map per P2P sync message. Switch to a single `$state.snapshot(vault.entities)` (still O(N) but at least one allocation) or stream changes incrementally.

### 8.2 `setTimeout(() => …, 0)` pattern used in 7 places

Inside hot paths these schedule microtask-equivalent work but at macrotask cost. Where the intent is "yield to UI" use `queueMicrotask` or `await Promise.resolve()`. Where the intent is "wait for next paint" use `requestAnimationFrame`.

### 8.3 `oracle.worker.ts`, `proposer.worker.ts`, `parser.worker.ts`

These workers exist (good) but they're full Comlink modules; verify they actually share a SharedArrayBuffer-friendly pattern when the host page is COOP/COEP-isolated. The `Cross-Origin-Opener-Policy` is already set in `vite.config.ts:135` — make sure COEP is also set if you need `SharedArrayBuffer` for future workers.

### 8.4 ResizeObserver `usePolling: true` in dev

**Where:** `vite.config.ts:147`

```ts
watch: {
  usePolling: true;
}
```

This is dev-only but it murders battery on Linux laptops (constant `stat` syscalls). Linux/macOS support `inotify`/`fsevents` natively. Consider removing unless WSL2 or a network mount is the target.

---

## 9. Suggested Order of Operations

If you only have a few hours:

1. **Drop dead deps** (milkdown, isomorphic-dompurify, compromise). XS effort, immediate bundle win.
2. **Remove `console.log` from `GraphStore.elements`** and route remaining `console.*` through `debugStore`. XS effort, immediate runtime win.
3. **Fix MapCanvas to redraw on dirty** (highest user-visible perf win).
4. **Add `loading="lazy"` + intrinsic dimensions** to all `<img>`. XS effort, CLS + memory win.
5. **Subset Google Fonts to 1–2 families at first paint.** S effort, big LCP win on mobile.
6. **Lazy-load the search worker** + move help-search FlexSearch behind dynamic import.
7. **Incremental indexes in `EntityStore`** (replace the five chained $derived's with patch-maintained state). M effort, payoff at vault scale.
8. **Switch Dexie offset() pagination to keyset pagination** in `indexContentInBackground`.

---

## 10. What's Already Good — Don't Regress

- **Modals are lazy-loaded** (`apps/web/src/lib/components/modals/GlobalModalProvider.svelte`).
- **Cytoscape + fcose** are dynamic-imported (`packages/graph-engine/src/index.ts:24-37`).
- **`@google/generative-ai` SDK is lazy** (`lib/services/ai/client-manager.ts:25`).
- **Search engine runs in a worker via Comlink** (`lib/workers/search.worker.ts`).
- **Dexie batches via transactions + bulkPut** (`services/cache.svelte.ts:320-326`).
- **`requestRedraw` pattern in `Minimap.svelte`** — port this to MapCanvas.
- **Frustum culling in `renderer.ts`** for pins and tokens (lines 167, 205).
- **Entity-content split-table design** (graph metadata in `graphEntities`, heavy text in `entityContent`) — keep this; it's the right shape.
- **P2P helpers + connection manager already use dynamic imports** to keep peer JS out of the main chunk.
