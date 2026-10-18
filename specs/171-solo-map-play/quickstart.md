# Quickstart: validating Solo Map Play

## Prerequisites

- `bun install` at the repo root.
- `bun run --cwd apps/web dev`, then open a vault with a map that has an image.

## 1. Concealment (US1, FR-001 to FR-007)

1. Open the map, turn **VTT ON**, **GRID: ON** (Hex Pointy in grid settings) and **FOG: ON**.
2. Add a token, right-click it and choose **Hide from Guests**. Add a note and a pin with **LABELS: ON**. Leave all three in an unrevealed area.
3. Turn **SOLO: ON**.
4. Expect nothing in the fogged area: no terrain, token, note marker, pin or pin label.
5. Right-click a hex there and choose **Reveal hex**. Expect everything in that hex to appear, including the hidden token (FR-007).
6. Move the hidden token, use the fog brush and add a tile. Expect each to work as with SOLO off (FR-003).

Automated: `bunx vitest run src/lib/components/map/MapOverlays.test.ts src/lib/components/map/map-fog-painter.test.ts` in `apps/web`.

## 2. Exploring by moving (US2, FR-008 to FR-012)

1. Set **Distance per Cell** to `6` and **Unit Name** to `mi`.
2. Mark a token **Vision Source (PC)** and set Vision to 1 hex.
3. Move it three hexes, one at a time. Expect each move to reveal its neighbours, and the readout to show "Last: 1 hex (6 mi) · Total: 3 hexes (18 mi)".
4. Press `Ctrl` + `Z`. Expect the last move's reveal to be hidden again.
5. Switch the grid to Square. Expect a circular reveal and travel in miles, as before.

Automated: `bunx vitest run src/hex-travel.test.ts` in `packages/map-engine`, plus the recorder tests in `apps/web`.

## 3. Journal (US3, FR-013 to FR-017)

1. Start a Session Journal. Repeat the three moves and roll a die in between.
2. Expect three `map-move` entries in order, with the roll between them, and no more than one entry per move.
3. Switch **Record map moves** off and move again. Expect no new map entry, while a roll is still recorded.
4. End the journal and move again. Expect nothing recorded.
5. Promote a map entry to a Location note. Expect it to work like any other entry.

Automated: `bunx vitest run` in `packages/session-journal-engine` and `src/lib/stores/session-journal-capture.test.ts` in `apps/web`.

## 4. Help and Cif (US4, FR-018 to FR-020)

1. Hover and keyboard-focus **SOLO**. Expect the explanation to appear.
2. With AI on, ask Cif "How do I play this map solo?" on the map. Expect an answer from the solo guide and a "Show me solo fog" offer.
3. Turn AI off and open Help. Expect the **Solo Map Play** article.

Automated: `bunx vitest run` in `packages/help-engine` (evaluation set, SC-006).

## Gates

`bun run lint:changed`, `bun run test:changed`, a scoped svelte-check in `apps/web`, `bunx fallow audit`, then redeploy the Worker for Cif after merge.
