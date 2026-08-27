# VTT Tile Deck & Map Notes: UI/UX Assessment & Implementation Specification

## 1. Executive Summary

Recent VTT additions introduced procedural dungeon tile decks (starter packs + custom uploads), automated stocking on draw (random tables and encounter seeds), and map note markers. While mechanically solid, the user interface currently suffers from high cognitive load: nested `<select>` configuration forms, no visual feedback for armed tile placement, a crowded 22rem sidebar where tools fight for vertical space, and missing bi-directional links between placed tiles and their notes.

This specification diagnoses the current UI/UX bottlenecks and defines concrete, implementation-ready patterns tailored to Codex Cryptica's local-first Svelte 5 / Tailwind 4 architecture.

---

## 2. Current State Assessment & Friction Points

### 2.1 Tile Deck Panel (`TileDeckPanel.svelte`)

1. **Configuration Fatigue for "Stocking on Draw"**:
   - Configuring tile stocking currently requires navigating 2–3 stacked native `<select>` dropdowns (_Mode_, _Frequency_, _Table Picker_). This feels like a backend settings form rather than an intuitive live GM tool.
2. **Missing "Armed" Placement State**:
   - Clicking a tile or "Draw" arms the placement cursor (`mapSession.drawTile()` / `selectTile()`), but the panel provides no persistent visual highlight, ring, or top banner indicating which tile is armed or how to cancel.
3. **Tile Navigation in Large Decks**:
   - 150+ tile decks (like Kenney Scribble Dungeons) rely solely on a 4-column thumbnail grid with hover-only labels. There is no text search (e.g. searching "stairs", "corner", "corridor"), making browsing slow.
4. **Desktop Drag-and-Drop Gap**:
   - Vault entities support drag-and-drop onto the map, whereas tile deck items only support click-to-arm.

---

### 2.2 Note Creation, Detail Editing & Vault Handoff (`TokenDetail.svelte` & `TokenNoteEditor.svelte`)

1. **Non-Editable Note Titles**:
   - `TokenDetail.svelte` displays token names in a static `<h3>{selectedToken.name}</h3>`. Once placed, a GM cannot rename a note or marker directly from the sidebar inspector.
2. **Plain Textarea Without Formatted Preview**:
   - `TokenNoteEditor.svelte` includes Markdown formatting buttons (`Bold`, `Italic`, `Heading`, `List`), but editing is restricted to a plain textarea with no live preview toggle in the sidebar.
3. **Disconnected Note-Tile Association**:
   - When a tile is auto-stocked on draw, the note and the tile exist as two separate, unlinked tokens on the canvas. Inspecting the tile shows `SpatialImageDetails`; inspecting the note pin shows `TokenNoteEditor`, with no navigation jump between them.
4. **Vault Synchronization Ambiguity**:
   - Clicking "Keep in vault" creates a `Note` entity and attaches `entityId` to the token, but subsequent edits to `noteBody` on the canvas do not synchronize back to the vault entity, creating divergent state.

---

### 2.3 Sidebar Hierarchy & Vertical Stacking (`MapVTTSidebar.svelte`)

- `MapVTTSidebar.svelte` currently renders `InitiativePanel` → `TileDeckPanel` → `Vault Entities` → `TokenDetail` in one single scrolling container. As soon as a tile grid or entity list is expanded, the selected token detail is pushed out of view, forcing constant scrolling.

---

## 3. Target UI Architecture & Best Practices

### 3.1 Sidebar Workspace + Contextual Inspector

```
┌─────────────────────────────────────────────────────────────┐
│                       VTT SIDEBAR                           │
│  [ Tokens & Vault ]   [ Dungeon Builder ]   [ Initiative ]  │  <-- Base Workspace Tabs
├─────────────────────────────────────────────────────────────┤
│  TILE DECK: Scribble Dungeons                      [Draw 🎲]│
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Stock on Draw:  [ None ]  [ Table Roll ▾ ]  [ Note ]  │  │  <-- Segmented Mode Bar
│  │ Frequency:      [ Every ] [ 1/2 ] [ 1/3 ] [ 1/4 ] [ 1/6 ]│  │  <-- Stepper Chips
│  └───────────────────────────────────────────────────────┘  │
│  Search: [🔍 stairs...                              ]       │  <-- Tile Text Search
│  Filter: [All] [Rooms] [Corridors] [Doors] [Stairs]         │  <-- Category Chips
│  [ 🖼️ 1 ] [ 🖼️ 2 ] [ 🖼️ 3* ] [ 🖼️ 4 ]  (Click / Drag)       │  <-- *Armed Ring Highlight
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  INSPECTOR: Guard Post #2                        [ ✕ Close ]│  <-- Contextual Overlay
├─────────────────────────────────────────────────────────────┤
│  Title: [ Guard Post #2                                   ] │  <-- Inline Rename
│  Linked Room: [ 🗺️ Tile #14 - 3x3 Chamber ]                │  <-- Single-Source Link
│  [ Edit ] [ Preview ]                                       │  <-- Markdown Toggle
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 2 Goblins arguing over a stolen key.                  │  │
│  │ • Morale: Flees if leader drops.                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  [ 📖 Kept in Vault ]  [ ↗ Open in Zen ]   [ 👁️ Reveal ]     │
└─────────────────────────────────────────────────────────────┘
```

#### Core Structural Rules:

1. **Inspector Transcends Workspace Modes**:
   - Selecting any token, tile, or note on the map opens the contextual **Inspector** regardless of the active sidebar tab.
   - Closing the Inspector returns the GM immediately to their previous workspace mode and scroll position without disrupting their workflow.
