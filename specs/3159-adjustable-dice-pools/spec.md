# Stat Sheets: Adjustable Dice Pools & Result Breakdowns (Phase 1) Mini-Spec

**Feature Branch**: `3159-adjustable-dice-pools`  
**Issue**: [#3159](https://github.com/eserlan/Codex-Cryptica/issues/3159)  
**Created**: 2026-11-04  
**Status**: Ready for Implementation

---

## 1. Specification (What & Why)

### Problem Statement

Players and Game Masters using dice-pool systems (such as _Scum & Villainy_, _Blades in the Dark_, _Shadowrun_, or _Storypath_) currently lack a native Stat Sheet field that allows dynamic incrementing or decrementing of pool counts without manual text editing. Furthermore, existing roll outputs frequently present only the aggregate arithmetic total rather than transparent, individual die faces, preventing players from reading system-specific outcomes (such as highest die or face successes).

### Scope & Boundaries

- **In Scope (Phase 1)**:
  - Add a dedicated `"dice-pool"` field type to `packages/schema/src/stat-sheet.ts` with configurable defaults (default pool count, die type, min, max, step, and player-selectable die toggle).
  - Runtime interactive control: `[−] N [+] [dS ▾] [Roll]` in `StatSheetView.svelte`, `FieldReferenceNode.svelte` (presentation templates), and `TokenQuickStats.svelte` (pinned VTT token view).
  - Entity-level persistence: adjusting count or die type updates the entity's stat sheet without mutating the shared template defaults.
  - Dice roll derivation: derives and rolls `NdS` via the shared `dice-engine` and records rolls to history and VTT chat.
  - Transparent outcome & breakdown: displays roll total clearly labelled as `(Sum)` alongside an expandable `DiceBreakdownDisclosure` showing individual die faces.
  - Zero-dice validation: explicit handling for `0` dice (disabling roll with an accessible notification; no game-specific fallback rule applied in Phase 1).
- **Out of Scope (Deferred to Phase 2 & 3)**:
  - Pool interpretation rules (highest/lowest die, target thresholds, count successes, botches) &rarr; Phase 2.
  - Automated zero-pool special mechanics (e.g. FitD roll 2d6 take lowest) &rarr; Phase 2.
  - Expression engine and cross-field formula derivation (e.g. `Strength + Athletics -> Nd10`) &rarr; Phase 3.

### Acceptance Criteria

- [ ] A template author can configure a `"dice-pool"` field in `StatSheetEditor` with label, starting pool count, default die (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100`), min/max/step bounds, and optional player die selection toggle.
- [ ] On a character sheet (standard view and custom presentation layout), the player can adjust pool count with `[−]` and `[+]` or choose a die from the dropdown (when permitted) and roll with one tap.
- [ ] Adjusted pool counts and selected die types persist across page reloads and presentation template switches for that specific entity, leaving other entities using the same template unaffected.
- [ ] Rolling an active pool (e.g. 4d6) triggers the shared dice engine, logs to dice history / VTT session, displays the arithmetic sum clearly marked as `Sum`, and reveals individual rolled faces via expandable `DiceBreakdownDisclosure`.
- [ ] If pool count is `0`, the roll button is disabled with an explanatory tooltip/label (`"No dice in pool"`), preventing invalid parser executions.
- [ ] Legacy templates, saved entity sheets, and existing `"dice"` and `"counter"` fields load cleanly without migration breaks.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages & Files**:
  - `packages/schema/src/stat-sheet.ts`:
    - Add `"dice-pool"` to `StatSheetFieldTypeSchema`.
    - Add optional field configuration property: `allowDieChange: z.boolean().optional()`.
    - Reuse existing `min`, `max`, `step`, `startValue`, `formula` (used for die type notation e.g. `"d6"`), and `value` (stores current numeric pool count).
  - `packages/stat-sheet-engine/src/presentation/directives.ts`:
    - Add `"dice-pool"` to `DISPLAY_MODES_BY_FIELD_TYPE` (default: `"plain"`, allowed: `["plain", "prominent"]`).
  - `apps/web/src/lib/utils/stat-sheet-field-actions.ts`:
    - Add helper `rollStatSheetDicePoolField(field: StatSheetField)` that validates count > 0, builds `${count}${die}`, executes via `diceEngine`, logs to `diceHistory` / `mapSession`, and returns `DiceRollDisplay` marked as sum.
  - `apps/web/src/lib/components/stats/StatSheetView.svelte`:
    - Render `dice-pool` block with `[−]`, count display, `[+]`, die selector (or badge), `[Roll]` button, and inline `DiceBreakdownDisclosure`.
  - `apps/web/src/lib/components/stats/StatSheetEditor.svelte`:
    - Add `"dice-pool"` to `FIELD_TYPES`.
    - Render configuration inputs: Default Count (`startValue`), Default Die (`formula`), Min, Max, Step, and `allowDieChange` checkbox.
  - `apps/web/src/lib/components/stats/presentation/nodes/FieldReferenceNode.svelte`:
    - Render interactive dice pool controls in presentation views (`{{stat.field}}`), including roll action and disclosure.
  - `apps/web/src/lib/components/settings/StatSheetTemplatePreview.svelte`:
    - Display `"Dice Pool"` badge and configured default notation (e.g. `3d6`).
  - `apps/web/src/lib/components/vtt/TokenQuickStats.svelte`:
    - Support pinned dice pools with counter adjustments and roll trigger.

### Data Contracts & State Flow

```
[Template]                                   [Entity StatSheet]
{                                            {
  id: "pool-1",                                id: "pool-1",
  type: "dice-pool",                           type: "dice-pool",
  label: "Action Pool",                        label: "Action Pool",
  startValue: 3,        ──[Cloned onto]────>   value: 3,              ──[Player Adjusts]──> value: 4
  formula: "d6",                               formula: "d6",                              formula: "d6"
  min: 0, max: 10, step: 1                     min: 0, max: 10, step: 1
  allowDieChange: true                         allowDieChange: true
}                                            }
                                                        │
                                                        ▼ [Roll Clicked]
                                              diceParser.parse("4d6")
                                                        │
                                                        ▼
                                              diceEngine.execute(...)
                                                        │
                                                        ▼
                                              RollResult { total: 15, parts: [...] }
                                                        │
                                          ┌─────────────┴─────────────┐
                                          ▼                           ▼
                             Notification / VTT Toast       DiceBreakdownDisclosure
                               "= 15 (Sum)"                  Faces: [3, 4, 4, 4]
```

- **Persistence**: Stored directly in the existing entity frontmatter / `entity.statSheet.fields` array in IndexedDB/OPFS. No database schema migration needed.
- **UI & Tokens**:
  - Semantic tokens: `bg-theme-bg`, `border-theme-border`, `text-theme-text`, `text-theme-primary`, `hover:border-theme-primary`.
  - Iconify utility classes: `class="icon-[lucide--minus] h-3 w-3"`, `class="icon-[lucide--plus] h-3 w-3"`, `class="icon-[lucide--dices] h-4 w-4"`.

### Key Technical Decisions & Tradeoffs

1. **Dedicated Field Type vs. Combined Counter/Formula**:
   - _Decision_: Introduce `"dice-pool"` as a distinct `StatSheetFieldType` rather than overloading `"counter"` or `"dice"`.
   - _Rationale_: Avoids brittle heuristics trying to differentiate between a hit point counter and a dice pool. Clear authoring ergonomics in template configuration.
2. **Reusing Existing Field Attributes**:
   - _Decision_: Map the live count to `field.value` (number) and the chosen die sides to `field.formula` (e.g. `"d6"`).
   - _Rationale_: Fully backwards-compatible with `StatSheetFieldSchema` typing (`value: number | string | boolean`), counter bounds clamping (`min`, `max`, `step`), and serialization formats.
3. **Reuse `DiceBreakdownDisclosure`**:
   - _Decision_: Reuse the existing `DiceBreakdownDisclosure` component rather than writing new face-rendering logic.
   - _Rationale_: Guarantees consistent visual presentation and accessibility already verified in #3443 across character sheets and random tables.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Player adjusts count from 3 to 4, clicks roll; rolls `4d6`, logs to dice history, shows `= 14 (Sum)` and breakdown chevron.
- **Zero-Dice Pool**: Count reaches 0 (when `min <= 0`). The roll button is disabled, and an explanatory status label (`"0 dice — cannot roll"`) is presented. No dice engine call is made.
- **Invalid / Missing Formula**: If `formula` is corrupted or empty, defaults safely to `"d6"`.
- **Read-Only / Guest Mode**: `[−]`, `[+]`, and die selectors are disabled when `vault.isGuest` is true.

---

## 3. Tasks & Execution Sequence (When)

- [x] **Task 1: Schema & Action Tests (TDD)**
  - Add unit tests in `packages/schema` for `"dice-pool"` field type validation.
  - Add unit tests in `apps/web/src/lib/utils/stat-sheet-field-actions.test.ts` for:
    - Deriving pool formula (`count` + `die` &rarr; `NdS`).
    - Positive roll execution and history capture.
    - Zero-dice and negative count rejection paths (returns informative error without rolling).
    - Counter clamping with bounds and steps.
- [x] **Task 2: Schema & Presentation Directives**
  - Update `StatSheetFieldTypeSchema` in `packages/schema/src/stat-sheet.ts` to include `"dice-pool"`.
  - Add `allowDieChange` to `StatSheetFieldSchema`.
  - Register `"dice-pool"` in `packages/stat-sheet-engine/src/presentation/directives.ts`.
- [x] **Task 3: Field Actions & Rolling Logic**
  - Implement `rollStatSheetDicePoolField` in `apps/web/src/lib/utils/stat-sheet-field-actions.ts`.
- [x] **Task 4: Template Editor Integration (`StatSheetEditor.svelte`)**
  - Add `"dice-pool"` to field type options.
  - Implement configuration inputs (Default Count, Default Die, Min/Max/Step, Allow Player Die Selection).
  - Update `StatSheetTemplatePreview.svelte` with appropriate badge and formatting.
- [x] **Task 5: View & Presentation Renderers (`StatSheetView.svelte` & `FieldReferenceNode.svelte`)**
  - Implement `dice-pool` rendering in `StatSheetView.svelte`: stepper `[−] N [+]`, die selector / indicator, roll button, outcome badge, and `DiceBreakdownDisclosure`.
  - Implement `dice-pool` rendering in `FieldReferenceNode.svelte` for custom presentation templates.
  - Add support in `TokenQuickStats.svelte` for favorited dice-pool fields.
- [x] **Task 6: Component Verification Tests**
  - Add unit tests in `StatSheetView.test.ts`, `StatSheetEditor.test.ts`, and `FieldReferenceNode.test.ts` covering counter step, die selection, rolling, and zero-count states.
- [x] **Task 7: Quality Gate Verification**
  - Run impacted checks and verify 0 errors.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig ./tsconfig.json --threshold error # in apps/web
```
