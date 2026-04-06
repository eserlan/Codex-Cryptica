# Feature Specification: Settings Panel Refactoring

**Feature Branch**: `016-settings-refactor`  
**Created**: 2026-01-29  
**Status**: Draft  
**Input**: User description: "proper config/settings (not everything under cloud)"

## User Scenarios & Testing (mandatory)

### User Story 1 - Access Tabbed Settings (Priority: P1)

As a user, I want to click a single settings button and see a categorized (tabbed) interface so that I can manage different parts of the application without confusion.

**Why this priority**: Core navigation improvement. Decouples settings from the "Cloud" identity.

**Independent Test**: Can be tested by clicking the gear icon and verifying that a modal opens with at least "Vault" and "Cloud Sync" tabs.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** I click the settings gear in the header, **Then** the Settings Modal opens.
2. **Given** the Settings Modal is open, **When** I click a tab (e.g., "Intelligence"), **Then** the content area switches to the corresponding settings pane.

---

### User Story 2 - Integrated Category Management (Priority: P2)

As a user, I want to manage my entity categories directly within the settings panel instead of a separate modal journey.

**Why this priority**: Simplifies the UI architecture and makes "Schema" a first-class citizen of settings.

**Independent Test**: Navigate to Settings -> Schema and verify the Category Settings are visible and functional.

**Acceptance Scenarios**:

1. **Given** the Settings Modal is open on the "Schema" tab, **When** I add or edit a category, **Then** the changes are reflected in the vault immediately.

---

### User Story 3 - Consolidated Intelligence Config (Priority: P3)

As a user, I want to manage my AI API keys and model tiers in a dedicated "Intelligence" tab.

**Why this priority**: Keeps sensitive API configuration organized and separate from general vault/sync settings.

**Independent Test**: Navigate to Settings -> Intelligence and verify the Gemini API configuration is functional.

**Acceptance Scenarios**:

1. **Given** the Settings Modal is open on the "Intelligence" tab, **When** I enter an API key, **Then** the Lore Oracle is enabled.

---

### Edge Cases

- **Mobile View**: How does the sidebar/tabs layout handle narrow viewports? (Requirement: Sidebar should collapse to icons or a top-bar).
- **Unsaved Changes**: Do we need a "Save" button or is it auto-save? (Decision: Follow existing project pattern of auto-save/reactive updates).

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: System MUST provide a unified `SettingsModal` component.
- **FR-002**: System MUST support tabbed navigation between Vault, Sync, Intelligence, Schema, and About.
- **FR-003**: System MUST allow `CloudStatus` to be embedded in the Sync tab without its own trigger/dropdown.
- **FR-004**: System MUST move `AISettings` to the Intelligence tab.
- **FR-005**: System MUST move `CategorySettings` to the Schema tab.
- **FR-006**: System MUST include a "About/Legal" tab with links to Privacy and Terms.

### Key Entities (include if feature involves data)

- **SettingsTab**: An enumeration of allowed settings panes (`vault`, `sync`, `intelligence`, `schema`, `about`).
- **UIStore State**: Persistent or transient state tracking the `activeSettingsTab`.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: User can switch between any two settings categories in under 2 clicks.
- **SC-002**: All legal links are reachable within 2 clicks from the settings menu.
- **SC-003**: The "Cloud" button in the header is replaced or augmented by a general "Settings" icon.
