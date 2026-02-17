# Feature Specification: Campaign Date Picker

**Feature Branch**: `045-campaign-date-picker`  
**Created**: 2026-02-17  
**Status**: Draft  
**Input**: User description: "campaign date picker https://github.com/eserlan/Codex-Cryptica/issues/157"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Narrative Year Navigation (Priority: P1)

As a lore keeper, I want to quickly assign a year to my entities using defined world eras so that my timeline remains consistent without manual math.

**Why this priority**: Year is the primary chronological anchor for the world timeline. Utilizing existing Eras makes date entry intuitive and contextually relevant.

**Independent Test**: Can be tested by opening the date picker, selecting an era, and picking a year within that era's range.

**Acceptance Scenarios**:

1. **Given** a world with defined Eras (e.g., "Age of Fire": 1000-1500), **When** I click the date picker and select "Age of Fire", **Then** the year input should default to or be constrained within 1000-1500.
2. **Given** no defined Eras, **When** I open the date picker, **Then** I should be able to enter any numeric year directly.

---

### User Story 2 - Campaign-Specific Calendar (Priority: P2)

As a world builder, I want to use custom month names and year structures defined in my campaign settings so that the interface reflects my world's unique culture.

**Why this priority**: Standard Gregorian calendars often break immersion in fantasy or sci-fi settings.

**Independent Test**: Can be tested by defining custom months in settings and verifying they appear in the date picker dropdown.

**Acceptance Scenarios**:

1. **Given** a campaign with custom months (e.g., "Hammer", "Alturiak"), **When** I open the date picker, **Then** the month selection should show these names instead of 1-12 or January-December.
2. **Given** a campaign with a different number of months (e.g., 10 months), **When** I scroll the month picker, **Then** it should only show those 10 defined months.

---

### User Story 3 - Granular Detail Level (Priority: P3)

As a user, I want to decide if an event needs a specific day/month or just a year so that I don't have to provide precision where it isn't narratively significant.

**Why this priority**: Simplifies data entry for "older stuff" where specific dates are forgotten.

**Independent Test**: Can be tested by toggling between "Year Only" and "Full Date" modes in the picker.

**Acceptance Scenarios**:

1. **Given** a new entity, **When** I use the date picker, **Then** I should be able to save just a Year and leave Month/Day blank.
2. **Given** an existing "Year Only" date, **When** I edit it, **Then** I should be able to add a Month/Day if needed.

---

### Edge Cases

- **Negative Years (BCE/BC)**: For the MVP, the system will support negative integers (e.g., -500) to represent pre-history or "Before Era" dates. This ensures mathematical consistency in the timeline while maintaining simplicity. Future iterations may add display suffixes.
- **Inter-Era Overlap**: If two Eras overlap in time, the picker will prioritize the Era with the more specific (narrower) range or allow the user to toggle between them.
- **Unbounded Eras**: Eras with a start year but no defined end year (e.g., "The Modern Age") will be treated as extending to "Present". For the MVP, "Present" is a fixed narrative marker set in Campaign Settings (defaulting to the highest year in the vault), ensuring timeline stability independent of the system clock.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a popover date picker that replaces standard numeric inputs for all `TemporalMetadata` fields.
- **FR-002**: System MUST allow users to select a year by first selecting a defined World Era.
- **FR-003**: System MUST support custom month names defined at the Campaign level.
- **FR-004**: System MUST allow defining the number of months per year AND the specific number of days for each month in Campaign Settings.
- **FR-005**: System MUST allow saving partial dates (Year only, or Year/Month only).
- **FR-006**: System MUST persist the specific campaign calendar configuration within the vault metadata.
- **FR-007**: System MUST allow defining an optional `epochLabel` (e.g., "AF", "BCE") to be appended to years in display.
- **FR-008**: System MUST support a custom number of days per week for narrative consistency.
- **FR-009**: System MUST support a "Standard Gregorian" mode by default, which can be toggled off in settings to enable full calendar customization.

### Key Entities

- **CampaignCalendar**: Represents the chronological rules of the world (Month names, days per month, etc).
- **WorldEra**: Existing entity; used as a grouping mechanism for years in the picker.
- **TemporalMetadata**: The data structure being edited (Year, Month, Day, Label).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can select a date within a specific Era in under 10 seconds.
- **SC-002**: 100% of custom month names defined in settings are correctly reflected in the picker UI.
- **SC-003**: 0% of "Year Only" entries are rejected by the validation logic.
- **SC-004**: The picker UI correctly adapts its layout between mobile and desktop views.
