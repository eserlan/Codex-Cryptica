# Mobile Performance Investigation — Large Vaults (Pixel 8)

**Date:** 2026-07-01
**Branch:** `fix/1576-large-vault-performance` (PR #1577)
**Trigger:** User reported the graph view "struggled" on a Pixel 8 with a
1600-entity vault, and asked for a simulated phone perf profile (CPU, memory)
to quantify it.

## Summary

Two real bugs were found and fixed along the way (both already shipped to this
branch, see commits `4d6005c1` and `c37b0504`):

1. **"Browse Files" button in the import dropzone did nothing.** A
   `contenteditable` editor div was stacked above the button due to flex
   z-index rules, silently swallowing clicks.
2. **"Show full graph" link did nothing, and the graph became unusable
   afterwards.** The bottom-left HUD status badges overlapped the graph
   toolbar on desktop widths, so clicks meant for the link actually hit the
   Timeline toggle button underneath — switching into Timeline mode blanked
   the graph for vaults with no dated entities.

Separately, the focus-view default render target was bumped from 150 to 500
nodes per request, since desktop hardware handles it comfortably.

**The requested Pixel-8 CPU/GPU simulation could not be completed** — the
sandboxed browser available to me has no path to real device emulation or CPU
throttling (details below). What I could measure (JS heap, seed/index timing)
is reported, but it does not explain "struggled" on its own; the likely
culprit is render/layout CPU cost, which needs a real-device profile to
confirm.

## What I did to get here

### 1. Reproduced the reported bugs live, in a real browser

Rather than reasoning from code alone, I drove the actual deployed preview
(`fix-1576-large-vault-perform.codex-cryptica.pages.dev`) with browser
automation (`claude-in-chrome` MCP tools) and seeded a 1600-entity / 9000-edge
vault directly into the in-memory entity store via
`window.__codex_vault_instance__`, using the same recipe as the existing
Playwright spec (`apps/web/tests/performance/large-graph.spec.ts`):

```js
vault.entityStore.entities = entities;
vault.entityStore.initializeInboundConnections();
vault.entityStore.rebuildIndexes();
```

This let me click the actual "Browse Files" and "Show full graph" controls
and observe the real (broken) behavior instead of guessing from the source.

### 2. Root-caused via `elementFromPoint`, not visual inspection

For the "Show full graph" bug, a screenshot alone didn't explain why nothing
happened. I confirmed the actual cause with:

```js
const r = showFullButton.getBoundingClientRect();
document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
// -> returned the Timeline toggle button, not "Show full graph"
```

This proved the click was being intercepted by an overlapping element before
I touched any CSS, which is why the fix targets the actual overlapping
container rather than guessing at cosmetic changes.

### 3. Verified fixes against a redeployed preview

Both fixes were pushed, CI/Cloudflare Pages redeployed, and I re-ran the same
live reproduction (button click, seeded 1600-entity vault, mobile-width
viewport) to confirm:

- "Browse Files" now opens a real native file picker (confirmed by a CDP
  screenshot timeout while the OS dialog was open, then a clean state after
  dismissing it).
- "Show full graph" is now visibly clear of the toolbar at both desktop and
  mobile (412×915) viewport widths, and `elementFromPoint` no longer returns
  the wrong element.

### 4. Attempted the requested Pixel 8 simulation

I tried two approaches:

**a) Chrome DevTools Protocol device emulation** (`mcp__chrome-devtools__*`
tools support `emulate()` with `cpuThrottlingRate`, mobile viewport, and
`performance_start_trace` for Core Web Vitals / long-task analysis — exactly
the right tool for this). This requires a Chrome instance reachable via a
remote-debugging port (`localhost:9222`). No such instance was available in
this environment — every connection attempt failed with
`Failed to fetch browser webSocket URL from http://localhost:9222/json/version`.
There's no CPU throttling available to me without this.

**b) `requestAnimationFrame`/timer-based frame sampling** in the existing
`claude-in-chrome`-driven tab, at a Pixel-8-sized viewport (412×915). This
also didn't produce trustworthy numbers: the automated tab reports
`document.visibilityState: "hidden"` even while actively rendering (a quirk
of this sandboxed/headless-adjacent setup), which throttles `rAF` callbacks
and `setTimeout` intervals the way a real backgrounded tab would. A
30-iteration loop with intended ~16ms steps took ~30 **seconds** of wall time
— proof the timers were being clamped, not evidence of real jank.

