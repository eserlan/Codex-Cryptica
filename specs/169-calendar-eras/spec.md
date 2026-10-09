# Feature Specification: Support Multiple Calendar Eras / Epoch-Based Year Numbering

**Feature Branch**: `169-calendar-eras`  
**Created**: 2026-10-03  
**Status**: Draft  
**Input**: User description: "https://github.com/eserlan/Codex-Cryptica/issues/3717 Support multiple calendar eras / epoch-based year numbering"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Multi-Era Configuration & Consistent Date Formatting (Priority: P1)

Worldbuilders often construct settings with historical eras whose year numbering resets or changes (for example: _First Age 1–742_, _Second Age 1–310_, _Third Age 1+_, or _312 Before the Fall_ to _1 After the Fall_). A user can define multiple calendar eras in Vault Settings with distinct names, labels, start years, starting displayed years, and counting directions. Across all views in Codex Cryptica (entity dates, timeline bands, calendar agenda and month views, date picker previews, and exported lore), dates automatically format using the appropriate era label and era-relative displayed year, while retaining continuous underlying chronological ordering.

**Why this priority**: Core value of the feature; ensures the lore presentation matches worldbuilder intent across the application without breaking chronological ordering or existing vaults.

**Independent Test**: Configure two forward eras (e.g. "First Age" starting at year 0 and "Second Age" starting at year 742). Format dates for year 100, 742, and 800. Verify they format as "101 First Age", "1 Second Age", and "59 Second Age" respectively, and sort monotonically in chronological order.

**Acceptance Scenarios**:

1. **Given** a world calendar with multiple configured eras, **When** formatting dates corresponding to years within each era's span, **Then** `CalendarEngine.format()` renders the era-relative year and the era label/name.
2. **Given** an existing vault with only `epochLabel` configured (no eras), **When** formatting dates, **Then** the output behaves identically to the legacy formatting (e.g., `2024 AF`).
3. **Given** two entities with dates in different eras, **When** sorting or plotting them on a timeline, **Then** they sort strictly by their underlying continuous chronology regardless of era boundaries or displayed year numbers.

---

### User Story 2 - Calendar Settings Era Management (Priority: P2)

A vault owner navigates to Vault Settings > Chronology & Calendar. They can view, add, configure, reorder, and delete calendar eras. Each era allows setting a display name (e.g. "Before the Fall"), an optional abbreviated label (e.g. "BF"), an internal starting chronology year, an optional displayed starting year (defaulting to 1), and a counting direction ("forward" or "backward"). Settings changes are saved to the vault calendar configuration with revision tracking and schema validation.

**Why this priority**: Provides the user interface necessary for worldbuilders to customize their calendar eras.

**Independent Test**: In Vault Settings, add a new era "Imperial Era" starting at internal year 1000, save, reload or check store state, and verify the era is persisted in `calendarStore.config.eras`.

**Acceptance Scenarios**:

1. **Given** the Chronology & Calendar settings view, **When** a user clicks "Add Era", **Then** a new editable era entry is added to the list with sensible defaults.
2. **Given** multiple eras, **When** a user adjusts an era's start year or direction, **Then** a live preview illustrates sample internal year conversions for verification.
3. **Given** an era is deleted or modified, **When** the settings are saved, **Then** the calendar revision increments and date displays across the vault update reactively.

---

### User Story 3 - Era Selection and Input in Date Picker (Priority: P3)

When setting dates on entities or timeline events in the Date Picker (`TemporalPicker`), users working with multi-era calendars can select an active era alongside the year wheel or direct entry. If an era is chosen, the year wheel and direct entry display and accept era-relative years (e.g. entering `312 BF` or selecting era `BF` with year `312`), converting deterministically to the underlying internal chronology year.

**Why this priority**: Completes the authoring loop, allowing users to enter dates in world-native era notation without mental arithmetic to compute negative or offset internal years.

**Independent Test**: Open the date picker for a calendar with backwards era "BF" (start -1, yearAtStart 1) and forward era "AF" (start 0, yearAtStart 1). Select era "BF" and year 312 (or type "312 BF"). Save and verify the entity receives internal year -311 (or corresponding internal year) and formats as "312 BF".

**Acceptance Scenarios**:

1. **Given** a calendar with multiple eras, **When** opening the date picker, **Then** the picker displays an era selector indicating the current date's active era.
2. **Given** direct date input, **When** the user types an era label or name with a year (e.g. `312 BF` or `15/04/45 Second Age`), **Then** `parseDirectDateInput` resolves the internal year correctly.
3. **Given** an era change in the picker, **When** switching from one era to another, **Then** the displayed year adjusts to reflect the new era's relative counting without creating an invalid internal date.

---

### User Story 4 - Backward-Counting Eras & Epoch Transitions (Priority: P4)

A worldbuilder creates a calendar with an epoch dividing past and present, such as "Before the Fall" (BF) and "After the Fall" (AF), or "BCE" and "CE". The backward-counting era counts upwards as time moves further into the past (e.g. 1 BF is 1 year before the epoch, 312 BF is 312 years before). The system accurately maps backward eras to negative internal chronology years, ensuring continuous linear ordering across the transition from BF to AF without exposing negative numbers to the reader.

