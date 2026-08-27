# VTT Tile Deck & Map Notes: UI/UX Assessment & Best-Practice Improvements

## 1. Executive Summary

Recent VTT additions introduced procedural dungeon tile decks (starter packs + custom file uploads), automated stocking on draw (random tables and encounter seeds), and map note markers. While mechanically robust, the current user interface suffers from high cognitive load, nested `<select>` dropdown configuration fatigue, lack of visual feedback for armed tile placement, and disconnected note-to-tile workflows.

This document outlines the assessment of the current UI/UX and defines concrete, best-practice design patterns to streamline the GM workflow within Codex Cryptica's local-first Svelte 5 / Tailwind 4 architecture.

---

## 2. Current State Assessment & Friction Points

### 2.1 Tile Deck Panel (`TileDeckPanel.svelte`)

1. **Dropdown Stack for "Stocking on Draw"**:
   - Configuring tile stocking requires navigating 2–3 stacked native `<select>` elements (_Mode_, _Frequency_, _Table Picker_).
   - This feels like a backend settings form rather than an intuitive, fast-paced GM tool during live session play.
2. **Missing "Armed" Placement State**:
   - Clicking a tile in the grid or clicking "Draw" arms the placement cursor (`mapSession.drawTile()` / `selectTile()`), but the panel provides no persistent visual highlight, badge, or canvas bar indicating which tile is currently armed or how to cancel.
3. **No Direct Drag-and-Drop for Tiles**:
   - Vault entities support drag-and-drop onto the map canvas, but tile deck items only support click-to-arm.
4. **Tile Grid Density & Navigation**:
   - A tight 4-column thumbnail grid with hover-only labels makes navigating large decks (e.g. Kenney Scribble Dungeons with 159 tiles) slow and prone to misclicks.

---

### 2.2 Note Creation & Detail Editing (`TokenDetail.svelte` & `TokenNoteEditor.svelte`)

1. **Static, Non-Editable Note Titles**:
   - In `TokenDetail.svelte`, the token name is displayed in a static `<h3>{selectedToken.name}</h3>`. Once a note is placed, the GM has no way to rename it directly in the sidebar panel.
2. **Textarea Formatting Disconnect**:
   - `TokenNoteEditor.svelte` includes Markdown formatting buttons (`Bold`, `Italic`, `Heading`, `List`), but the editor itself remains a plain monochrome textarea with no inline formatting preview or syntax highlighting in the sidebar.
3. **Disconnected Note-Tile Association**:
   - When a tile is automatically stocked on draw, the note and the tile exist as two separate, unlinked tokens on the canvas.
   - Selecting the tile opens `SpatialImageDetails`; selecting the note pin opens `TokenNoteEditor`. There is no visual badge or navigation link connecting a room tile to its pinned room description.
4. **Vault Entity Handoff**:
   - "Keep in vault" creates a `Note` entity, but once linked, there is no quick action to open the entity in Zen mode or navigate to it in the editor.

---

### 2.3 Sidebar Vertical Real-Estate Overhead (`MapVTTSidebar.svelte`)

- When `InitiativePanel`, `TileDeckPanel` (with an expanded tile grid), `Vault Entities`, and `TokenDetail` are all active, the sidebar becomes an excessively tall vertical scroll container where tools fight for visibility and context is frequently scrolled out of view.

---

## 3. Target UI Architecture & Best Practices

