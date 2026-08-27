# Tasks: VTT Tile Deck & Notes UI/UX Overhaul

**Epic**: VTT Tile Deck & Notes UX Improvements  
**Spec Ref**: [`docs/VTT_TILE_DECK_AND_NOTES_UX_IMPROVEMENTS.md`](../../docs/VTT_TILE_DECK_AND_NOTES_UX_IMPROVEMENTS.md)  
**Plan**: [`specs/2526-vtt-tile-deck-notes-ux/plan.md`](./plan.md)  
**Branch**: `feature/vtt-tile-deck-notes-ux`

---

## Phase 1: Armed Tile Placement Feedback

- [x] **1.1 Explicit Armed Tile State in `mapSession`**
  - Add `armedTile: { deckId: string; tileId: string; name: string } | null` reactive state in `mapSession.svelte.ts`.
  - Expose `armTile(deckId: string, tileId: string, name: string)` and `clearArmedTile()` actions.
  - Update `drawTile()` and `selectTile()` to set `armedTile`.
  - Add unit tests in `apps/web/src/lib/stores/vtt/vtt-tile-deck-manager.test.ts`.

- [x] **1.2 Active Thumbnail Ring Highlight in `TileDeckPanel`**
  - In `TileDeckPanel.svelte`, check if `mapSession.armedTile?.tileId === tile.id`.
  - Render active glowing outline (`ring-2 ring-theme-primary bg-theme-primary/10`) on the armed tile thumbnail button.
  - Add test in `apps/web/src/lib/components/vtt/TileDeckPanel.test.ts`.

- [x] **1.3 Placement Canvas Banner & Escape Key Cancellation**
  - Create canvas placement overlay/top-banner showing `"Click map to place [Tile Name] • Press [Esc] to cancel"`.
  - Attach global `Escape` keydown handler to call `mapSession.clearArmedTile()` and clear placement state cleanly without map mutations.
  - Add tests for Escape cancellation.

---

## Phase 2: Tile Browsing, Search & Drag-and-Drop

- [x] **2.1 Starter Catalog Metadata Verification**
  - Inspect starter pack catalog in `StarterTileDeckService.ts` and ensure `name` / `category` are semantic and clean.
  - Add optional `searchTerms?: string[]` to `TileDeckEntry` interface in `types/vtt.ts`.

- [x] **2.2 Search Input in `TileDeckPanel`**
  - Add compact text search input at top of tile grid in `TileDeckPanel.svelte`.
  - Filter visible tiles by matching query against `tile.name`, `tile.category`, and `tile.searchTerms`.
  - Ensure tile names remain discoverable without relying exclusively on hover.
  - Add `content-visibility: auto` styling to grid rows.
  - Add unit tests for search filtering in `TileDeckPanel.test.ts`.

- [x] **2.3 Desktop Drag-and-Drop for Tile Thumbnails**
  - Add `draggable="true"` on tile thumbnail buttons.
  - Wire `ondragstart` to pass tile drag payload reusing existing `mapSession` entity DnD handler.
  - Handle canvas drop event to place the tile at cursor coordinates.

---

## Phase 3: Stocking Control Redesign

- [x] **3.1 Accessible Segmented Mode Selector**
  - Replace `<select>` stocking mode dropdown in `TileDeckPanel.svelte` with segmented radio group: `[ None ] | [ Table Roll 🎲 ] | [ Encounter Note 📝 ]`.
  - Add full accessibility attributes (`role="radiogroup"`, `role="radio"`, `aria-checked`, keyboard arrow navigation, focus rings).

- [x] **3.2 Frequency Stepper Chips**
  - Replace frequency `<select>` with 5 compact pill chips: `[ Every ] | [ 1/2 ] | [ 1/3 ] | [ 1/4 ] | [ 1/6 ]`.
  - Maintain $\ge 44\times 44\text{px}$ touch targets.

- [x] **3.3 Inline Searchable Random Table Picker**
  - When "Table Roll" is selected, render a clean inline combobox/picker to choose random tables.
  - Add unit tests verifying mode switching, frequency updates, and keyboard interaction in `TileDeckPanel.test.ts`.