**Why this priority**: Authentic representation of historical and fantasy dating conventions (e.g. Tolkien's Second/Third Ages, D&D Dale Reckoning DR/BDR, Star Wars BBY/ABY).

**Independent Test**: Define era BF (start -1, yearAtStart 1, backward) and era AF (start 0, yearAtStart 1, forward). Test internal years -2, -1, 0, 1 convert to 2 BF, 1 BF, 1 AF, 2 AF respectively. Verify ordering -2 < -1 < 0 < 1.

**Acceptance Scenarios**:

1. **Given** a backward era configured with startYear -1 and yearAtStart 1, **When** calculating displayed year for internal year -311, **Then** it yields displayed year 312 and suffix "BF".
2. **Given** a date entered as "1 BF" and a date entered as "1 AF", **When** querying chronological sequence, **Then** 1 BF precedes 1 AF by exactly 1 year with zero gap or overlap.

---

### Edge Cases

- **Years before any configured era**: If an internal year falls before the earliest defined era, the engine gracefully falls back to displaying the numeric internal year with the calendar's `epochLabel` (or unadorned year if none).
- **Gaps between eras**: If eras are configured with gaps in internal years, any date falling within the gap displays using the previous era or base numeric year without throwing exceptions.
- **Overlapping era boundaries**: Eras are evaluated by their start year and span; in case of ambiguous overlap, the most specific matching era (or the one declared earliest/latest by configuration priority) is applied consistently.
- **Year 0 handling**: Some worlds have a year 0, others transition directly from 1 BF to 1 AF. By supporting configurable `startYear` and `yearAtStart` per era, worldbuilders can choose whether internal year 0 corresponds to a designated year or transitions directly between 1 BF and 1 AF.
- **Legacy vaults without eras**: If `eras` is undefined or empty, `CalendarEngine` retains exact existing behavior with `epochLabel`, preserving 100% backward compatibility for existing vaults and snapshots.
- **Direct input with case-insensitive matching**: Typing `312 bf`, `312 BF`, `BF 312`, or `Second Age 10` parses cleanly.
- **Non-integer or negative inputs**: Direct entry of negative numbers remains supported for advanced users or raw numeric entry, converting appropriately into the era or internal year.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST define `CalendarEra` data interface supporting `id`, `name`, optional `label`, `startYear` (internal numeric year), optional `endYear`, optional `yearAtStart` (default 1), and optional `direction` (`"forward"` | `"backward"`, default `"forward"`).
- **FR-002**: `WorldCalendar` interface in `packages/chronology-engine` and schema definitions MUST add an optional `eras?: CalendarEra[]` property.
- **FR-003**: `CalendarEngine` MUST provide centralized bidirectional conversion between internal chronology year and era representation (`resolveEraForYear(year, config)` and `resolveYearFromEra(eraId, eraYear, config)`).
- **FR-004**: `CalendarEngine.format()` MUST format dates using the active era's label (or name if label is omitted) and era-relative year when `eras` are configured on the calendar.
- **FR-005**: If no eras are configured on a calendar, `CalendarEngine.format()` MUST preserve existing behavior using `config.epochLabel`.
- **FR-006**: `CalendarEngine.parseDirectDateInput()` MUST recognize configured era names and labels in date strings (e.g. `312 BF`, `1 BF`, `10 Second Age`, `01/01/500 AF`) and resolve to the correct internal year.
- **FR-007**: Internal chronology values MUST remain continuous signed integers for linear sorting, calendar arithmetic, duration calculation, and timeline rendering across all era boundaries.
- **FR-008**: System MUST support backward-counting eras where displayed year increases as internal chronology year decreases.
- **FR-009**: Vault Settings Chronology & Calendar section MUST provide a management interface to add, configure, reorder, and remove calendar eras.
- **FR-010**: Date picker (`TemporalPicker`) MUST expose era awareness when the active calendar has eras configured, allowing users to inspect and select eras and era-relative years.
- **FR-011**: Date picker direct input field MUST accept era-qualified date strings and validate them against active calendar eras.
- **FR-012**: Calendar engine repair and validation routines MUST ensure dates with era references remain valid and reparable if calendar configurations are updated or eras are removed.

### Key Entities

- **`CalendarEra`**: Represents an epoch or named historical era within a calendar.
  - `id`: Unique identifier (string).
  - `name`: Full display name (e.g., "After the Fall", "Second Age").
  - `label`: Short abbreviation or suffix (e.g., "AF", "SA").
  - `startYear`: Internal numeric chronology year where the era begins.
  - `endYear`: Optional internal numeric chronology year where the era ends.
  - `yearAtStart`: Displayed year number at the era's start (typically 1).
  - `direction`: `"forward"` (years increase chronologically) or `"backward"` (years count down toward the start year, e.g. BCE/BF).
- **`WorldCalendar`**: Extended with optional `eras?: CalendarEra[]`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% backward compatibility for all existing vaults and calendar tests; zero regression in formatting or validation for calendars without eras.
- **SC-002**: Support for both multi-age sequential resets (e.g. Age 1 -> Age 2 -> Age 3) and bidirectional epochs (e.g. BF -> AF) with 100% deterministic roundtrip conversions (`resolveYearFromEra(resolveEraForYear(y)) === y`).
- **SC-003**: All date display surfaces (`CalendarEngine.format`, timeline agenda, month grid, entity dates, Zen view) reflect configured era labels without code duplication outside `chronology-engine`.
- **SC-004**: Date picker allows selecting and entering era-qualified dates in under 3 interactions.
- **SC-005**: Comprehensive unit test suite in `packages/chronology-engine` and `apps/web` covering era boundary calculations, backward eras, multi-era sorting, direct parsing, and settings persistence.
