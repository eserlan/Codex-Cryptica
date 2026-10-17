# Implementation plan: Hex Journey mode

**Issue**: [#4148](https://github.com/eserlan/Codex-Cryptica/issues/4148), Release 2 of [#1957](https://github.com/eserlan/Codex-Cryptica/issues/1957)
**Branch**: `feat/4148-hex-journey-plan`
**Date**: 2026-10-17
**Foundation**: Release 1 in #4152; `specs/178-hex-crawl-mode/`
**Delivery artifacts**: This plan and [tasks.md](./tasks.md), updated during implementation.

## Outcome and scope

A GM chooses a destination hex, previews a straight route from the party or a selected origin, then advances one hex per click. Each successful step moves the chosen party token, reveals fog through the existing vision flow, marks the arrival hex explored, opens its panel, and records the move in the session journal according to the existing capture settings. Explore remains an explicit action.

Release 2 is complete when the same flow works in solo play and a GM-hosted VTT session, stopping preserves completed travel, and failed or repeated actions never skip a hex or repeat a committed move.

The scope excludes terrain-weighted pathfinding, group formations, timed movement, automatic encounters or discovery, calendar advancement, and saving unfinished routes across reloads. Existing map records, token persistence, discovery drafts and journal entries remain the durable results of travel.

## Current implementation and integration seams

| Existing code                                                         | Reuse or change                                                                                                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/map-engine/src/hex.ts`                                      | Reuse `getHexLine`, `hexDistance`, `pointToHex` and `hexToPoint`. A line includes both endpoints.                                                                 |
| `packages/map-engine/src/hex-travel.ts`                               | Reuse distance calculation; this provides hex counts, not travel duration.                                                                                        |
| `packages/map-engine/src/token-geometry.ts`                           | Reuse `getTokenCenter`; stored token `x/y` is the top-left corner.                                                                                                |
| `packages/hex-crawl-engine/`                                          | Extend the existing framework-free package with route construction, estimates and progress helpers.                                                               |
| `apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.ts`               | Reuse `setExplored`, `openHex` and persisted hex records.                                                                                                         |
| `apps/web/src/lib/stores/hex-crawl/hex-crawl-move-observer.ts`        | Keep manual movement observation; align token-to-hex conversion with token centres.                                                                               |
| `apps/web/src/lib/components/map/token-vision-revealer.ts`            | Align hex fog reveal with the token centre; keep the existing radius, mask and save behaviour.                                                                    |
| `apps/web/src/lib/components/map/solo-exploration-recorder.svelte.ts` | Reuse reveal, undo, tally and `formatMapMove` capture; measure from token centres and add explicit journey completion using before/after snapshots.               |
| `apps/web/src/lib/components/map/MapView.svelte`                      | Wire the journey and movement coordinator beside the existing recorder. Existing drag completion and reactive vision callbacks currently settle moves separately. |
| `apps/web/src/lib/components/map/hex-crawl/HexCrawlLayer.svelte`      | Compose journey controls and overlay with the existing GM-only panel.                                                                                             |
| `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts`             | Call existing movement and permission APIs through an adapter; do not add journey state here.                                                                     |
| `apps/web/src/lib/stores/vtt/vtt-grid-manager.svelte.ts`              | Read `gridDistance` and `gridUnit`. These are device-local measurement settings. There is no existing travel pace setting.                                        |
| `apps/web/src/lib/components/map/hex-crawl/HexCrawlPanel.svelte`      | Add destination/origin actions; preserve notes and cancel stale discovery when the selected hex changes.                                                          |

## User flow and decisions

1. Enable Hex Crawl mode on a hex map and open the destination's panel.
2. Choose **Travel here**. If there is one eligible party token, its current hex is the origin. With several eligible tokens, choose one explicitly; an eligible selected token is the initial choice.
3. Alternatively, choose **Set as journey start** in a hex panel, then open another hex and choose **Travel here**. Previewing this route does not require a token. Starting travel requires a chosen eligible token already in the origin hex; the app does not reposition a token to the origin.
4. Preview the route, total and remaining hexes, and distance in the map's unit. Enter an optional **Hours per hex** to show estimated total and remaining hours. Leave it blank to show distance with **Set hours per hex to estimate time**.
5. Choose **Start journey**, then **Next hex** once for each move. Starting the journey does not itself move the token. A route from a hex to itself has zero moves and cannot start.
6. After each step, the arrival panel shows the hex's terrain, notes, entities and discovery draft. For newly explored arrivals, show the existing explicit Explore invitation in both journey modes; use one invitation surface so solo play does not show it twice.
7. **Stop journey** clears the remaining route and keeps everything already completed. At the destination, show **Arrived** until the GM dismisses it or previews another route.

**Planning assumption about time**: Hours per hex is optional, finite and greater than zero, accepts decimals, and is kept only with the current route. No default ruleset or conversion from feet, miles or custom units is inferred. The user was offered distance per hour as the alternative. Changing the time input updates estimates without moving or writing data.

**Access**: Controls and the planned route are GM-only and unavailable in guest vaults or Player View. In a connected VTT session, only the host GM controls a journey. Ordinary token movement and the resulting fog updates continue to use existing VTT broadcasts. A journey moves one unlocked, movable vision-source token; notes, tiles and non-party tokens are excluded. Existing child-token following behaviour is retained by using the normal move API.

## Design

### 1. Pure route and progress helpers

Add `packages/hex-crawl-engine/src/journey.ts`, exported through its existing barrel.

- Validate finite integer axial coordinates and safe arithmetic before calling `getHexLine`. Negative axial coordinates are valid.
- Check `hexDistance` before allocating a line. Cap one route at **1,000 steps** to bound memory and overlay work; show a plain message asking for a nearer destination above that limit.
- Keep the origin in `hexes[0]`; `totalSteps = hexes.length - 1`. Progress starts at index zero, and the next step is always the immediately following hex.
- Compute distance as `totalSteps × gridDistance`, with the same formula for completed and remaining distance. Reject non-finite or non-positive map scale for measured travel.
- Compute optional hours as `steps × hoursPerHex`; guard overflow and invalid values. Keep numeric values in the model and format only in the UI.
- Produce immutable route/progress values and explicit invalid-route results. Same-hex preview is valid with zero distance.

The engine holds no browser objects, tokens, Svelte state, storage, AI calls or VTT transport.

### 2. A separate reactive journey store

Add `apps/web/src/lib/stores/hex-crawl/hex-journey.svelte.ts`. Use a constructor-injected class, created at the map-view composition boundary and exposed to its children. Do not add journey state to the map or VTT facades.

The transient state consists of:

- route identity, vault identity, map ID and grid geometry signature;
- origin, destination, ordered hexes and committed step index;
- selected token ID and expected current centre hex;
- captured map measurement and optional hours per hex;
- phase: `preview`, `ready`, `stepping`, `blocked` or `arrived` (no route means idle);
- an optional pending arrival save and a plain error message;
- operation generation and an AbortController for suppressing stale completions.

Expose `setOrigin`, `preview`, `selectToken`, `setHoursPerHex`, `start`, `step`, `retryArrival`, `stop` and `dispose`. `step` is guarded against re-entry and never queues additional clicks. Route and measurement identity are fixed at Start; changing grid geometry or map measurement invalidates an active route and requires a new preview. Label or viewport changes only redraw the existing route.

Before every step re-check the vault/map, Hex Crawl setting, GM/host access, token existence, movement permission, token centre and geometry. If the token moved externally from the expected hex, stop advancement with **The party moved. Plan the journey again.** Token removal or locking also prevents further movement. Check these conditions on both UI state changes and action entry.

### 3. One completion owner for journey movement

Add a small `MapMoveCoordinator` in `apps/web/src/lib/components/map/map-move-coordinator.ts` and a `HexJourneyMovement` adapter in `apps/web/src/lib/components/map/hex-crawl/hex-journey-movement.ts`.

The coordinator extracts the existing reveal → settle → hex-observer orchestration from `MapView`. It serialises completion work and gives explicitly managed journey moves ownership of their token's completion. The reactive vision effect may still reveal fog, but it must not separately record or explore a token while that token's journey move owns completion. Dedupe completion using token ID and before/after position snapshots, not token ID alone, so a later return to a hex still counts as a new move. Existing pointer/keyboard movement retains its current semantics and receives regression tests.

For one **Next hex** action:

1. Snapshot the original vault/map/grid, before-token geometry, target hex and operation identity. Acquire the coordinator's token completion ownership before mutating the token.
2. Calculate the target hex centre, subtract half the token's dimensions, and call the existing permission-checked movement adapter. Use the actual returned token after snapping/clamping, including its actual size. Validate that its centre reached the expected hex. Refused movement leaves progress unchanged; a different actual hex blocks further travel and requires replanning.
3. Once the token reaches the next hex, advance the committed index exactly once. Complete fog reveal/undo/tally and publish one `map-move` capture from explicit before/after snapshots. Add `completeJourneyMove` to the recorder for this purpose, including fog-off and non-solo journeys; preserve its existing default behaviour for normal movement. Centre-based coordinates must be consistent in the recorder and the hex observer.
4. Call `HexCrawlStore.setExplored` for the snapshotted map and arrival hex. This produces at most one additional `hex-explored` capture, only on the first exploration. Both capture types retain the existing journal switches and local event-bus handling. A revisit still records movement without repeating exploration.
5. If the view and operation are still current, centre the view as needed, open the arrival panel and offer Explore when newly explored. Never invoke discovery generation as part of stepping. Release completion ownership in `finally`.

**Failure and cancellation rules:**

- If the hex save fails after movement, retain the new token position and committed index, block Next, and offer **Retry saving this hex**. Retry only the pending arrival write; it must not move again or repeat the move capture. Do not pretend token, fog, map and journal writes form one transaction.
- A journal capture failure follows the existing isolated capture behaviour and does not move the party back.
- Stop or navigation prevents the next move and stale UI updates. It retains token movement and writes already committed or underway against the original map. Re-check access before starting any later side effect; never redirect a completion to a newly active map.
- Switching map/vault, changing grid geometry or measurement, disabling Hex Crawl, entering Player View, or unmounting disposes the route. Restore no active route after reload; normal persisted exploration and token/session state remain.
- Existing fog undo continues to work; Journey Stop is not undo. Moving the token externally, including through any existing movement undo, invalidates the route before further stepping.

### 4. Small journey components

Create `HexJourneyControls.svelte` for token choice, time input, Start/Next/Stop, progress, errors and retry. Create `HexJourneyOverlay.svelte` for the route and origin/current/destination markers. Compose both in `HexCrawlLayer.svelte`; the controls remain mounted when the hex panel closes.

- Overlay projection uses existing map transforms and hex centres; it never intercepts pointer events. Cull markers to the viewport; the full route is already bounded to 1,000 steps. Show completed and remaining sections distinctly without relying on colour alone.
- Panel actions receive callbacks rather than importing journey singletons.
- Every control is keyboard-operable, action buttons have explicit types and labels, status updates use a polite live region, and icons use the Iconify utility pattern. Apply semantic tokens across Fantasy Dark, Modern Light and Cyberpunk.
- Preserve text typed before a step: flush pending hex notes against the original hex identity before changing the panel. Cancel in-flight discovery on a hex/map change and on destruction, and ignore late results. Reuse the existing note debounce and discovery cancellation mechanisms; do not add another timer.
- A preview, selection, map pan or estimate change never saves the map or marks a hex explored.

## Files and responsibility boundaries

| Responsibility                     | Files                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Route maths and estimates          | `packages/hex-crawl-engine/src/journey.ts`, `tests/journey.test.ts`, `src/index.ts`                                       |
| Reactive progress and lifecycle    | `apps/web/src/lib/stores/hex-crawl/hex-journey.svelte.ts` and its tests                                                   |
| Move completion ownership          | `apps/web/src/lib/components/map/map-move-coordinator.ts` and its tests                                                   |
| Token movement and arrival adapter | `apps/web/src/lib/components/map/hex-crawl/hex-journey-movement.ts` and its tests                                         |
| Journey UI and projection          | `HexJourneyControls.svelte`, `HexJourneyOverlay.svelte` and component tests in the existing hex-crawl component directory |
| Composition                        | Minimal wiring in `MapView.svelte`, `HexCrawlLayer.svelte` and `hex-crawl-services.svelte.ts`                             |
| Existing behaviour affected        | Focused recorder, move-observer, panel and note tests alongside their current modules                                     |
| Acceptance and Help                | `apps/web/tests/hex-journey.spec.ts`, `apps/web/src/lib/content/help/hex-crawl-mode.md`, `vtt-solo-play.md`               |

`MapView.svelte` (597 lines) keeps its map composition responsibility and delegates the completion chain. `map.svelte.ts` (1,104), `map-interactions.svelte.ts` (784) and `vtt-token-manager.svelte.ts` (1,168) receive no journey logic. The 448-line recorder retains one responsibility: reveal and record completed movement; extract its movement measurement helper if the change crosses 500 lines. Help registration is a data module and needs no new article entry because the existing Hex Crawl article is extended.

## Implementation slices and acceptance

| Slice                       | Acceptance                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1: Preview a journey      | Party or selected origin to destination; correct endpoint-inclusive line, step count, distance and optional time; no writes.                                               |
| US2: Step through the route | One click moves exactly one hex in solo and host VTT; correct centre placement, fog, panel and captures; rapid clicks and revisits stay correct.                           |
| US3: Stop and recover       | Stop keeps partial progress; save retry does not repeat movement; permission loss, map changes, external movement and discovery cancellation cannot produce stale effects. |

Tests come before behaviour changes. Engine tests cover same hex, negative coordinates, adjacency along the line, invalid/unsafe input, length limits, decimal timing and overflow. Map tests cover centre-based movement, exploration and fog reveal for nonzero-size tokens. Adapter/store tests cover permission refusal, snapped movement mismatch, busy actions, duplicate completion callbacks, already explored hexes, fog off, VTT mode, persistence failures and cancellation during an awaited step.

Playwright covers a multi-step solo route with AI disabled, stopping after partial travel, retaining the explored hex after reload, and showing no restored route. Add a host-session scenario using existing VTT fixtures and a negative Player View case. Test journal assertions with capture enabled and disabled; no active journal must never block travel.

Manual validation checks responsive controls, keyboard/focus behaviour, all three themes, and overlay alignment at low/high zoom on pointy and flat grids. App tests do not need a live model or generated bitmap assets.

## Constitution and delivery gates

- **Library-first and simplicity (I, III):** Extend `hex-crawl-engine`, reuse existing hex maths, token geometry, movement, discovery and journal paths. No new dependency or pathfinding layer.
- **Tests and coverage (II, X):** Success plus meaningful failure/cancellation cases for each changed boundary; maintain existing coverage and validate the changed engine module to the package's 70% target.
- **AI and privacy (IV, V):** Route planning and stepping are local and do not call AI. Discovery remains explicit and governed by Release 1. Journey state never enters guest projections, published bundles, VTT snapshots or telemetry; only ordinary moved tokens and fog are broadcast.
- **Implementation quality and DI (VI, VIII):** Constructor-injected store/coordinator/adapter; Svelte 5 Runes; scoped errors and stale-result guards. No schema, storage key, migration or public route is added.
- **Help and language (VII, IX, XII):** Extend the Hex Crawl and solo help with planning, units/time, stepping, stopping, reload behaviour, token requirements and visibility. Use plain British English and existing Labels terminology.
- **Bounded responsibility (XIV):** New state and orchestration have separate modules. Larger existing modules get only call-site wiring or changes within their existing responsibility, with the recorder size reviewed explicitly.
- **Discovery registry (XIII):** Not applicable; no public discovery surface changes.

For implementation handoff run only impacted checks: focused engine/web/Playwright tests, `bun run test:changed`, `bun run lint:changed`, affected-workspace type checks, Fallow audit and the Codex-Cryptica specialist review. Run `bunx fallow audit --format json --quiet --explain --gate-marker agent` before each commit/push and review with `bunx fallow review --base staging --brief` before the PR. Create a ready-for-review PR to `staging` that closes #4148. Reassess parent #1957 when that PR merges; its remaining release scope should then be complete.
