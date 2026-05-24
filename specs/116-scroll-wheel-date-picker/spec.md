# Feature Specification: Scroll Wheel Date Picker

**Feature Branch**: `116-scroll-wheel-date-picker`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "Better date picker: dynamic scroll-wheel picker for custom calendars from GitHub issue #873"

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
3. **Given** a saved date becomes invalid because the campaign calendar configuration changed, **When** the picker opens that date, **Then** it presents the nearest valid equivalent and requires the user to confirm the resulting value before saving.

---

### Edge Cases

- A calendar may have very large numeric ranges, such as hundreds of days in a year; the picker must remain navigable without requiring long, precise dragging.
- A calendar unit may contain only one value; that column should be stable and clearly selected rather than behaving like a broken scroll control.
- A calendar may combine numeric and named columns; column sizing must keep all active values readable on mobile and desktop.
- A previously saved partial date may omit day or month; opening the picker must preserve that precision unless the user explicitly adds more detail.
- Negative, zero, or era-relative years must be displayed consistently with the campaign's existing date rules.
- Calendar labels may be duplicated or similar; the picker must preserve the selected ordered value even if two labels have the same visible text.
- A calendar configuration may include intercalary days that fall outside standard month boundaries; the picker must gracefully swap or lock affected columns to represent those unique timeline anchors.
- Rapid continuous scrolling across columns must remain responsive and must not leave the picker showing stale, impossible, or partially updated date combinations.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a scroll-wheel date picker for campaign date fields that supports selecting year, parent calendar unit, and day values where those parts are available.
- **FR-002**: System MUST center the active value for each visible column in a clear selection area before treating that value as selected.
- **FR-003**: System MUST support numeric columns with configurable minimum and maximum ranges based on the active calendar configuration.
- **FR-004**: System MUST support named columns whose visible values come from the active campaign calendar's ordered labels.
- **FR-005**: System MUST preserve the ordered position of a named value separately from its display label so duplicated or renamed labels do not corrupt selection behavior.
- **FR-006**: System MUST update dependent column ranges by evaluating calendar constraints from the highest structural date tier to the lowest available tier.
- **FR-007**: System MUST automatically cap a lower-level date part to the nearest valid value, defaulting to the maximum allowed value of the new range, when a higher-level date part reduces the allowed range.
- **FR-008**: System MUST visually communicate automatic date adjustments before the user saves the edited date.
- **FR-009**: Users MUST be able to operate the picker with touch, pointer, mouse wheel or trackpad scrolling, and keyboard controls.
- **FR-010**: System MUST keep selected values, preview text, and saved output synchronized throughout picker interaction.
- **FR-011**: System MUST preserve existing support for partial dates such as year-only and year-with-parent-unit dates.
- **FR-012**: System MUST prevent saving impossible dates created by calendar range changes.
- **FR-013**: System MUST display long named calendar values without clipping, overlapping, or making adjacent columns unusable. On small viewports, text MUST wrap or truncate cleanly within its designated wheel track while the synchronized preview displays the full date representation.
- **FR-014**: System MUST provide accessible names and current-value announcements for each date column.
- **FR-015**: System MUST default to the existing campaign calendar behavior when no custom named units are configured.

### Key Entities

- **Calendar Unit**: A selectable part of a campaign date, such as year, month, season, moon phase, or day.
- **Calendar Unit Option**: One ordered value within a calendar unit, either numeric or named.
- **Date Selection**: The currently selected set of date parts and the precision level chosen by the user.
- **Calendar Constraint**: The valid value range for one date part based on the selected values of higher-level parts.
- **Intercalary Anchor**: A named date position outside the standard unit hierarchy, such as a festival day between months.

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
