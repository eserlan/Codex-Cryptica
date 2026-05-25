# Feature Specification: Scroll Wheel Date Picker

**Feature Branch**: `116-scroll-wheel-date-picker`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "Better date picker: dynamic scroll-wheel picker for custom calendars from GitHub issue #873 (tracked under specification #116)"

## Clarifications

### Session 2026-05-24

- Q: How should intercalary days be represented in saved date selections? -> A: Intercalary days are saved as named anchors that replace normal month/day selection for that date.
- Q: How should users navigate very large numeric date ranges? -> A: Wheel columns with large numeric ranges also provide direct numeric entry or jump controls for fast positioning.
- Q: How should saved dates handle renamed or reordered named calendar values? -> A: Named calendar values use stable identities; saved dates keep pointing to the same value across label renames and reordering.
- Q: How should long labels behave on small viewports? -> A: Long labels are truncated with an ellipsis inside wheel columns; the full label appears in the synchronized preview.
- Q: How should invalid saved dates behave after campaign calendar edits? -> A: Invalid saved dates open in a repair state; the original value is preserved until the user confirms the nearest valid replacement.
- Q: How should users control partial date precision? -> A: The picker includes an explicit precision control, such as Year only, Year + unit, Full date, or Anchor where applicable.
- Q: How should invalid direct numeric entries behave? -> A: Invalid direct numeric entries are rejected with inline feedback; the picker keeps the last valid value.
- Q: What accessibility behavior should wheel columns expose? -> A: Each wheel column exposes keyboard-operable stepper/listbox behavior with clear current-value announcements.
- Q: How should saved dates track calendar configuration changes? -> A: Saved date selections record the calendar configuration version/revision they were created against.
- Q: What happens if the campaign calendar changes while the picker is open? -> A: The picker edits against the calendar snapshot it opened with; if the calendar changes before save, the user must refresh or repair before confirming.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Pick Dates With Scroll Wheels (Priority: P1)

As a campaign author, I want to pick a date by scrolling aligned date columns so that choosing campaign dates feels fast and less cumbersome on touch and desktop devices.

**Why this priority**: The issue is primarily about replacing the current cumbersome date entry experience with a more direct picker.

**Independent Test**: Open the date picker for a standard calendar date, scroll the visible columns, and confirm the selected date updates only to the values centered in the active selection area.

**Acceptance Scenarios**:

1. **Given** a user opens the date picker for a full date, **When** they scroll the day, month, and year columns, **Then** each column snaps to one centered value and the selected date reflects those centered values.
2. **Given** a user uses a mouse wheel, trackpad, touch drag, or keyboard control, **When** they change a column value, **Then** the picker provides the same final selected date for the same intended value.
3. **Given** a date value already exists, **When** the picker opens, **Then** the existing date is centered in the scroll wheels without requiring the user to re-enter the date.

---

### User Story 2 - Use Named Calendar Units (Priority: P2)

As a world builder, I want the picker to show named calendar units such as custom months, seasons, moon phases, or zodiac signs so that the control matches the language of my setting.

**Why this priority**: Custom calendar immersion is a core requirement of Codex Cryptica date entry and the issue specifically calls out replacing numeric columns with labels when a calendar unit is not numeric.

**Independent Test**: Configure a calendar with at least one named unit and verify the picker shows those labels in the appropriate column while preserving a valid underlying date value.

**Acceptance Scenarios**:

1. **Given** a campaign calendar has named months, **When** the picker opens, **Then** the month column shows the configured month names instead of generic month numbers.
2. **Given** a campaign calendar uses a non-month named unit such as seasons, **When** the user edits that part of the date, **Then** the picker shows the configured labels in order and stores the selected label's corresponding position.
3. **Given** named values are longer than numeric values, **When** the picker displays them, **Then** the picker remains readable without text clipping or overlapping adjacent columns.

---

### User Story 3 - Keep Dates Valid When Context Changes (Priority: P3)

As a user editing a campaign date, I want lower-level date values to adjust when a higher-level choice changes the allowed range so that I cannot accidentally save an impossible date.

**Why this priority**: Custom calendars can have different day counts per month or cycle; the picker must protect existing data from invalid combinations.

**Independent Test**: Select a date near the end of a long month, change to a shorter month, and confirm the day value is automatically capped to the last valid day.

**Acceptance Scenarios**:

1. **Given** the selected day is 34 in a 35-day month, **When** the user changes to a month with 30 days, **Then** the picker changes the selected day to 30 and shows that adjustment clearly.
2. **Given** the selected day remains valid after a parent unit changes, **When** the user changes that parent unit, **Then** the selected day is preserved.
3. **Given** a saved date becomes invalid because the campaign calendar configuration changed, **When** the picker opens that date, **Then** it preserves the original value, enters a repair state, presents the nearest valid equivalent, and requires the user to confirm the replacement before saving.

---

### Edge Cases

