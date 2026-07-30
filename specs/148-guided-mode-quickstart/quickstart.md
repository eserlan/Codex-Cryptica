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
2. Open New World creation modal.
3. Click the **Quick Start World** card.
4. Choose a Theme (e.g. `Cyberpunk`) and enter a seed premise: `"Corporation hijacking the net grid"`.
5. Click **Generate Starter World**.
6. **Expected Result**: 4–6 entities (District, Corporation, Gang, Character, Conflict) are created and populated into the workspace with bidirectional relationship links.

### Step 2: Intent-First `+ Create`
1. Navigate to a generated entity (e.g., Faction entity "Neon Syndicate").
2. Click the prominent `+ Create` button in the top header or floating workspace action.
3. Select **Character**.
4. **Expected Result**: A new Character entity draft is generated pre-populated with Neon Syndicate context.
5. Click **Customize** to expand advanced generator settings.

### Step 3: Guided UI Mode Switch
1. Click the **Guided / Full Toolbox** toggle switch in the application header.
2. **Expected Result**: Guided Mode simplifies sidebars and focuses UI on content. Toggle again to restore full toolbars instantly without losing state.

### Step 4: Structural Recommendations Banner
1. View a Faction entity that has no leader character.
2. **Expected Result**: A subtle banner appears at the bottom of the detail panel: *"Who leads this faction?"* with an *"Add Leader"* button.
3. Click *"Add Leader"* to launch the `+ Create` flow pre-filled with the Faction's ID.
