# Research: Support Multiple Calendar Eras / Epoch-Based Year Numbering

**Feature Branch**: `169-calendar-eras`  
**Date**: 2026-10-03  
**Status**: Completed

## 1. Mathematical Representation & Bidirectional Invertibility

### Problem Analysis

Codex Cryptica relies on a continuous, linear integer timeline:

- `year: number` internally stored in `TemporalMetadata` and `DateSelection`.
- `getTimelineValue` relies on `date.year * daysInYear + monthOffset + dayOffset`.
- Preserving the internal integer `year` ensures continuous sorting, calendar math, duration calculations, and timeline positioning without breaking changes across the app.

Worldbuilding dating systems, however, often use:

1. **Forward sequential eras / ages**: e.g. First Age 1–742, Second Age 1–310, Third Age 1–...
2. **Bidirectional epochs with backward-counting past**: e.g. 312 Before the Fall (BF) → 1 After the Fall (AF), or BCE/CE.
3. **Dynastic/Regnal eras**: year numbers reset with each reign or dynasty.

### Mathematical Formulation

Each `CalendarEra` is defined as:

```ts
export interface CalendarEra {
  id: string;
  name: string; // e.g. "After the Fall", "Second Age"
  label?: string; // short abbreviation or suffix, e.g. "AF", "SA", "BF"
  startYear: number; // absolute internal chronology year at which the era begins
  endYear?: number; // optional absolute internal chronology year (inclusive) at which the era ends
  yearAtStart?: number; // displayed year at start; defaults to 1
  direction?: "forward" | "backward"; // defaults to "forward"
}
```

#### Forward Era Math

- Condition: `direction !== "backward"`.
- Range: `internalYear >= startYear` and (`endYear === undefined` or `internalYear <= endYear`).
- Displayed year formula:
  $$\text{eraYear} = (\text{yearAtStart} \mathbin{??} 1) + (\text{internalYear} - \text{startYear})$$
- Inversion (eraYear to internalYear):
  $$\text{internalYear} = \text{startYear} + (\text{eraYear} - (\text{yearAtStart} \mathbin{??} 1))$$

#### Backward Era Math

- Condition: `direction === "backward"`.
- Range: `internalYear <= startYear` and (`endYear === undefined` or `internalYear >= endYear`).
- As `internalYear` decreases (further into the past), `eraYear` increases:
  $$\text{eraYear} = (\text{yearAtStart} \mathbin{??} 1) + (\text{startYear} - \text{internalYear})$$
- Inversion (eraYear to internalYear):
  $$\text{internalYear} = \text{startYear} - (\text{eraYear} - (\text{yearAtStart} \mathbin{??} 1))$$

#### The Gregorian / Two-Epoch Example

- **Era BF**: `startYear: -1`, `yearAtStart: 1`, `direction: "backward"`, `label: "BF"`.
  - Internal `-1`: $1 + (-1 - (-1)) = 1 \text{ BF}$.
  - Internal `-311`: $1 + (-1 - (-311)) = 311 \text{ BF}$. (Or if startYear is 0, yields 312 BF).
- **Era AF**: `startYear: 0`, `yearAtStart: 1`, `direction: "forward"`, `label: "AF"`.
  - Internal `0`: $1 + (0 - 0) = 1 \text{ AF}$.
  - Internal `1`: $1 + (1 - 0) = 2 \text{ AF}$.
- Both directions are strictly linear and bijective.

---

## 2. Era Resolution & Fallback Semantics

### Resolution Algorithm

When resolving an era for an `internalYear`:

1. If `config.eras` is empty or undefined:
   - Return `null`. Formatting uses `config.epochLabel` (or unadorned year if omitted).
2. Filter candidate eras where `internalYear` falls within `[startYear, endYear]` (respecting direction).
   - If `endYear` is not explicitly set, determine implicit boundaries:
     - For forward eras, the era ends at `nextForwardEra.startYear - 1`.
     - For backward eras, the era ends at `nextBackwardEra.startYear + 1`.
3. If multiple candidates match (overlapping configurations):
   - Sort by configuration order or narrowest explicit range to yield deterministic results.
4. If no era matches (e.g., year falls before any defined era):
   - Fall back to the earliest era, or format as standard numeric year with `config.epochLabel` if set.
   - Never throw or crash.

---

## 3. Formatting & Direct Parsing Centralization

### Formatting (`CalendarEngine.format`)

- Current behavior:
  `yearStr = `${date.year}${config.epochLabel ? " " + config.epochLabel : ""}`
- Era-aware behavior:
  - Call `resolveEraForYear(date.year, config)`.
  - If resolved:
    - Display year: `const suffix = era.label ? ` ${era.label}` : ` ${era.name}`;`
    - Output: `${eraYear}${suffix}`.
  - If unresolved:
    - Retain legacy format: `${date.year}${config.epochLabel ? ` ${config.epochLabel}` : ""}`.
- Because `CalendarEngine.format()` is already imported by:
  - `apps/web/src/lib/components/timeline/CalendarMonthView.svelte`
  - `apps/web/src/lib/components/timeline/CalendarAgendaView.svelte`
  - `apps/web/src/lib/components/timeline/TemporalEditor.svelte`
  - `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
  - `apps/web/src/lib/components/entity-detail/DetailTabs.svelte`
  - `apps/web/src/lib/components/zen/ZenContent.svelte`
    all views automatically become era-aware with zero UI-level duplication!

### Direct Parsing (`parseDirectDateInput`)

- Allow strings containing era label or era name:
  - Examples: `312 BF`, `BF 312`, `15/04/312 BF`, `45 Second Age`, `Second Age 45`.
- Regex / Token extraction:
  - Identify matching era from `config.eras` by case-insensitive name or label.
  - Extract the era-relative year and date components (day, month).
  - Convert `eraYear` to `internalYear` via `resolveYearFromEra(era, eraYear)`.
  - Validate with `CalendarEngine.isValid({ year: internalYear, month, day }, config)`.

---

## 4. Bounded Responsibility & Modular Decomposition (Principle XIV)

To prevent file bloating and uphold the Codex Constitution:

1. **`packages/chronology-engine/src/eras.ts`**:
   - New dedicated module in `chronology-engine`.
   - Contains: `resolveEraForYear`, `resolveYearFromEra`, `formatEraDate`, `parseEraString`, and era validation.
   - Keeps `packages/chronology-engine/src/engine.ts` lightweight and clean.
2. **`apps/web/src/lib/components/settings/CalendarEraSettings.svelte`**:
   - Extracted Svelte 5 component for Vault Settings.
   - Handles era creation, editing, direction toggling, and live preview.
   - Kept separate from `VaultSettings.svelte` to avoid expanding it past 500 lines.
3. **`apps/web/src/lib/components/timeline/TemporalPickerEraSelector.svelte`**:
   - Clean UI selector for selecting active calendar era in `TemporalPicker`.

---

## 5. Decision Log

- **Decision 1: Store only internal numeric year, not era ID in entity frontmatter.**
  - _Rationale_: Entities only need to store `year: number`. If eras are reorganized or renamed in calendar settings, existing entity dates immediately display in the updated era reckoning without needing database migrations.
- **Decision 2: Backward counting starts from `startYear` and moves into deeper negatives.**
  - _Rationale_: Intuitive representation for BCE / Before Fall epochs, mapping cleanly to negative integer timeline space.
- **Decision 3: Default `yearAtStart` to 1.**
  - _Rationale_: Almost all real and fantasy calendar eras start at Year 1 rather than Year 0. Supporting an optional `yearAtStart` covers worlds with Year 0 without forcing it.