- A calendar may have very large numeric ranges, such as hundreds of days in a year; the picker must provide direct numeric entry or jump controls so users are not forced into long, precise dragging.
- A user may type a numeric value outside the active range; the picker must reject the entry, show inline feedback, and keep the last valid value.
- A user may rely on keyboard navigation or assistive technology; each wheel column must remain operable as a stepper or listbox with clear current-value announcements.
- A calendar unit may contain only one value; that column should be stable and clearly selected rather than behaving like a broken scroll control.
- A calendar may combine numeric and named columns; column sizing must keep all active values readable on mobile and desktop, truncating long wheel labels with an ellipsis while showing the full text in the preview.
- A previously saved partial date may omit day or month; opening the picker must preserve that precision unless the user explicitly adds more detail.
- A previously saved date may no longer exist under the current campaign calendar; opening the picker must preserve the original value until the user confirms a valid repaired replacement.
- A saved date may have been created against an older campaign calendar revision; the picker must use that revision information to identify and explain repair states.
- The campaign calendar may change while the picker is open; the picker must not save a date computed from mixed calendar rules and must require refresh or repair before confirmation.
- Negative, zero, or era-relative years must be displayed consistently with the campaign's existing date rules.
- Calendar labels may be duplicated, renamed, reordered, or visually similar; the picker must preserve the selected stable value identity even if the visible text or order changes.
- A calendar configuration may include intercalary days that fall outside standard month boundaries; the picker must represent these as named anchors that replace normal month/day selection for that date.
- Rapid continuous scrolling across columns must remain responsive and must not leave the picker showing stale, impossible, or partially updated date combinations.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a scroll-wheel date picker for campaign date fields that supports selecting year, parent calendar unit, and day values where those parts are available.
- **FR-002**: System MUST center the active value for each visible column in a clear selection area before treating that value as selected.
- **FR-003**: System MUST support numeric columns with configurable minimum and maximum ranges based on the active calendar configuration.
- **FR-004**: System MUST support named columns whose visible values come from the active campaign calendar's ordered labels.
- **FR-005**: System MUST preserve a stable identity for each named calendar value separately from its display label and current order so duplicated, renamed, or reordered labels do not corrupt saved date selections.
- **FR-006**: System MUST update dependent column ranges by evaluating calendar constraints from the highest structural date tier to the lowest available tier.
- **FR-007**: System MUST automatically cap a lower-level date part to the nearest valid value, defaulting to the maximum allowed value of the new range, when a higher-level date part reduces the allowed range.
- **FR-008**: System MUST visually communicate automatic date adjustments before the user saves the edited date.
- **FR-009**: Users MUST be able to operate the picker with touch, pointer, mouse wheel or trackpad scrolling, and keyboard controls.
- **FR-010**: System MUST keep selected values, preview text, and saved output synchronized throughout picker interaction.
- **FR-011**: System MUST preserve existing support for partial dates such as year-only and year-with-parent-unit dates.
- **FR-012**: System MUST prevent saving impossible dates created by calendar range changes.
- **FR-013**: System MUST display long named calendar values without clipping, overlapping, or making adjacent columns unusable. On small viewports, long labels MUST truncate with an ellipsis inside their designated wheel track while the synchronized preview displays the full date representation.
- **FR-014**: System MUST expose each wheel column as a keyboard-operable stepper or listbox with accessible names and clear current-value announcements.
- **FR-015**: System MUST default to the existing campaign calendar behavior when no custom named units are configured.
- **FR-016**: System MUST save intercalary days as named date anchors instead of forcing them into month/day values.
- **FR-017**: System MUST provide direct numeric entry or jump controls for numeric wheel columns whose configured range is too large for efficient scrolling alone.
- **FR-018**: System MUST preserve invalid saved date values after campaign calendar edits until the user confirms a repaired valid replacement.
- **FR-019**: System MUST provide an explicit precision control for date selections, including year-only, year-with-parent-unit, full date, and named anchor precision where those options apply.
- **FR-020**: System MUST reject invalid direct numeric entries with inline feedback and retain the last valid value.
- **FR-021**: System MUST record the campaign calendar version or revision used when each date selection is saved.
- **FR-022**: System MUST evaluate an open picker against the campaign calendar snapshot it opened with and require refresh or repair before saving if that calendar changes.

### Key Entities

- **Calendar Unit**: A selectable part of a campaign date, such as year, month, season, moon phase, or day.
- **Calendar Unit Option**: One selectable value within a calendar unit, either numeric or named; named options have stable identities plus display labels and ordering.
- **Date Selection**: The currently selected set of date parts, the explicit precision level chosen by the user, and the campaign calendar revision used when the date was saved.
- **Calendar Constraint**: The valid value range for one date part based on the selected values of higher-level parts.
- **Calendar Snapshot**: The campaign calendar revision and rules used by an open picker session while a user edits a date.
- **Intercalary Anchor**: A named saved date position outside the standard month/day hierarchy, such as a festival day between months.
- **Repair State**: The picker state shown when a saved date no longer matches the active campaign calendar and needs user-confirmed replacement.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can select or edit a full campaign date in 10 seconds or less during usability testing.
- **SC-002**: 100% of configured named calendar values appear in the picker in the same order as the campaign calendar.
- **SC-003**: 100% of parent-unit changes that reduce valid day ranges result in a valid selected date before save.
- **SC-004**: Users can complete the primary date selection flow on a phone-sized viewport without text overlap or unreachable controls.
- **SC-005**: Keyboard-only users can open the picker, change every visible date part, confirm the date, and close the picker without pointer input.
- **SC-006**: Existing saved partial dates remain partial unless the user intentionally selects additional date detail.

## Assumptions

- This feature refines the existing campaign date picker from `specs/045-campaign-date-picker` rather than introducing a separate date model.
- The first release will support the calendar units already available in campaign settings and should not require users to define new calendar concepts solely for this picker.
- Automatic capping chooses the highest valid value in the new range when the previous value exceeds that range.
