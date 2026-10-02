# Graph image loading after vault load

Date: 1 October 2026

## Problem and change

`GraphImageManager` sorted visible nodes first but then resolved every remaining
node, including offscreen images. Every painted batch also called
`cy.style().update()`, which updates all graph elements rather than only the
nodes in that batch. The installed Cytoscape source confirms this in
`src/style/apply.mjs`; its [batching documentation](https://js.cytoscape.org/#cy.batch)
explains automatic style updates for changed element data.

The manager now resolves nodes in the viewport plus a 15% margin, including node
size at the edges. Hidden nodes are skipped. Viewport, position and layout-stop
events trigger another sync, throttled to once per 80 ms. Queued nodes are
checked again before resolution so a pan does not keep draining the previous
view's offscreen queue. Overlapping syncs share one resolution pass with at most
24 active resolves. Existing batch painting and thumbnails remain in use.

Image data is applied inside a Cytoscape batch without refreshing the entire
stylesheet. The explicit stylesheet refresh when turning images off is retained.
Viewport listeners stop when images are disabled or the manager is destroyed.
Late results after cancellation are discarded and their acquired URLs released.

## Controlled Chromium measurement

One comparison in isolated headless Chromium, using a 1,200-node grid, 40-pixel
nodes, a 1,100 × 700 graph container, and a resolver with a fixed 10 ms delay.
Images use a tiny deterministic PNG. The detail view uses zoom 1; the overview
fits the entire graph. Each case uses a fresh graph and manager.

| View     | Version | Resolved images | First batch | Last batch | Full stylesheet refreshes |
| -------- | ------- | --------------: | ----------: | ---------: | ------------------------: |
| Detail   | Before  |           1,200 |      175 ms |   1,570 ms |                        60 |
| Detail   | After   |             117 |      124 ms |     182 ms |                         0 |
| Overview | Before  |           1,200 |       97 ms |   2,199 ms |                        60 |
| Overview | After   |           1,200 |       76 ms |   1,340 ms |                         0 |

This measures manager scheduling and rendering overhead, not real remote-host
latency, OPFS reads, thumbnail generation, or full application startup. It is a
single synthetic run rather than a performance budget or a user-vault benchmark.
An overview still requires all visible images. Slow remote hosts and full-size
images on hosts without CORS can still dominate loading time.

## Regression coverage

`packages/graph-engine/src/sync/ImageManager.test.ts` covers deferral and panning
in a 1,200-node vault, listener cleanup, hidden nodes, abandoning queued offscreen
work, bounded overlap, failed-image retries, cancellation and queued URL cleanup.
A real Cytoscape instance verifies that image selectors change through node data
updates without a full stylesheet refresh.

## Constitution check

The change stays in the existing graph-engine library and constructor-injected
resolvers. It adds no dependency, storage format or remote data processing.
Success and cancellation paths have tests. The source module remains below the
500-line review trigger. Public discovery routes are unaffected.

## Persistent thumbnails and shared fallbacks

Local originals without upload thumbnails now get a 200px derived thumbnail in
`.cache/local_thumbnails`. The cache key includes the path, file modification
time and size, and generator version. OPFS returns a File, so a warm load can
check its metadata without decoding or reading the original payload. Adapters
returning plain Blobs use a content hash instead. Existing `_thumb.webp` files
load directly; guest fetchers retain their existing behaviour.

Missing thumbnails return their originals immediately. A single background
worker generates previews after foreground reads settle, yielding between jobs.
Generation or cache-write failure leaves the original usable. Missing image files fall back to the node silhouette.
Temporary silhouettes are not painted onto image-backed nodes; failed images
use a stable silhouette fallback. Tinted data URIs are shared
by artwork URL and colour, with failed loads evicted for retry. Clearing a vault
prevents an in-flight thumbnail from publishing a URL into the next session.

Focused validation includes 1,000 distinct synthetic internal images: all
foreground reads complete without waiting for generation, with shared directory
handles. Additional tests cover persistent reuse, revision changes, background
write failures, queued cancellation and cancellation during generation.

## Chromium / OPFS measurement of thumbnail addition

An isolated Chromium run served from localhost used the current AssetManager,
image processor and GraphImageManager, with a full overview of 1,000 distinct
OPFS files. Each file held the same synthetic 1024×1024 JPEG (34,512 bytes).
The resolver explicitly decoded each returned image before reporting it ready.
Each phase used a new manager; the generated OPFS thumbnails survived between
phases. This is one sequential run, not a repeated statistical comparison or a
measurement of the user's vault. Timing excludes initial fixture creation.

| Phase                       | First batch | All 1,000 ready | Returned image bytes | Thumbnails generated | Successful file reads |
| --------------------------- | ----------: | --------------: | -------------------: | -------------------: | --------------------: |
| Originals                   |      227 ms |       14,450 ms |           34,512,000 |                    0 |                 1,000 |
| Generate missing thumbnails |      395 ms |       70,291 ms |            3,462,000 |                1,000 |                 1,000 |
| Cached thumbnails           |      340 ms |       16,168 ms |            3,462,000 |                    0 |                 2,000 |

The thumbnail path reduced returned bytes by about 90%, but did not improve
completion time in this run. Generation during resolution introduced a large
first-use delay. Cached resolution requires source metadata and thumbnail file
lookups, compared with one lookup for originals. These results do not justify
claiming faster loading. Further work should move generation out of the critical
loading path and reduce repeated directory/file lookups before rollout.

The user's localhost tab was also inspected through Chrome DevTools MCP. It had
1,625 nodes and 1,042 custom-image nodes before refresh. The refresh logs later
recorded 1,619 resolved visuals in 140,602 ms. That capture overlapped part of the
synthetic benchmark, and the node count/viewport changed during capture, so it
is not a clean user-vault performance baseline. An attempted second reload was
rejected by tool argument validation; no independent second refresh timing was
obtained.

## Background generation and shared directory handles

Missing previews now return the original immediately and enqueue derived artwork.
The background worker waits for foreground resolution to settle, processes one
image at a time and yields between jobs. Session directory handles are shared for
source and thumbnail reads. Source metadata is still checked on warm loads so a
replaced file does not reuse stale artwork. Writes retain vault-relative paths
for the OPFS adapter's sync fingerprint records. A vault clear drops queued jobs
and prevents an in-flight generation from starting a new cache write.

A second isolated Chromium run used the same 1,000-file fixture and decoding
measurement. Cached fixtures were prepared separately before the warm phase;
that preparation is excluded from the displayed-image timing.

| Phase                                | First batch | All 1,000 ready | Returned image bytes | Thumbnails generated during loading |
| ------------------------------------ | ----------: | --------------: | -------------------: | ----------------------------------: |
| Originals                            |      633 ms |       31,383 ms |           34,512,000 |                                   0 |
| Missing previews / background queue  |      827 ms |       32,038 ms |           34,512,000 |                                   1 |
| Cached previews / shared directories |      450 ms |       26,906 ms |            3,462,000 |                                   0 |

Within this run, warm loading was about 14% faster than originals and first use
was about 2% slower, with no wait for generating every thumbnail. Timing differs
substantially between runs, so compare phases within a run rather than claiming
the first run's absolute times as a baseline. This remains a synthetic benchmark,
not a clean user-vault refresh measurement.

## Flashing / redraw regression fix

A supplied 6.575-second screencast showed visible graph flashing while images
loaded. The pending-image implementation introduced a separate Cytoscape batch
per image-backed node to paint temporary silhouette artwork, followed by final
image batches. Failed-image silhouettes were treated as stale on every sync.
The renderer invalidates cached layers when elements change, so these writes
create substantial redraw work in a dense graph.

Temporary per-image silhouette writes are removed. Final visuals are coalesced
at 120ms intervals (or flushed once the pass completes). Failed image paths keep
a stable fallback for five minutes before a later sync may retry; changing a path
makes it eligible immediately. Unchanged URLs still receive required bookkeeping
without rewriting their image data, and a shared URL is not released while other
nodes still use its path.

An isolated Chromium reproduction used 1,200 nodes: 1,000 image-backed nodes
(including 50 failed images) and 200 silhouettes. Image resolution had a synthetic
15ms delay and real SVG image rendering. This isolates graph redraw overhead;
it does not measure full user-vault startup or CPU utilisation percentage.

| Metric                            |    Before |    After |
| --------------------------------- | --------: | -------: |
| Initial graph batches             |     1,060 |       16 |
| Time to apply initial visuals     | 14,642 ms | 3,508 ms |
| Requests on unchanged repeat sync |        50 |        0 |
| Batches on unchanged repeat sync  |         3 |        0 |
| Long main-thread tasks            |        54 |        9 |
| Total long-task duration          |  6,216 ms |   677 ms |

Regression tests cover a single batch for 1,000 immediately ready images, no
per-image placeholder writes, stable failure fallbacks and timed recovery, and
source changes while another node still uses the old shared image.

## Profile of a 1,625-node vault, and follow-up changes

A live profile of an existing 1,625-node, 2,610-edge vault (1,042 nodes with
images, zoomed out to fit) found that image loading took about 28 s after the
graph appeared, of which 20.8 s was Cytoscape redrawing. Reading all 430 unique
image URLs from OPFS took 0.6 s and decoding the thumbnails 0.4 s. One redraw
of the whole graph cost about 122 ms, but painted batches arrived every 120 ms,
so redraws ran back to back (158 redraws, 23.7 s). On the same live graph,
applying 861 images as 10-per-120 ms took 87 redraws and 10.4 s of redraw time;
150-per-500 ms took 6 redraws and 0.96 s. Pre-decoding images before painting
made no meaningful difference (0.90 s vs 1.0 s).

Changes made:

- **Spaced paints.** The first completed images paint after 120 ms; later
  flushes are spaced at least 500 ms apart. A late image is still painted at the
  next flush or when the pass ends.
- **Placeholder art.** `isPlaceholderImageUrl` (schema) recognises Scabard's
  stock `cross_categories/*.png` icons. The Scabard importer no longer stores
  them as an entity's image, and the graph transformer leaves them off nodes of
  already-imported vaults so those nodes get their silhouette. The entity's
  stored data is not changed.
- **No full-size copies beside thumbnails.** After an external image's thumbnail
  is generated, the full-size cached copy is removed (a full-size view fetches it
  again). Once per session and vault, after image loading settles, leftover
  originals that already have a thumbnail are removed. The profiled vault held
  340 MB of such copies for 240 images.
- **Warm reconcile.** Cache hits that match the entity already in memory no
  longer reassign the entity map, and a same-vault reload keeps the live entity
  objects instead of re-seeding fresh copies. Entities that the load finds are
  gone from disk are now also removed from the cache. Before, a stale cache row
  was re-seeded and re-removed on every load (two assignments of the entity
  map). In the profiled vault two such rows existed.
- **Hold, then show all at once.** A pass no longer shows images as they
  finish; it resolves every nearby image first and applies them in one batch
  (one redraw, about 2 s for 861 images in the earlier experiment). After 20 s
  (`holdMaxMs`) whatever is ready is shown in spaced batches, so a few slow
  hosts cannot keep the graph bare. Three live reloads showed one step from no
  images to all 728, 11-18 s after the graph appeared, with one final redraw of
  1.4-3.0 s.
- **Resolve concurrency 24 to 96.** Cached images resolve through a chain of
  small file-system awaits, each waiting for the main thread that Cytoscape
  redraws keep busy.

Not changed: lowering the large-graph threshold would cull the graph and drop
images, and cheaper edge styles gave 25-50% on a redraw at the cost of visible
arrows and curves, so edge rendering is left as is.

Measured on the same vault, dev server, visible tab, one run per row except the
last (two runs). "All" is when every image node had a resolved visual.

| State                                  | First image |   Half |     All |
| -------------------------------------- | ----------: | -----: | ------: |
| Before                                 |      12.9 s | 27.6 s |  41.3 s |
| Spaced paints + placeholders + cleanup |      10.2 s | 28.0 s |  43.8 s |
| Same, resolve concurrency 96           |   9.7-9.8 s | 16.6 s | 30-31 s |

Spaced paints alone halved redraw time (23.7 s to 12.6 s) but did not change
the finish time: the resolver was starved, not the painter. About 6 s of main
thread freeze per load is still unexplained. It is not the canvas or map
loaders, the local-folder sync (none linked), the cache preload, the entity
map assignments or the status/phase fields, each of which was timed in
isolation on an idle page. Redraws still take about 40% of the loading window.

## Boot ordering

On the dev server about 12 s pass before the graph appears. Almost all of it is
module loading: 860 unique modules (1,108 requests) are fetched one by one
before the graph view mounts, and the boot steps that wait on them (registry,
migration check, theme, templates) take under 50 ms together once loaded. A
production build bundles these into a few chunks, so the dev-server number is
not representative and should be re-measured on staging.

Two ordering changes apply to production too:

- Cytoscape and its layout plugin start downloading at boot
  (`preloadGraphCore`), instead of after the vault data arrives.
- Stat sheet, presentation and entity templates load alongside the vault files
  rather than before them, on app start and on vault switch. The theme still
  loads first because the graph style depends on it.

Trade-off to note: full-size external images are no longer kept once their
thumbnail exists, so opening one at full size fetches it from its host again
and does not work offline.

## Silhouette object URLs and zoomed-out detail

A staging profile showed one 7-12 s main-thread freeze per load inside
Cytoscape's `updateEleCalcs`. Instrumenting the dev build placed it in
`cleanStyle()` for nodes whose image had just been set. Silhouettes were tinted
SVG data URIs averaging 48 KB (1,081 nodes, about 53 MB of style strings).
Recalculating 300 such nodes after setting their image took 1.8 s; with the
same SVG as a `blob:` object URL it took 30 ms the first time and 2 ms after.
The graph now gets silhouettes from `loadSilhouetteImageUrl`, one object URL per
artwork and colour for the session, with the data URI as fallback where object
URLs are unavailable.

The existing level-of-detail classes now also simplify edges: below zoom 0.5
edges are straight without arrowheads and transitions are off; below 0.2 edges
are haystacks and only the theme texture is dropped (entity images and
silhouettes stay, where previously every background image was removed).
Elements added after setup get the current level, and thresholds have a 10%
exit margin. A full redraw at the overview zoom went from 97 ms to 53-56 ms.

Dev server, same vault, two runs after both changes: graph at 19.3 s / 11.3 s,
all images 6 s / 3.3 s after the graph, total long-animation-frame time 14.0 s /
7.7 s (23-27 s earlier the same day). The remaining long frame (about 4 s) comes
before the graph appears.
