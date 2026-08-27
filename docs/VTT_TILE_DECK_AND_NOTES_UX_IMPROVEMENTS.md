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
3. **Disconnected Note-Tile Association & Manual Linking Gap**:
   - When a tile is auto-stocked on draw, the note and the tile exist as two separate, unlinked tokens on the canvas.
   - If a GM manually places a tile and drops a note, or if a tile is deleted and replaced, there is no manual "Link to tile…" action to establish or repair the association.
4. **Vault Synchronization Ambiguity**:
   - Clicking "Keep in vault" creates a `Note` entity and attaches `entityId` to the token, but subsequent edits to `noteBody` on the canvas do not synchronize back to the vault entity, creating divergent state.

---

### 2.3 Sidebar Hierarchy & Vertical Stacking (`MapVTTSidebar.svelte`)

- `MapVTTSidebar.svelte` currently renders `InitiativePanel` → `TileDeckPanel` → `Vault Entities` → `TokenDetail` in one single scrolling container. As soon as a tile grid or entity list is expanded, the selected token detail is pushed out of view, forcing constant scrolling.
- However, placing Initiative behind separate navigation tabs would degrade combat flow. The right architectural answer is a structured layout with pinned anchors and a contextual Inspector.

---

## 3. Target UI Architecture & Layout Patterns