---

## Phase 4: Note Editing, Preview & Vault Synchronization

- [x] **4.1 Editable Note Titles in Inspector**
  - In `TokenDetail.svelte`, render an inline editable input when `selectedToken.kind === 'note'`.
  - Update note title on input/blur via canonical `mapSession.updateToken(selectedToken.id, { name: nextName })`.
  - Add unit tests in `TokenDetail.test.ts`.

- [x] **4.2 Markdown Edit/Preview Toggle**
  - In `TokenNoteEditor.svelte`, add a segmented `[ Edit ] | [ Preview ]` toggle toolbar button.
  - Render preview using existing `packages/map-engine/src/note-markdown.ts` parser.
  - Add unit tests in `TokenNoteEditor.test.ts`.

- [x] **4.3 Two-Way Vault Sync & Session Hydration**
  - On canvas note edits: debounce write to linked vault entity (`vault.updateEntity()`).
  - Flush pending vault write immediately on Inspector blur / close or unmount.
  - On session bootstrap/load: hydrate linked tokens (`name`, `noteBody`) directly from `vault.entities[entityId]`.
  - When linked entity is deleted in Vault: clear `entityId` on token and retain as unlinked map note.
  - Add "Open in Zen" button (`modalUIStore.openZenMode(entityId)`).
  - Add unit tests verifying synchronization lifecycle.

---

## Phase 5: Tile–Note Association & Navigation

- [x] **5.1 Single-Source `parentTokenId` Data Model**
  - Add optional `parentTokenId?: string` to `VTTToken` schema in `packages/schema` / `types/vtt.ts`.
  - When auto-stocking places a note on draw, assign `note.parentTokenId = tile.id`.
  - In `mapSession.svelte.ts`, create reactive derived helper `childTokensOf(parentId)` to resolve children.
  - Ensure backwards-compatible deserialization for legacy sessions.

- [x] **5.2 Delta Movement & Deletion Semantics**
  - When a parent tile is moved, translate all attached notes by coordinate delta `(dx, dy)`.
  - When a parent tile is deleted, set attached child notes `parentTokenId = undefined` (orphaned note preserved).
  - When a child note is deleted, parent tile is unaffected.
  - Add unit tests covering movement and deletion edge cases.

- [x] **5.3 Bi-directional Inspector Badges & Manual Linking Actions**
  - In `TokenDetail.svelte`:
    - Tile inspector shows: `[ 📝 Note: Guard Post ]` (clicking focuses the note).
    - Note inspector shows: `[ 🗺️ Room: 3x3 Chamber ] [ Unlink ]` (clicking focuses/pans to room tile).
    - Unlinked note inspector shows: `[ Link to room/tile… ]` (arms picker cursor to associate with any placed tile).
  - Add unit tests for linking, unlinking, and bidirectional navigation.

---

## Phase 6: Sidebar Layout Polish & Viewport Budgeting

- [x] **6.1 Fixed Top & Sticky Initiative Tracker**
  - In `MapVTTSidebar.svelte`, fix `VTTControls` at the top.
  - Position `InitiativePanel` as a sticky container below controls when combat is active.
  - For viewports `<850px` height: collapse `InitiativePanel` to a 1-line "Current Turn" active strip with expandable popover sheet.

- [x] **6.2 Scrollable Middle Workspace with Height Protection**
  - Set middle container to `min-h-[260px]` with internal scroll.
  - Contain collapsible accordions for `TileDeckPanel` and `Vault Entities`.

- [x] **6.3 Pinned Bottom Inspector**
  - Position contextual `TokenDetail` pinned at the bottom when an item is selected.
  - Cap height to max 35–45% (`max-h-[240px]` on short screens) with internal scrolling.
  - Closing Inspector unpins it and restores full workspace height without scroll displacement.

- [x] **6.4 End-to-End Acceptance Test Verification**
  - Run Playwright E2E test verifying the primary acceptance scenario: draw/place 6 tiles, stock 2 notes, open/edit each note, and return to placement with zero manual scrolling required.