2. **Click-to-Arm as Primary, Drag-as-Enhancement**:
   - Click/tap-to-arm remains fully supported for touch screens, trackpads, and keyboard accessibility.
   - Drag-and-drop from the tile grid onto the canvas is provided as an additional pointer interaction on desktop.

---

## 4. Concrete Improvement Specifications

### 4.1 Segmented "Stocking on Draw" Controls

Replace nested `<select>` elements in `TileDeckPanel.svelte` with tactile segmented controls:

- **Mode Selector**: `[ None ] | [ Table Roll 🎲 ] | [ Encounter Note 📝 ]`
  - _Note:_ Do not label as "AI Encounter"; stocking on draw places a lightweight note marker. AI generation remains an on-demand action offered inside the Inspector when an empty note is opened.
- **Inline Table Combobox**: When "Table Roll" is selected, render an inline searchable picker for random tables.
- **Frequency Chips**: A segmented pill group maintaining all 5 options: `[ Every ] | [ 1/2 ] | [ 1/3 ] | [ 1/4 ] | [ 1/6 ]`.

### 4.2 Visual "Armed" & Placement State

- Expose `armedTile: { deckId: string; tileId: string; name: string } | null` explicitly in `mapSession.svelte.ts`.
- In `TileDeckPanel.svelte`, render an active ring highlight (`ring-2 ring-theme-primary bg-theme-primary/10`) on the armed tile thumbnail.
- Display a persistent dismissable canvas top-banner:
  > _"Click map to place [Tile Name] • Press [Esc] to cancel"_

### 4.3 Tile Browsing & Search

- Preserve existing category filter chips (`[All]`, `[Rooms]`, `[Corridors]`, etc.).
- Add a compact search input filtering by tile name and category.
- Ensure tile names are discoverable without relying solely on mouse hover (e.g. truncated subtitle or accessible badge).

### 4.4 Note Editing, Markdown Preview & Vault Synchronization

- **Inline Title Editing**: Allow GMs to rename notes in the Inspector; mutate state via canonical `mapSession.updateToken(selectedToken.id, { name: nextName })`.
- **Edit / Preview Toggle**: Provide an Edit/Preview toggle in `TokenNoteEditor.svelte` that reuses the existing Markdown parser (`packages/map-engine/src/note-markdown.ts`).
- **Live Vault Synchronization**:
  - Treat "Kept in Vault" as a live **Linked Entity**.
  - When an entity-linked note is edited on the canvas, propagate changes back to the vault via `vault.updateEntity(entityId, { content: noteBody, title: name })`.
  - Provide an **"Open in Zen"** button (`modalUIStore.openZenMode(entityId)`) for full-screen reading.

### 4.5 Token/Tile–Note Association (Single Source of Truth)

- **Data Model**: Store a generic `parentTokenId?: string` on the dependent token (the note marker pointing to the parent tile).
  - Do _not_ store duplicate reverse references on the tile.
  - Derive `childTokens` / `childNotes` reactively in `mapSession.svelte.ts` via `$derived`.
- **Lifecycle Semantics**:
  - _Deleting a Note_: The parent tile remains completely unaffected.
  - _Deleting a Parent Tile_: The linked note remains as an unlinked/orphaned note (`parentTokenId` cleared).
  - _Moving a Parent Tile_: The note maintains its canvas coordinates or moves proportionally with the tile.
- **Inspector Bi-directional Navigation**:
  - When inspecting a **Tile**, show: `[ 📝 Note: Guard Post ]` (clicking focuses the note).
  - When inspecting a **Note**, show: `[ 🗺️ Room: 3x3 Chamber ]` (clicking focuses and pans to the parent tile).

---

## 5. Phased Implementation Sequence

| Phase       | Milestone                                       | Scope                                                                                                                                                                |
| :---------- | :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1** | **Sidebar Workspace + Contextual Inspector**    | Implement 3 base sidebar modes (`Tokens & Vault`, `Dungeon Builder`, `Initiative`). Establish the contextual Inspector overlay that restores previous mode on close. |
| **Phase 2** | **Armed Tile Placement Feedback**               | Expose armed tile state in `mapSession`. Add thumbnail ring highlight and top canvas placement banner.                                                               |
| **Phase 3** | **Tile Browsing, Search & Drag Enhancement**    | Add text search input to `TileDeckPanel`. Preserve category chips. Add desktop drag-to-map pointer enhancement while keeping tap-to-arm.                             |
| **Phase 4** | **Stocking Control Redesign**                   | Implement segmented mode bar (`None`, `Table Roll`, `Encounter Note`), frequency chips (`Every`, `1/2`, `1/3`, `1/4`, `1/6`), and inline table combobox.             |
| **Phase 5** | **Note Editing, Markdown Preview & Vault Sync** | Add inline note renaming via `updateToken()`. Add Markdown Edit/Preview toggle. Synchronize edits to linked Vault Note entities. Add "Open in Zen" action.           |
| **Phase 6** | **Tile–Note Association**                       | Add `parentTokenId` to token schema. Derive reverse relationships in `mapSession`. Add bi-directional navigation badges in Inspector.                                |

---

## 6. Verification & Quality Gates

- **Unit Tests**:
  - `MapVTTSidebar.test.ts`: Verify mode switching, Inspector opening on token selection, and mode restoration on close.
  - `TileDeckPanel.test.ts`: Verify armed tile state, search filtering, and segmented stocking mode changes.
  - `TokenDetail.test.ts`: Verify inline note renaming, live vault entity synchronization, and linked token navigation.
  - `TokenNoteEditor.test.ts`: Verify Markdown Edit/Preview toggle and formatting tools.
- **E2E / Integration Tests**:
  - Run Playwright VTT suite (`--reporter=list`) covering tile placement, drag-and-drop, note pinning, and vault persistence flows.