### 3.1 Pinned & Collapsible Sidebar Structure

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FIXED TOP: VTT Controls (Grid, Fog, Measure, Draw)       │
├─────────────────────────────────────────────────────────────┤
│ 2. STICKY: Initiative Tracker (when active)                 │
│    (Collapses to 1-line active turn strip on short screens) │
├─────────────────────────────────────────────────────────────┤
│ 3. SCROLLABLE MIDDLE WORKSPACE (min-h-[260px])              │
│                                                             │
│  ▼ TILE DECKS: Scribble Dungeons                   [Draw 🎲]│
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Stock on Draw:  [ None ]  [ Table Roll ▾ ]  [ Note ]  │  │  <-- Segmented Mode Bar
│  │ Frequency:      [ Every ] [ 1/2 ] [ 1/3 ] [ 1/4 ] [ 1/6 ]│  │  <-- Stepper Chips
│  └───────────────────────────────────────────────────────┘  │
│  Search: [🔍 stairs...                              ]       │  <-- Tile Text Search
│  Filter: [All] [Rooms] [Corridors] [Doors] [Stairs]         │  <-- Category Chips
│  [ 🖼️ 1 ] [ 🖼️ 2 ] [ 🖼️ 3* ] [ 🖼️ 4 ]  (Click / Drag)       │  <-- *Armed Ring Highlight
│                                                             │
│  ► VAULT ENTITIES (Collapsible)                             │
├─────────────────────────────────────────────────────────────┤
│ 4. PINNED BOTTOM INSPECTOR (Max 35-45% height, internal scroll)
│  INSPECTOR: Guard Post #2                        [ ✕ Close ]│
│  Title: [ Guard Post #2                                   ] │  <-- Inline Rename
│  Linked Room: [ 🗺️ Tile #14 - 3x3 Chamber ]  [ Unlink ]    │  <-- Single-Source Link
│  [ Edit ] [ Preview ]                                       │  <-- Markdown Toggle
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 2 Goblins arguing over a stolen key.                  │  │
│  │ • Morale: Flees if leader drops.                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  [ 📖 Kept in Vault ]  [ ↗ Open in Zen ]   [ 👁️ Reveal ]     │
└─────────────────────────────────────────────────────────────┘
```

#### Core Structural Rules:

1. **Fixed Top & Sticky Initiative**:
   - Global VTT tools remain anchored at the top.
   - When combat is active, the `InitiativePanel` sits stickily below the top tools, ensuring initiative order and active turns remain visible alongside any token or room editing.
2. **Scrollable Middle Workspace**:
   - Houses collapsible accordions for `TileDeckPanel` and `Vault Entities`.
   - Guaranteed minimum vertical budget (`min-h-[260px]`).
3. **Pinned Contextual Inspector**:
   - Selecting any token, tile, or note on the map opens the contextual **Inspector** pinned at the bottom of the sidebar.
   - Closing the Inspector unpins it and restores full height to the middle workspace without changing scroll position.
4. **Click-to-Arm as Primary, Drag-as-Enhancement**:
   - Click/tap-to-arm remains fully supported for touch screens, trackpads, and keyboard accessibility.
   - Drag-and-drop from the tile grid onto the canvas is provided as an additional pointer interaction on desktop (reusing the existing Vault Entity drag-and-drop handler).

---

## 4. Concrete Improvement Specifications

### 4.1 Visual "Armed" & Placement State

- Expose `armedTile: { deckId: string; tileId: string; name: string } | null` explicitly in `mapSession.svelte.ts`.
- In `TileDeckPanel.svelte`, render an active ring highlight (`ring-2 ring-theme-primary bg-theme-primary/10`) on the armed tile thumbnail.
- Display a persistent dismissable canvas top-banner:
  > _"Click map to place [Tile Name] • Press [Esc] to cancel"_
- **Escape Key Requirement**: When a tile is armed, pressing `Escape` clears `armedTile` and removes all placement UI without modifying the map canvas.

### 4.2 Tile Browsing, Search & Drag-and-Drop

- **Metadata Prerequisite & Search Scope**:
  - Verify the semantic quality of starter-pack manifests before implementing search.
  - Search currently available `name` and `category`.
  - If starter-pack asset paths/tags provide useful additional terms, persist them explicitly as optional searchable metadata on `TileDeckEntry` (e.g. `searchTerms?: string[]`).
  - For custom uploads with non-semantic filenames (e.g. `tile_0043.jpg`), search degrades gracefully to filename/category rather than attempting to infer image contents.
- Preserve existing category filter chips (`[All]`, `[Rooms]`, `[Corridors]`, etc.).
- Ensure tile names are discoverable without relying solely on mouse hover (e.g. visible text labels or clear badges).
- **Drag-and-Drop**: Reuse the existing Vault Entity drag-and-drop handler (`onEntityDragStart`/`onEntityDragEnd` in `mapSession`) for tile thumbnails, ensuring consistent pointer events.
- **Rendering Performance**: Apply CSS `content-visibility: auto` to thumbnail grid rows so 150+ tile decks scroll smoothly in constrained viewports.

### 4.3 Segmented "Stocking on Draw" Controls & Accessibility

- Replace nested `<select>` elements in `TileDeckPanel.svelte` with tactile segmented controls:
  - **Mode Selector**: `[ None ] | [ Table Roll 🎲 ] | [ Encounter Note 📝 ]`
    - _Note:_ Do not label as "AI Encounter"; stocking on draw places a lightweight note marker. AI generation remains an on-demand action offered inside the Inspector when an empty note is opened.
  - **Inline Table Combobox**: When "Table Roll" is selected, render an inline searchable picker for random tables.
  - **Frequency Chips**: A segmented pill group maintaining all 5 options: `[ Every ] | [ 1/2 ] | [ 1/3 ] | [ 1/4 ] | [ 1/6 ]` (where "Every" parses faster than "1/1").
- **Accessibility Requirements**: Segmented controls must implement proper radio group semantics (`role="radiogroup"`, `role="radio"`, `aria-checked`), visible focus rings (`focus-visible:outline-theme-primary`), arrow-key keyboard navigation, and >= 44x44px usable tap targets on touch devices.

### 4.4 Note Editing, Markdown Preview & Vault Synchronization

- **Inline Title Editing**: Allow GMs to rename notes in the Inspector; mutate state via canonical `mapSession.updateToken(selectedToken.id, { name: nextName })`.
- **Edit / Preview Toggle**: Provide an Edit/Preview toggle in `TokenNoteEditor.svelte` that reuses the existing Markdown parser (`packages/map-engine/src/note-markdown.ts`).
- **Synchronized Vault Model (Two-Way Contract)**:
  - _Data Contract_: Vault Note = persistent canonical source; Token `noteBody`/`name` = synchronised session copy (replicated over WebRTC to guests).
  - _Canvas $\rightarrow$ Vault_: Token updates immediately in session; debounced write updates the Vault Note entity via `vault.updateEntity(entityId, { title, content })`.
  - _Vault $\rightarrow$ Canvas_: Active `mapSession` listens to Vault entity updates (`vault.entityUpdated$` / `$effect` on `vault.entities[entityId]`) and updates linked map tokens in memory.
  - _Session Hydration Rule (Offline Edits)_: On map session load/bootstrap, all tokens carrying an `entityId` hydrate (`name`, `noteBody`) directly from `vault.entities[entityId]`, ensuring edits made while the map was closed are reflected immediately.
  - _Blur / Inspector Close_: Immediately flushes pending Vault writes.
  - _Entity Deletion_: If the linked Vault entity is deleted, clear `entityId` on the token and preserve current token name/body as an ordinary map note.
  - _Multiplayer Authority_: GMs are the sole author of vault-linked notes; WebRTC guests receive replicated token state over P2P read-only, guaranteeing zero multi-writer merge conflicts on "newest local GM edit wins".
  - Provide an **"Open in Zen"** button (`modalUIStore.openZenMode(entityId)`) for full-screen reading.

### 4.5 Token/Tile–Note Association (Single Source of Truth & Manual Linking)

- **Data Model**: Store a generic `parentTokenId?: string` on the dependent token (the note marker pointing to the parent tile).
  - Do _not_ store duplicate reverse references on the tile.
  - Derive `childTokens` / `childNotes` reactively in `mapSession.svelte.ts` via `$derived`.
  - Deserialisation must remain backwards-compatible with older sessions where `parentTokenId` is `undefined`.
- **Movement Semantics**: When a parent tile moves, attached notes move by the exact same coordinate delta (`dx`, `dy`).
- **Deletion Semantics**:
  - _Deleting a Note_: The parent tile remains completely unaffected.
  - _Deleting a Parent Tile_: The linked note remains as an unlinked/orphaned note (`parentTokenId` cleared).
- **Manual Linking & Self-Healing**:
  - For unlinked notes: Provide a `"Link to tile…"` button in `TokenDetail.svelte` that arms a canvas tile picker (or selects from nearby tiles) to set `parentTokenId`.
  - For linked notes: Provide an `"Unlink"` button in `TokenDetail.svelte` to clear `parentTokenId`.
- **Inspector Bi-directional Navigation**:
  - When inspecting a **Tile**, show: `[ 📝 Note: Guard Post ]` (clicking focuses the note).
  - When inspecting a **Note**, show: `[ 🗺️ Room: 3x3 Chamber ]` (clicking focuses and pans to the parent tile).

### 4.6 Constrained Viewport Adaptation (< 850px Viewport Height)

To prevent the middle workspace from collapsing on laptop screens:

1. **Minimum Height Protection**: Middle workspace maintains `min-h-[260px]`.
2. **Initiative Compact Strip**: When active in height-constrained viewports, `InitiativePanel` collapses to a 1-line "Current Turn: [Character Name] (Round X)" bar with an expandable popover/sheet for the full roster.
3. **Dynamic Inspector Capping**: When both Initiative and Inspector are open on a short screen, Inspector height caps at 35% (max `240px`) with internal scrolling.

---

## 5. Pragmatic Implementation Sequence

```
[ Phase 1: Armed Tile Feedback ] ───► [ Phase 2: Tile Search & DnD ] ───► [ Phase 3: Stocking Controls ]
                                                                                   │
                                                                                   ▼
[ Phase 6: Sidebar Layout Polish ] ◄─── [ Phase 5: Tile-Note Association ] ◄─── [ Phase 4: Note Edit & Vault Sync ]
```

| Phase       | Milestone                                 | Scope                                                                                                                                                                                                                                                                                  |
| :---------- | :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1** | **Armed Tile Placement Feedback**         | Expose `armedTile` in `mapSession`. Add thumbnail ring highlight, top canvas placement banner, and explicit `Escape` key cancellation.                                                                                                                                                 |
| **Phase 2** | **Tile Browsing, Search & Drag-and-Drop** | Verify starter metadata quality. Add text search input to `TileDeckPanel` matching name and category (and `searchTerms` if available). Retain category chips. Add desktop drag-to-map pointer enhancement reusing existing entity DnD handler. Add `content-visibility: auto` to grid. |
| **Phase 3** | **Stocking Control Redesign**             | Implement accessible segmented mode bar (`None`, `Table Roll`, `Encounter Note`), frequency chips (`Every`, `1/2`, `1/3`, `1/4`, `1/6`), and inline table combobox.                                                                                                                    |
| **Phase 4** | **Note Editing, Preview & Vault Sync**    | Inline note renaming via `updateToken()`. Markdown Edit/Preview toggle using existing engine renderer. Two-way debounced/flushed Vault Note sync, session hydration on load, and Zen mode action.                                                                                      |
| **Phase 5** | **Tile–Note Association**                 | Add `parentTokenId` to token schema. Derive reverse relations. Implement delta movement for attached notes, manual "Link to tile…" / "Unlink" picker actions, and bi-directional navigation badges.                                                                                    |
| **Phase 6** | **Sidebar Layout Improvement**            | Structure `MapVTTSidebar.svelte` with fixed VTT controls, sticky/collapsible Initiative, scrollable middle workspace (`min-h-[260px]`), and pinned bottom Inspector with constrained viewport yielding rules.                                                                          |
| **Phase 7** | **Post-Playtest Evaluation**              | Only evaluate full workspace tabs if the pinned/collapsible structure proves inadequate during live campaign play.                                                                                                                                                                     |

---

## 6. Verification & Acceptance Criteria

### 6.1 End-to-End GM Workflow Acceptance Criterion

> **Primary UX Acceptance Test (Final Target after Phase 6):**
> Starting with the VTT sidebar open, a GM can draw/place six tiles, stock at least two notes, open/edit each stocked note, and return to tile placement without manually scrolling to recover the currently relevant control or inspector.
>
> _(Note: Interim Phases 1–5 validate individual functional and component test gates; full scrolling-free workflow validation occurs upon landing Phase 6.)_

### 6.2 Quality Gates & Automated Tests

- **Unit Tests**:
  - `TileDeckPanel.test.ts`: Verify armed tile state, Escape key cancellation, search filtering, and segmented stocking mode changes with a11y attributes.
  - `TokenDetail.test.ts`: Verify inline note renaming via `updateToken()`, live vault entity synchronization/flush, session hydration on load, manual linking/unlinking, and linked token navigation.
  - `TokenNoteEditor.test.ts`: Verify Markdown Edit/Preview toggle and formatting tools.
  - `MapVTTSidebar.test.ts`: Verify fixed controls, sticky/compact Initiative during active combat, minimum middle workspace height, and pinned Inspector behavior.
- **E2E / Integration Tests**:
  - Run Playwright VTT suite (`--reporter=list`) covering tile placement, drag-and-drop, note pinning, manual note-tile linking, delta movement, and vault persistence flows.
