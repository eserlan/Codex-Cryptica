# Quickstart & Verification Guide: Guided Mode & Quick Start Experience

**Feature Branch**: `148-guided-mode-quickstart`  
**Created**: 2026-07-30  
**Spec**: [`spec.md`](./spec.md)

---

## 1. Running Unit & Integration Tests

Run all unit tests across `packages/generator-engine` and `apps/web`:

```bash
# Run generator engine tests (includes starter constellation tests)
bun test packages/generator-engine

# Run web app tests (includes Guided Mode & recommendations tests)
bun test apps/web
```

---

## 2. Interactive Testing & Verification Steps

### Step 1: Quick Start World Creation

1. Launch app locally: `bun run dev`
2. Either: open the New World creation modal (vault switcher) and click **QUICK START WORLD**, or — on the first-run welcome page — click the primary **Quick Start World** button or the "Living Lore Graph" preview card (both lead to the same flow).
3. Choose a Theme (e.g. `Cyberpunk`) and enter a seed premise: `"Corporation hijacking the net grid"`.
4. Click **Generate Starter World**.
5. **Expected Result**: 4–6 entities (District, Corporation, Gang, Character, Conflict) are created and populated into the workspace, each linked by exactly one correctly-directed connection (e.g. District → located in → Sprawl — never both directions), and the graph redraws so the new entities are spread apart rather than piled on one spot.

### Step 2: Intent-First `+ Create`

1. Navigate to a generated entity (e.g., Faction entity "Neon Syndicate").
2. Click the prominent `+ Create` button in the top header or floating workspace action.
3. Select **Character**.
4. **Expected Result**: A new Character entity draft is generated immediately (no configure form shown first) pre-populated with Neon Syndicate context, and once saved the graph redraws so the new entity doesn't land piled on its neighbor.
5. Click **Customize** (the draft review's back button, relabeled) to expand advanced generator settings without losing the inferred context.

### Step 3: Guided UI Mode Switch

1. Click the **Guided / Full Toolbox** toggle switch in the application header.
2. **Expected Result**: Guided Mode hides the sidebars (Explorer/Oracle), several secondary header utilities (Die Roller, Drive/P2P sync status, voice chat, "Explore Worlds"), and the vault toolbar's New Entity/Import/Save/Generate/Share cluster — leaving `+ Create` as the primary action. Toggle again to restore everything instantly without losing state.

### Step 4: Structural Recommendations Banner

1. View a Faction entity that has no leader character.
2. **Expected Result**: A subtle banner appears at the bottom of the detail panel: _"Who leads this faction?"_ with an _"Add Leader"_ button.
3. Click _"Add Leader"_ to launch the `+ Create` flow pre-filled with the Faction's ID.
