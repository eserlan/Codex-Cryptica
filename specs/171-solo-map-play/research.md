# Research: Solo Map Play

All findings are from the code on `staging` at `6be617d6a`, after #3838 (SOLO fog) shipped.

## R1. What can still show inside a fogged area with SOLO on

**Decision**: Only HTML drawn over the map canvas needs work, and pin labels were the one passive leak. Keep everything drawn on the canvas as it is.

**Rationale**: `renderMap` draws the map image, tiles, tokens (including notes, collapsed note markers, token labels, health bars and facing indicators), pins and the grid with hex coordinate labels, and then draws the fog above all of them (renderer step 6). At full opacity that conceals everything on the canvas. The HTML layer above the canvas (`MapOverlays.svelte`) holds pin labels, which #3838 already hides under solid fog, plus popovers that only open when the user clicks something (pin popover, health bar popover, context menu). The measurement line is drawn after the fog, but it is the user's own action.

**Alternatives considered**: Removing tokens in fogged areas from hit testing, so a blind click into fog cannot select a hidden token. Rejected: FR-003 requires every GM tool to keep working, and moving a hidden monster through the fog is a GM tool. A deliberate click is the GM's choice. The same reasoning applies to the initiative list, which only lists tokens the GM added.

## R2. Fail-safe concealment (FR-006)

**Decision**: `MapFogPainter.isRevealedAt` returns `false` when there is no mask to read, and keeps returning `true` for a point outside the map image.

**Rationale**: A mask is missing only while it loads, and an unpainted mask means everything is fogged, so "not revealed" is the truthful default. Outside the image there is no fog at all, so a pin there is visible on the canvas anyway.

**Alternatives considered**: Hiding every label until the mask loads, via a separate loading flag. Rejected as an extra state that says the same thing as "no mask".

## R3. How party vision reveals today

**Decision**: Reuse `TokenVisionRevealer` and the vision source tokens. Move the reveal-on-move effect out of `MapView.svelte` into a new `SoloExplorationRecorder`, and give the hex path an exact hex radius.

**Rationale**: `MapView.svelte` already re-runs a reveal whenever a vision source token moves (`visionSourceSignature`), for the GM only, punching whole hexes on a hex map (`punchHexFogRadius`). Two gaps against the spec:

- The hex radius is derived from pixels (`radius / (size * 1.5)`), so a range set in hexes does not round-trip exactly (FR-009).
- The reveal pushes no undo step, by design for #2414 (FR-011 needs one per move in solo play).

`MapView.svelte` is 572 lines, so the new behaviour goes into its own module rather than into it (Principle XIV).

**Alternatives considered**: Adding undo and travel inside `TokenVisionRevealer`. Rejected: it would mix a renderer-level helper with session bookkeeping (travel totals, journal events).

## R4. Sight in hexes (FR-009)

**Decision**: Keep the single `visionRange` setting in grid units. On a hex map, show and edit it in hexes (`visionRange / gridDistance`), and reveal with `round(visionRange / gridDistance)` as the hex radius.

**Rationale**: One stored value keeps square and gridless maps unchanged (FR-012) and needs no migration. Only the hex path changes how it reads the value.

**Alternatives considered**: A separate `visionHexes` setting. Rejected: two settings for one idea, which would disagree when the grid type changes.

## R5. Undo per move (FR-011)

**Decision**: Extract the snapshot-and-push-undo logic in `MapFogPainter` into a small `MaskUndoRecorder`. The painter and the exploration recorder both use it. A move's reveal becomes one "Map Exploration" undo step, recorded only when SOLO is on.

**Rationale**: The painter already snapshots the mask before a stroke and pushes undo and redo that restore it. Reusing that keeps undo behaviour identical across brush, hex menu and moves. Limiting it to SOLO leaves the multiplayer reveal behaviour (#2414: passive, no undo) unchanged, as the spec's out-of-scope note requires.

**Alternatives considered**: Undo for every vision reveal regardless of SOLO. Rejected: it would change existing behaviour outside solo play, which the spec does not cover.

## R6. Travel (FR-010)

**Decision**: Travel is measured per vision source token: the hex distance from the hex it left to the hex it entered, using `hexDistance`, converted with the map's distance per cell and unit name. The tally lives in memory for the map while it is open, with a "Reset" control. It is not persisted.

**Rationale**: `hexDistance`, `pointToHex` and the grid scale already exist. A "session" in the spec is the sitting the GM is playing. The durable record of the route is the journal (US3), so a persisted tally would duplicate it.

**Alternatives considered**: Persisting the tally with the VTT encounter session. Rejected for now: no requirement needs it, and it would add to the encounter snapshot format.

## R7. Journal capture (FR-013 to FR-017)

**Decision**: The exploration recorder publishes `JOURNAL:CAPTURE` events with a new entry type, `map-move`, one per move, containing the hexes travelled, the distance, the destination coordinates (when coordinates are shown) and the number of newly revealed hexes. Add an optional `captureMapMoves` flag to the journal record, defaulting to on, with a switch in the journal view.

**Rationale**: The journal's capture listener is source-agnostic. A new publisher needs no listener change (spec 163, SC-011), and `captureToEntryInput` already bounds entries. One event per move satisfies "grouped into one entry" (FR-014) without timers. Promotion works for any entry type (FR-016). The listener already does nothing when no journal is active (FR-017). An optional field on `SessionJournal` needs no migration.

**Alternatives considered**: A global device preference for map capture. Rejected: FR-015 asks for it per journal.

## R8. Help and Cif (FR-018 to FR-020)

**Decision**: Add a new Help article, `vtt-solo-play`, as the complete solo guide, linked from `vtt-fog-player-view`, `hexcrawl-maps` and the VTT overview. Register it in the `vtt-map` feature. The `vtt-solo-fog` flag, the SOLO highlight target and the "Show me solo fog" action already exist from #3838. Add evaluation questions per SC-006.

**Rationale**: One article per job keeps retrieval sharp, the same pattern as the #3824 VTT articles.

## R9. Constitution XIV: large files touched

| File                                             | Lines | Plan                                                                                    |
| ------------------------------------------------ | ----- | --------------------------------------------------------------------------------------- |
| `apps/web/src/lib/components/map/MapView.svelte` | 572   | The vision effect moves out to `SoloExplorationRecorder`; net lines go down.            |
| `apps/web/src/lib/stores/map.svelte.ts`          | 945   | No new behaviour. It keeps `soloFog` and `fogOpaque` from #3838 and gains nothing else. |
| `packages/session-journal-engine`                | small | An optional field and a capture formatter. No file over 500 lines.                      |
