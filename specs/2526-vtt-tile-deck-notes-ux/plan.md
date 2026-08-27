# Implementation Plan: VTT Tile Deck & Notes UI/UX Overhaul

**Reference Spec**: [`docs/VTT_TILE_DECK_AND_NOTES_UX_IMPROVEMENTS.md`](../../docs/VTT_TILE_DECK_AND_NOTES_UX_IMPROVEMENTS.md)  
**Branch**: `feature/vtt-tile-deck-notes-ux` | **Date**: 2026-08-27

---

## 1. Summary

Overhaul the GM user experience for procedural tile decks, automatic/manual map stocking, note editing, and token inspection in the VTT sidebar.

Key technical deliverables:

1. **Explicit Placement State**: Model `armedTile` in `mapSession.svelte.ts` with visual thumbnail ring highlights, canvas top-bar, and `Escape` key cancellation.
2. **Tile Browsing & Drag-and-Drop**: Text search on `TileDeckPanel` (matching `name`, `category`, and optional `searchTerms`), `content-visibility: auto` grid optimization, and pointer drag-to-map reusing existing entity DnD handlers.
3. **Tactile Stocking Controls**: Segmented mode bar (`None` | `Table Roll 🎲` | `Encounter Note 📝`), frequency chips (`Every`, `1/2`, `1/3`, `1/4`, `1/6`), accessible radio semantics.
4. **Note Editing & Two-Way Vault Sync**: Inline note renaming in Inspector (`updateToken()`), Markdown Edit/Preview toggle using existing engine renderer, session hydration on load, and debounced/flushed Vault Note sync.
5. **Tile–Note Association**: Single-source `parentTokenId?: string` on note tokens, proportional delta movement with parent tiles, manual "Link to tile…" / "Unlink" actions, and bi-directional inspector badges.
6. **Sidebar Layout & Viewport Budgeting**: Fixed VTT controls at top, sticky/compact Initiative during combat, scrollable middle workspace (`min-h-[260px]`), and pinned bottom Inspector (max 35–45% height with internal scrolling).

---

## 2. Technical Context & Constraints

- **Language & Framework**: TypeScript 6.0.3, Svelte 5 (Runes: `$state`, `$derived`, `$effect`), Tailwind CSS 4 semantic tokens (`text-theme-primary`, `bg-theme-surface`, etc.).
- **Icons**: Iconify utility pattern only (`class="icon-[lucide--name] h-4 w-4"`). Zero `lucide-svelte` imports.
- **Architectural Patterns**:
  - Constructor-based Dependency Injection with exported default singletons.
  - Svelte 5 reactive snapshots (`$state.snapshot()`) where object copies are passed across async/non-reactive boundaries.
  - Strict two-way vault sync contract: Vault Note is canonical source; Token `noteBody`/`name` is replicated session state.
  - Zero multi-writer merge conflicts: GMs are sole authors; WebRTC guests receive read-only replicated tokens.
- **Dependencies**: No new npm dependencies. Reuse `@codex/vault-engine`, `@codex/events`, and existing engine modules (`map-engine/src/note-markdown.ts`).

---

## 3. Architecture & Data Contracts

### 3.1 Session Token Schema (`packages/schema` / `types/vtt.ts`)

```ts
export interface VTTToken {
  id: string;
  kind?: "token" | "tile" | "note";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // Existing fields...
  noteBody?: string;
  entityId?: string | null;
  /** Single source of truth for attached notes/markers */
  parentTokenId?: string;
}

export interface TileDeckEntry {
  id: string;
  name: string;
  imagePath: string;
  category?: string;
  /** Optional searchable tags from starter manifests or uploads */
  searchTerms?: string[];
}
```

### 3.2 `mapSession.svelte.ts` State Additions

```ts
// Armed placement state
armedTile = $state<{
  deckId: string;
  tileId: string;
  name: string;
} | null>(null);

// Derived reverse lookup for tile notes
childTokensOf = (tokenId: string) => $derived(
  Object.values(this.tokens).filter((t) => t.parentTokenId === tokenId)
);

// Armed state management
armTile(deckId: string, tileId: string): void;
clearArmedTile(): void;

// Association management
linkTokens(childTokenId: string, parentTokenId: string): void;
unlinkToken(childTokenId: string): void;
```

### 3.3 Movement & Deletion Semantics

- **Move Token**: When `updateTokenPosition(tokenId, x, y)` runs on a parent token, compute `dx = x - oldX` and `dy = y - oldY`. For every child token where `parentTokenId === tokenId`, update `child.x += dx` and `child.y += dy`.
- **Delete Token**: When `removeToken(tokenId)` runs:
  - If token is a parent: find child tokens and set `child.parentTokenId = undefined` (orphaned note remains safely on canvas).
  - If token is a child note: delete child note; parent remains unaffected.
- **Session Hydration**: In `bootstrapMapSession()` / `loadMap()`:
  - For each token with `entityId`: if `vault.entities[entityId]` exists, hydrate `token.name = entity.title` and `token.noteBody = entity.content`.

---

## 4. Phase-by-Phase Implementation Plan

### Phase 1: Armed Tile Placement Feedback