```
┌─────────────────────────────────────────────────────────────┐
│                       VTT SIDEBAR                           │
│  [Tokens & Vault]   [ Dungeon / Tile Decks ]   [Initiative] │  <-- Segmented Mode Tabs
├─────────────────────────────────────────────────────────────┤
│  TILE DECK: Scribble Dungeons                      [Draw 🎲]│
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Stock on Draw:  [ Off ]  [ Table ▾ ]  [ AI Encounter ]│  │  <-- Segmented Button Group
│  │ Frequency:      Every room (1/1)  [ ▾ ]               │  │
│  └───────────────────────────────────────────────────────┘  │
│  Filter: [All] [Rooms] [Corridors] [Doors] [Stairs]         │
│  [ 🖼️ 1 ] [ 🖼️ 2 ] [ 🖼️ 3* ] [ 🖼️ 4 ]  (Drag or Click)       │  <-- *Active Ring Highlight
├─────────────────────────────────────────────────────────────┤
│  SELECTED NOTE: Guard Post #2                  [✏️ Rename]  │
│  Linked Room: [Tile #14 - 3x3 Chamber]                      │  <-- Room/Tile Link
│  ┌───────────────────────────────────────────────────────┐  │
│  │ <b>2 Goblins</b> arguing over a stolen key.             │  │  <-- Markdown Preview /
│  │ • <i>Morale:</i> Flees if leader drops.               │  │      Clean Editor
│  └───────────────────────────────────────────────────────┘  │
│  [ 📖 Kept in Vault ]  [ ↗ Open in Zen ]   [ 👁️ Reveal ]     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Concrete Improvement Specifications

### 4.1 Segmented "Stocking on Draw" Controls

Replace stacked `<select>` elements with a tactile segmented control group in `TileDeckPanel.svelte`:

- **Mode Selector**: `[ Off ] | [ Table 🎲 ] | [ Encounter ✨ ]`
- **Inline Table Picker**: When "Table" is active, display a clean searchable combobox or compact picker.
- **Frequency Stepper**: A compact badge stepper: `[ 1/1 (Every tile) ] [ 1/2 ] [ 1/3 ] [ 1/4 ]`.

### 4.2 Visual "Armed" & Placement State

- Expose the currently armed tile ID and deck ID in `mapSession.svelte.ts`.
- In `TileDeckPanel.svelte`, render an active glowing border (`ring-2 ring-theme-primary bg-theme-primary/10`) on the active tile thumbnail.
- Provide a persistent dismissable top notification or canvas overlay banner:
  > _"Click map canvas to place [Tile Name] • Press [Escape] to cancel"_
- Enable drag-and-drop (`onDragStart`) directly from the tile thumbnails onto the map canvas, matching Vault Entity drag ergonomics.

### 4.3 Editable Note Titles & Enhanced Editor

- In `TokenDetail.svelte`, allow inline renaming of note tokens:
  ```svelte
  {#if selectedToken.kind === "note"}
    <input
      bind:value={selectedToken.name}
      class="w-full bg-transparent text-sm font-bold uppercase font-header border-b border-transparent focus:border-theme-primary focus:bg-theme-bg/50 px-1 py-0.5"
    />
  {/if}
  ```
- In `TokenNoteEditor.svelte`:
  - Provide a tabbed or toggleable **Preview / Edit** view so GMs can review formatted room text before/during play.
  - When a note is linked to a vault entity ("Kept in Vault"), display an **"Open in Zen"** button (`modalUIStore.openZenMode(entityId)`) for distraction-free reading.

### 4.4 Note-Tile Bi-Directional Association

- When an auto-stocked tile is placed and spawns a note, store `parentTileId: string` on the note token (and optionally `noteId: string` on the tile token).
- In `TokenDetail.svelte`:
  - When a **Tile** is selected, render a linked badge: `[ 📝 Note: Guard Post ]` that focuses the note when clicked.
  - When a **Note** is selected, render a linked badge: `[ 🗺️ Tile: 3x3 Chamber ]` that highlights and pans to the room tile.

### 4.5 VTT Sidebar Mode Organization

- Introduce top-level segmented navigation tabs in `MapVTTSidebar.svelte`:
  - **Tokens & Vault**: Entity list, character/creature placement, tokens.
  - **Dungeon Builder**: Tile decks, room drawers, auto-stocking settings.
  - **Encounter / Initiative**: Turn tracker, rounds, combat log.
- Auto-open the **Detail** sub-panel when a canvas token/note is selected without forcing users to scroll past the entire deck catalog.

---

## 5. Implementation Roadmap

| Phase       | Focus Area                    | Deliverables                                                                     |
| :---------- | :---------------------------- | :------------------------------------------------------------------------------- |
| **Phase 1** | **Note Editing Polish**       | Inline note title editing, Zen mode vault opening, markdown preview toggle.      |
| **Phase 2** | **Tile Placement Ergonomics** | Armed tile visual ring, placement canvas banner, drag-to-canvas support.         |
| **Phase 3** | **Stocking UI Redesign**      | Segmented button mode group, frequency chips, inline table selector.             |
| **Phase 4** | **Tile-Note Co-location**     | Parent-child linkage metadata, bi-directional navigation badges in detail panel. |
| **Phase 5** | **Sidebar Tabbed Layout**     | Segmented mode tabs for Tokens vs Dungeon Builder vs Initiative.                 |

---

## 6. Verification & Quality Gates

- **Unit Tests**:
  - `TileDeckPanel.test.ts`: Verify segmented stocking mode switching and armed tile selection.
  - `TokenDetail.test.ts`: Verify note title mutation, Zen mode trigger, and linked tile/note navigation.
  - `TokenNoteEditor.test.ts`: Verify formatted markdown preview toggle and formatting tools.
- **E2E / Visual Tests**:
  - Run Playwright tests with `--reporter=list` across map tile placement, drag-and-drop, and note pinning flows.
