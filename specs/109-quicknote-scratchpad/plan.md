# Implementation Plan: QuickNote Fast Scratchpad & AI Entity Elevation

**Branch**: `109-quicknote-scratchpad` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/109-quicknote-scratchpad/spec.md`

## Summary

Implements a lightweight floating scratchpad for Game Masters to dump fleeting ideas instantly via global hotkeys. Notes are persisted locally via IndexedDB and can be elevated by the Oracle engine into structured wiki entities or visualized as "dotted" draft nodes on the relationship graph.

## UI Layout Wireframes

Below is the layout of the floating, resizable `QuickNoteScratchpad.svelte` component. It appears instantly on `Ctrl+I` / `Cmd+I` overlaying the active workspace:

```text
+-------------------------------------------------------------+
|  [⚡] QUICKNOTE SCRATCHPAD                       [ _ ] [ X ]  |
+-------------------------------------------------------------+
|  Active Notes Search: [ Filter...                         ] |
+------------------------------------+------------------------+
|  HISTORY (Active Notes)            |  CURRENT NOTE EDITOR   |
|                                    |                        |
|  * Captain Zog friendly pirate...  |  Title: [ Capt. Zog  ] |
|  * Dark Forest anomaly detected    |                        |
|  * Secret passage behind tavern    |  Content:              |
|                                    |  Captain Zog is a      |
|  [+] Create New Note               |  friendly pirate who   |
|                                    |  sails the Glass Sea.  |
|                                    |                        |
|                                    |                        |
|                                    |                        |
|                                    |  [💾 Save]  [✨ Elevate] |
|                                    |  [🗑️ Discard]          |
+------------------------------------+------------------------+
|  Hotkey: Ctrl+I / Cmd+I | Status: Auto-saved (Debounced)   |
+-------------------------------------------------------------+
```

+-------------------------------------------------------------+

````

### Main App Shell & Visual Indicators

To keep quicknotes highly visible and easy to access without cluttering the canvas, we integrate three complementary UI indicator components:

1. **Activity Bar Icon with Glowing Badge**:
   - **Location**: Far-left Activity Bar (`[⚡]`), positioned below standard workspace tool toggles.
   - **Aesthetics**: Uses standard dark glassmorphism styling with an interactive hover effect.
   - **Notification Badge**: A small, round badge in the top-right corner of the tab with an amber gradient (`bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-900`) showing the count of active draft notes.
   - **Micro-Animation**: Features a subtle breathing animation (`animate-pulse`) when new, un-elevated drafts are captured.

2. **Persistent Floating Action Bubble (FAB) - "The Spark"**:
   - **Location**: Anchored bottom-right of the viewport (`bottom-6 right-6`), hovering above the graph canvas.
   - **Aesthetics**: Premium glassmorphism circle (`backdrop-blur-md bg-theme-surface/75 border border-theme-border/60 shadow-[0_4px_20px_rgba(245,158,11,0.15)]`).
   - **Visual Cue**: Wrapped in a dual-ring pulse layout. If active drafts exist, a outer concentric ring radiates outwards via `@keyframes pulse-ring` to softly nudge the GM.
   - **Click Action**: Opens/toggles the floating scratchpad.

3. **Spatial "Dotted Draft Nodes" on the Cytoscape Canvas**:
   - **Location**: Rendered directly on the relationship map as transient graph elements.
   - **Aesthetics**: Distinct golden-amber dotted outline (`border-style: dotted`, `border-width: 2px`, `border-color: var(--color-amber-500)`) with a low-opacity fill to visually separate them from finalized, solid-bordered Markdown files.
   - **Interactivity**: Clicking a dotted node instantly opens the scratchpad focused on that note's ID, enabling fluid, spatial-first editing.

4. **Vault Status Header Pill**:
   - **Location**: In the top campaign header, next to the active vault name (e.g., `Sword Coast`).
   - **Aesthetics**: A compact, pill-shaped badge: `[ 3 ⚡ Drafts ]` styled with a subtle amber border and a low-opacity yellow-gold background.

```text
+---------------------------------------------------------------------+
| ACT | HEADER (Campaign: Sword Coast [ 3 ⚡ Drafts ])    | STATUS/OPS|
+-----+---------------------------------------------------+-----------+
| [🎨]|                                                               |
| [🔎]|                                                               |
|     |               . . . . . . . .                                 |
| [⚡]|              :  Capt. Zog   : <-- Spatial Draft Node          |
| (3) | <--- Badge   :  (QuickNote) :     (Dotted amber glow)         |
|     |               . . . . . . . .                                 |
| [🗺️]|                      |                                        |
|     |                      | (connected draft link)                 |
|     |                      v                                        |
|     |               +--------------+                                |
|     |               |  Glass Sea   |                                |
|     |               +--------------+                                |
|     |                                                               |
|     |                                                  +---------+  |
|     |                                                  | Pulse   |  |
|     |                                                  |   FAB   |  |
|     |                                                  |   [⚡]  |  |
|     |                                                  |  (3)🔥  |  |
|     |                                                  +---------+  |
|     |                                                   \ Pulse /   |
+-----+---------------------------------------------------------------+
````

### Visual Styling Implementation (Tailwind 4 & CSS)

We define the exact visual style specs for these components using standard semantic colors and micro-animations to guarantee a premium, high-fidelity experience:

```css
/* Animated pulsing ring for the FAB */
@keyframes fab-pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}

.quicknote-fab-pulse {
  animation: fab-pulse 2s infinite;
}

/* Glassmorphism panel styling */
.quicknote-glass {
  background: rgba(var(--color-theme-surface-rgb), 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--color-theme-border-rgb), 0.5);
  box-shadow:
    0 10px 30px -10px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes  
**Primary Dependencies**: Svelte 5, Dexie (IndexedDB), Cytoscape.js  
**Storage**: IndexedDB (`quick_notes` store)  
**Testing**: Vitest  
**Target Platform**: Browser  
**Project Type**: Web Application  
**Performance Goals**: <150ms activation latency  
**Constraints**: Local-first persistence, Oracle integration  
**Scale/Scope**: Single floating component, new DB store, Cytoscape style extension

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Library-First**: Logic encapsulated in `QuickNoteService` and `graph-engine`.
- [x] **TDD**: Vitest coverage for service and storage logic.
- [x] **Simplicity**: Standard Dexie/Svelte patterns.
- [x] **AI-First**: Uses Oracle for elevation.
- [x] **Privacy**: Local-first storage.
- [x] **DI**: Constructor-based DI for services.

## Project Structure

### Documentation (this feature)

```text
specs/109-quicknote-scratchpad/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   └── quicknote/
│   ├── services/
│   │   └── QuickNoteService.ts
│   └── stores/
│       └── quicknote.svelte.ts
packages/
└── graph-engine/ (styles)
```

**Structure Decision**: Integrated into `apps/web` as a core UI utility with storage services.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       |            |                                      |