- **Files**: `apps/web/src/lib/stores/map-session.svelte.ts`, `apps/web/src/lib/components/vtt/TileDeckPanel.svelte`, `apps/web/src/lib/components/map/MapCanvas.svelte` (or canvas overlay).
- **Behavior**:
  - Expose `mapSession.armedTile`.
  - When `drawTile()` or `selectTile()` is called, set `armedTile`.
  - `TileDeckPanel.svelte`: Render `ring-2 ring-theme-primary bg-theme-primary/10` on the armed thumbnail.
  - Display canvas top banner: `"Click map to place [Tile Name] • Press [Esc] to cancel"`.
  - Global `keydown` handler on canvas/window: `Escape` clears `armedTile` and dismisses placement banner.

### Phase 2: Tile Browsing, Search & Drag-and-Drop

- **Files**: `apps/web/src/lib/components/vtt/TileDeckPanel.svelte`, `apps/web/src/lib/stores/ui/tile-deck-panel-ui.svelte.ts`, `apps/web/src/lib/services/vtt/StarterTileDeckService.ts`.
- **Behavior**:
  - Verify starter catalog manifests.
  - Add search input in `TileDeckPanel` filtering visible tiles by `name`, `category`, and `searchTerms`.
  - Add `draggable="true"` on tile thumbnail buttons, invoking `mapSession.onTileDragStart()`.
  - Canvas handles `drop` event to place tile at drop coordinates.
  - Add `content-visibility: auto` to tile grid rows.

### Phase 3: Stocking Control Redesign

- **Files**: `apps/web/src/lib/components/vtt/TileDeckPanel.svelte`.
- **Behavior**:
  - Replace `<select>` stack with segmented mode control: `[ None ] | [ Table Roll 🎲 ] | [ Encounter Note 📝 ]`.
  - Frequency pill chips: `[ Every ] | [ 1/2 ] | [ 1/3 ] | [ 1/4 ] | [ 1/6 ]`.
  - Implement full keyboard accessibility (`role="radiogroup"`, `role="radio"`, arrow navigation, focus rings).
  - Inline searchable combobox for random tables when "Table Roll" is selected.

### Phase 4: Note Editing, Preview & Vault Synchronization

- **Files**: `apps/web/src/lib/components/vtt/TokenDetail.svelte`, `apps/web/src/lib/components/vtt/TokenNoteEditor.svelte`, `apps/web/src/lib/stores/vault.svelte.ts`.
- **Behavior**:
  - In `TokenDetail.svelte`, render editable input for note title, calling `mapSession.updateToken(selectedToken.id, { name: nextName })`.
  - In `TokenNoteEditor.svelte`, add `[ Edit ] | [ Preview ]` toggle button reusing `packages/map-engine/src/note-markdown.ts`.
  - Two-way sync: debounced `vault.updateEntity()` on canvas note edits; flush immediately on Inspector blur / close.
  - Session bootstrap: hydrate vault-linked tokens on load.
  - Add "Open in Zen" button (`modalUIStore.openZenMode(entityId)`).

### Phase 5: Tile–Note Association & Navigation

- **Files**: `apps/web/src/lib/components/vtt/TokenDetail.svelte`, `apps/web/src/lib/stores/map-session.svelte.ts`.
- **Behavior**:
  - When auto-stocking creates a note, set `note.parentTokenId = tile.id`.
  - In `TokenDetail.svelte`:
    - Tile inspector shows: `[ 📝 Note: Guard Post ]` $\rightarrow$ clicking selects the note.
    - Note inspector shows: `[ 🗺️ Room: 3x3 Chamber ] [ Unlink ]` $\rightarrow$ clicking selects and pans to room tile.
    - Unlinked note inspector shows: `[ Link to room/tile… ]` $\rightarrow$ arms tile association picker.
  - Delta movement: moving parent tile translates all child notes by `(dx, dy)`.

### Phase 6: Sidebar Layout Polish & Viewport Budgeting

- **Files**: `apps/web/src/lib/components/vtt/MapVTTSidebar.svelte`, `apps/web/src/lib/components/vtt/InitiativePanel.svelte`.
- **Behavior**:
  - Restructure sidebar:
    1. Fixed Top: `VTTControls`.
    2. Sticky Initiative: Active combat list (collapses to 1-line strip on `<850px` height viewports).
    3. Scrollable Middle: `TileDeckPanel` and `Vault Entities` with `min-h-[260px]`.
    4. Pinned Bottom Inspector: Max 35–45% height with internal scrolling, pinned when token/note selected.
  - Verify complete scrolling-free GM workflow acceptance test.

---

## 5. Testing & Quality Gates

- **Unit Tests**:
  - `apps/web/src/lib/stores/vtt/vtt-tile-deck-manager.test.ts`
  - `apps/web/src/lib/components/vtt/TileDeckPanel.test.ts`
  - `apps/web/src/lib/components/vtt/TokenDetail.test.ts`
  - `apps/web/src/lib/components/vtt/TokenNoteEditor.test.ts`
  - `apps/web/src/lib/components/vtt/MapVTTSidebar.test.ts`
- **E2E Tests**:
  - Playwright VTT suite (`bun run test:e2e --reporter=list`).