Given (a) was unavailable and (b) was unreliable, I pivoted to metrics that
aren't gated by page visibility:

- `performance.memory` (JS heap) — reliable regardless of visibility state.
- Synchronous per-event handler cost, timed with `performance.now()` deltas
  around direct `dispatchEvent(PointerEvent)` calls on the cytoscape canvas
  (measures JS handler cost, not paint/compositor cost, but at least isn't
  timer-gated).
- `navigator.deviceMemory` / `navigator.hardwareConcurrency` to be explicit
  about how unlike a Pixel 8 this host machine is.

## Findings

| Metric                                           | Value                              | Notes                                                                         |
| ------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------- |
| Seed + index 1600 entities / 9000 edges          | ~353ms                             | One-time cost, this host's CPU                                                |
| JS heap after seeding (no graph rendered)        | ~45 MB                             |                                                                               |
| JS heap after graph render (500-node focus view) | ~48 MB                             | +~3MB for the rendered subset                                                 |
| Rendered canvas layers                           | 3 × 524×577px                      | Cytoscape's layered canvas renderer                                           |
| Per-`pointermove` JS handler cost                | avg 0.19ms, p90 0.30ms, max 0.30ms | Synchronous dispatch only; excludes paint                                     |
| This host's `navigator.deviceMemory`             | 16 GB                              | Pixel 8 has 8GB shared with the OS                                            |
| This host's `navigator.hardwareConcurrency`      | 12                                 | Pixel 8's Tensor G3 has weaker per-core throughput despite similar core count |

**Interpretation:** ~48MB of heap for a 1600-entity vault is not memory
pressure on a device with 8GB RAM — a Pixel 8 should not be OOM-struggling
from this. The per-event handler cost is negligible. Neither measured metric
explains "struggled." That leaves **render/layout CPU cost** (canvas
rasterization, fcose layout solve, style recalculation on pan/zoom) as the
most likely culprit — which is exactly the category of cost I have no way to
measure without either a CDP-attached Chrome or a real device.

## Proposed next steps

1. **Get a real trace from the actual phone.** This is the only way to get
   authoritative numbers. From a desktop machine with the phone connected via
   USB debugging:
   - Visit `chrome://inspect` on the desktop, find the Pixel 8's tab running
     the vault.
   - Open a full DevTools window against that remote tab, go to the
     **Performance** panel, hit record, then pan/zoom/toggle full-graph on
     the phone.
   - Stop recording and inspect the flame chart for long tasks, look at the
     **Rendering** tab for FPS meter / paint flashing, and check **Memory**
     for heap snapshots under real device constraints.
   - If useful, I can walk through interpreting that trace once captured.

2. **If a phone-attached trace isn't practical right now**, I can still make
   forward progress from code-level reasoning alone:
   - Make the focus-view default (`FOCUS_BASE_COUNT`, currently 500) responsive
     to device class — e.g. detect `navigator.hardwareConcurrency` /
     `navigator.deviceMemory` (both are available on Android Chrome) and use a
     smaller default (e.g. 150–250) on lower-tier devices, while keeping 500 on
     desktop-class hardware. This directly targets "struggled on my phone"
     without needing a trace to justify it.
   - Audit `GraphStyles.ts`'s `performanceMode` styles (triggered by
     `perfStylingActive`) to confirm they're actually engaging at 500 rendered
     nodes on mobile — the threshold in `isLargeGraphSize` may need a lower
     bound tuned per device class too, not just per node count.
   - Re-check `hideEdgesOnViewport`/`motionBlur` renderer hints
     (`applyLargeGraphRenderHints` in `graph-engine/src/index.ts`) are
     reliably re-applied after the focus-view render count changes, since
     that patch only runs once render hints are re-synced.

3. **Once a device-class signal exists**, consider exposing it as a debug/HUD
   indicator (e.g. "Rendering N nodes — reduced for this device") so users
   like the one who reported this can self-diagnose without needing to file
   a bug with "it feels slow."
