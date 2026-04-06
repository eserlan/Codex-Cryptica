# Feature Specification: Modal Dice Roller Refinement (079)

**Branch**: `modal-dice-roller`
**Status**: Planning
**Objective**: Transform the existing basic dice modal into a premium, tactile, and highly functional "Dice Vault" that supports saved presets, advanced formula building, and immersive visual feedback.

## Core Vision
The dice roller should not just be a utility but a part of the "ritual" of play. It needs to feel responsive, remember the user's favorite rolls, and handle complex systems with ease.

## Proposed Enhancements

### 1. Saved Presets (The "Spellbook")
- **Named Rolls**: Save formulas with labels (e.g., "Longsword Attack", "Fireball").
- **Persistence**: Store presets in IndexedDB so they survive sessions.
- **Quick Access**: A dedicated tab or sidebar within the modal for presets.

### 2. Immersive Visuals & Feedback
- **Roll Animation**: Instead of instant results, add a brief "tumble" animation or a count-up effect to the total.
- **Outcome Styling**: Color-code results (e.g., natural 20s glow gold, natural 1s pulse red).
- **Tactile Buttons**: Enhance the "clickiness" of the UI with better active states and potentially sound effects (optional/toggleable).

### 3. Advanced Formula Builder
- **Visual Modifiers**: Buttons for "Advantage" (2d20kh1) and "Disadvantage" (2d20kl1) that modify the current formula.
- **Exploding Toggle**: A global toggle to make the current formula "Exploding".
- **Clearer Breakdown**: Hovering over a total in the history should show the exact math (e.g., `(12 + 4) + 5 = 21`).

### 4. Layout Optimization
- **Dual-Pane View**: On larger screens, show History and the Roller side-by-side.
- **Mobile Comfort**: Ensure the "Roll" button is easily reachable by the thumb.

---

## Task List

### Phase 1: Data & Storage
- [ ] **T1.1**: Define `DicePreset` interface in `packages/dice-engine/src/types.ts`.
- [ ] **T1.2**: Create `dice-presets.svelte.ts` store in `apps/web/src/lib/stores/`.
- [ ] **T1.3**: Register `dice_presets` store in `apps/web/src/lib/utils/idb.ts`.

### Phase 2: UI/UX Refinement
- [ ] **T2.1**: Update `DiceModal.svelte` to include a "Presets" section.
- [ ] **T2.2**: Add "Save Current Formula" button to the formula input bar.
- [ ] **T2.3**: Implement "Advantage/Disadvantage" toggle buttons that wrap the current `1d20` in `2d20kh1`.
- [ ] **T2.4**: Improve the `RollLog.svelte` with better result highlighting (Nat 20/Nat 1).

### Phase 3: Animations & Polish
- [ ] **T3.1**: Implement a "Counter" component for the total to animate from 0 to result.
- [ ] **T3.2**: Add a "shake" animation to the modal on a heavy roll (many dice).
- [ ] **T3.3**: Ensure keyboard shortcuts (Enter to roll, Esc to close, Arrow keys for history) are robust.

### Phase 4: Validation
- [ ] **T4.1**: Unit tests for preset saving/loading logic.
- [ ] **T4.2**: E2E tests for the "Save Preset" workflow.
- [ ] **T4.3**: Accessibility audit (Aria labels, focus trapping).
