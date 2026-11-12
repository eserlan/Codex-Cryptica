# Quickstart: Validating Generate Region

**Feature**: `4659-hex-region-generation`

How to prove the feature works. Details of the API are in [contracts/](./contracts/) and of the data in [data-model.md](./data-model.md).

## Prerequisites

```bash
bun install --frozen-lockfile
cd apps/web && bunx vite dev --port 5173 --strictPort
```

In the app: open a vault as GM, open a map with a hex grid, and turn on Hex Crawl for it. Turn AI off in settings for the whole run.

## Automated checks

Run from the repository root. Only impacted code is checked.

```bash
bun scripts/test-changed.mjs --base origin/staging
bun scripts/lint-changed.mjs --base origin/staging
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

Engine tests alone: `cd packages/hex-crawl-engine && bun test tests/region`

**Expected**: all pass; engine coverage for `src/region/` at or above 70%.

## Manual scenarios

### 1. Generate an area, cancel, then accept (Stories 1, 3, 7)

1. Tap an empty hex in open, empty country to open the hex panel.
2. Choose **Generate region → Generate area**. Set the radius to 4.
3. **Expect**: "Covers 61 hexes"; proposed terrain drawn with dashed outlines; the line "Generated on this device. No AI is used."; no network request in dev tools.
4. Note the seed. Choose **Cancel**. **Expect**: the map is exactly as before. Reload to confirm nothing was saved.
5. Repeat steps 1 to 2 and type the seed you noted. **Expect**: the same proposal as before.
6. Choose **Reroll**. **Expect**: a new seed and a different proposal.
7. Choose **Accept**. **Expect**: terrain is saved; an **Undo** bar appears.
8. Reload. **Expect**: the terrain is still there.

### 2. Coherence (Story 2)

1. By hand, set a few hexes to Forest on the west of an empty patch, Plains on the east, and Water along the south.
2. Generate an area covering the patch.
3. **Expect**: forest continues from the west, plains from the east; coast sits between land and the water; no mountain directly beside water; like terrain forms patches.

### 3. Protection (Stories 1, 6)

1. In an area holding hand-set terrain, notes, a pin, an explored hex and a hex with a saved discovery, generate an area over all of them.
2. **Expect**: hand-set hexes are not in the proposal and are counted as protected.
3. Accept. **Expect**: hand-set terrain, notes, pins, Explored flags and discoveries are unchanged; an explored hex with no terrain gained terrain and is still Explored.

### 4. Grow from a hex in passes (Story 4)

1. Open a hex at the edge of generated terrain; choose **Grow from this hex**; accept.
2. Repeat from a neighbouring hex twice more.
3. **Expect**: hexes from earlier passes never change; the joins look continuous; nothing is proposed off the map; on a hex with no empty neighbours you are told there is nothing to generate.

### 5. Fill gaps (Story 5)

1. Arrange two terrain areas 3 empty hexes apart, a third area 6 hexes from them, and leave one empty hex fully surrounded by terrain.
2. Open a hex between them; choose **Fill gaps**; set the radius to cover everything.
3. **Expect**: the 3-wide strip and the surrounded hex are proposed; the 6-wide strip and open country are not.

### 6. Adjust, regenerate and explored warning (Story 6)

1. Generate an area. In the preview, tap one proposed hex and change it to Swamp. Accept.
2. Mark two generated hexes Explored. Change one other generated hex's terrain by hand in the hex panel.
3. Choose **Regenerate** over the area and reroll.
4. **Expect**: the Swamp hex and the hand-changed hex are protected; the preview says how many hexes will change and how many explored hexes will change, and marks those on the map.
5. Cancel. **Expect**: nothing changed. Regenerate again and accept. **Expect**: only generated hexes changed; Explored flags are kept.

### 7. Presets and levels (FR-010)

1. Generate an area with **Arid**. **Expect**: mostly desert, hills and plains; little water.
2. Open **Customise**, set Water to None. **Expect**: the proposal updates with the same seed and no water.
3. Set every terrain to None. **Expect**: a clear refusal; nothing generated.

### 8. Undo (FR-028a, FR-028b)

1. Accept a region, then choose **Undo**. **Expect**: every affected hex is back as it was.
2. Accept a region, change any hex's terrain by hand. **Expect**: Undo is no longer offered.
3. Accept a region, switch to another map and back. **Expect**: Undo is no longer offered.

### 9. Failed save (FR-026)

In dev tools, make the vault save fail (or use the store test double), then Accept. **Expect**: a message that the map is unchanged; no hex changed; the review is still open and Accept works once saving is restored.

### 10. Phone (SC-009)

At 360 px wide with touch emulation, run scenario 1. **Expect**: every control reachable; the proposal visible above the sheet; the sheet collapses.

### 11. Persistence and privacy (SC-007, FR-034)

1. Export the vault, restore it into a new vault. **Expect**: generated terrain present and still regenerable.
2. Sync to a second device. **Expect**: the same.
3. Export a guest snapshot. **Expect**: no hex data in it.
4. While a review is open on one device, check a second device and Player View. **Expect**: no proposal visible.
