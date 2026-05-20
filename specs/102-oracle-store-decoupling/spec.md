# Feature Specification: Oracle Store Decomposition

**Feature Branch**: `102-oracle-store-decoupling`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "oracle svelte decompose refactor according to amalysis"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Seamless AI Interaction (Priority: P1)

As a user, I want to chat with the Oracle, regenerate entity content, and generate visualizations without any perceived change in behavior or performance during the architectural refactor.

**Why this priority**: Core functionality must remain intact. Any regression here breaks the primary value proposition of the Oracle.

**Independent Test**: Can be fully tested by performing a chat command, a regeneration action, and an image generation action. Success is defined as these actions completing as they did before the refactor.

**Acceptance Scenarios**:

1. **Given** the Oracle is open, **When** I send a message, **Then** the Oracle should process the intent and provide a response.
2. **Given** a message with a visualization action, **When** I click "Draw", **Then** the "Thinking" indicator should appear and eventually be replaced by the generated image.

---

### User Story 2 - Consistent Settings Management (Priority: P2)

As a user, I want my AI settings (API keys, tiers, models) to be persisted and synchronized across tabs correctly after the store is decomposed.

**Why this priority**: Settings persistence is critical for the "advanced" tier and user experience consistency.

**Independent Test**: Can be tested by changing the API key in one tab and verifying it is updated in another, and persists after a page reload.

**Acceptance Scenarios**:

1. **Given** I am in the settings panel, **When** I update my API key, **Then** the new key should be saved to the database and used for subsequent requests.

---

### User Story 3 - Transparent Draft Reconciliation (Priority: P2)

As a user, I want AI-generated drafts to be merged into my vault entities correctly, using the "Smart Apply" logic that was previously buried in the monolithic store.

**Why this priority**: This is a complex logic branch that must be isolated but preserved to ensure data integrity during AI updates.

**Independent Test**: Can be tested by applying a discovery proposal and verifying that the entity content and lore are merged according to the reconciliation logic.

**Acceptance Scenarios**:

1. **Given** a discovery proposal, **When** I click "Apply", **Then** the entity should be updated with the merged content without losing existing data.

---

### Edge Cases

- **Worker Race Conditions**: What happens if the Web Worker sends a discovery event while the store is being initialized or destroyed?
- **Circular Dependencies**: How does the system handle managers that might need to reference each other or the vault store? (Mitigated by constructor DI).
- **Stale Context**: How to ensure `OracleExecutionContext` always has the latest snapshots of other stores (vault, categories, etc.)?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST decompose `oracle.svelte.ts` into at least 6 specialized managers: UI, Context, Chat, Actions, Settings, and Reconciliation.
- **FR-002**: System MUST maintain the `OracleStore` class as a thin facade to ensure backward compatibility for all existing importers.
- **FR-003**: System MUST isolate the `OracleExecutionContext` assembly logic to a dedicated manager to simplify the "glue" between UI and Engine.
- **FR-004**: System MUST ensure all reactive states (`$state`, `$derived`) are preserved and remain reactive across the new manager boundaries.
- **FR-005**: System MUST wrap the `ChatHistoryService` and `OracleSettingsService` from the engine package within focused managers.
- **FR-006**: System MUST use constructor-based dependency injection for all managers to facilitate unit testing and avoid singleton coupling.

### Key Entities _(include if feature involves data)_

- **OracleStore (Facade)**: The public entry point; delegates all calls to internal managers.
- **OracleExecutionContext**: A complex transient object that captures the state of the workspace (vault, chat, settings) for the AI engine.
- **ChatMessage**: The unit of conversation history, now managed by a dedicated Chat Manager.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `oracle.svelte.ts` line count is reduced from 902 lines to under 150 lines.
- **SC-002**: 100% of existing unit tests for the Oracle (approx. 40 tests) pass without modification to the test logic.
- **SC-003**: All 48 components and services importing the `oracle` store function correctly without changing their import paths or method calls.
- **SC-004**: Each new manager has at least 80% unit test coverage for its specific logic.
