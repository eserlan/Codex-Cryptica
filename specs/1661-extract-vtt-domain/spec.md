# Feature Specification: VTT Domain Extraction

**Feature Branch**: `1661-extract-vtt-domain`
**Created**: 2026-07-12
**Status**: Draft
**Input**: Extract pure VTT and map rules from the web application into a smaller domain package.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Preserve VTT sessions across the application (Priority: P1)

As a game host, I can save, reload, and share a VTT session without losing valid
token, selection, grid, measurement, or initiative state while the underlying
session rules are maintained independently from the web interface.

**Why this priority**: Session data is the shared contract between VTT controls,
persistence, and P2P transport. Making its rules independently testable reduces
regression risk before moving additional behavior.

**Independent Test**: A session with legacy token visibility, an invalid selection,
and an out-of-range active turn can be normalized and reloaded with stable, valid
state.

**Acceptance Scenarios**:

1. **Given** a saved VTT session, **When** it is reloaded, **Then** all supported
   session fields are retained without sharing mutable references with the saved
   record.
2. **Given** an older session containing legacy token visibility, **When** it is
   reloaded, **Then** its tokens remain visible according to the supported
   visibility rules.
3. **Given** a saved selection or active turn that no longer references a valid
   token, **When** it is reloaded, **Then** the session uses a valid empty
   selection and turn position.

---

### User Story 2 - Change VTT rules safely (Priority: P2)

As a developer, I can test VTT session rules outside the web interface so rule
changes do not require a browser, interface state, storage, or P2P setup.

**Why this priority**: This is the reusable boundary needed to split the web
application gradually while keeping behavior stable.

**Independent Test**: The VTT domain package can validate and normalize session
data using only package-level tests.

**Acceptance Scenarios**:

1. **Given** a VTT session rule change, **When** its package tests run, **Then**
   they validate the behavior without loading the web application.

---

### User Story 3 - Continue the extraction incrementally (Priority: P3)

As a developer, I can move additional token, grid, measurement, initiative, and
encounter rules into the same package without changing the existing user-facing VTT
experience.

**Why this priority**: A stable shared model avoids repeated web-only abstractions
and provides a clear destination for later slices.

**Independent Test**: Existing VTT manager tests continue to pass while the package
exposes the shared data contract.

**Acceptance Scenarios**:

1. **Given** a future pure VTT rule, **When** it is extracted, **Then** it can use
   the shared package model without importing web-only code.

### Edge Cases

- A session omits optional grid, chat, ping, or measurement fields.
- A session contains a legacy or unsupported token visibility value.
- A saved turn index is negative or exceeds the current initiative order.
- A saved selection references a missing token.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST maintain a reusable, framework-independent VTT
  session model outside the web application.
- **FR-002**: The system MUST normalize legacy token visibility to a supported
  visibility state when reading a session.
- **FR-003**: The system MUST produce independent copies of session collections and
  mutable nested values when normalizing a session.
- **FR-004**: The system MUST clear a saved selection that does not reference a
  session token.
- **FR-005**: The system MUST constrain the active turn to the available initiative
  order when reading a session.
- **FR-006**: The web application MUST consume the shared model without changing
  current VTT session behavior.
- **FR-007**: The extracted model MUST remain free of browser storage, P2P
  transport, and interface state dependencies.

### Key Entities

- **VTT Session**: The saved state of an encounter, including map, mode, tokens,
  initiative, selection, grid, measurement, chat, and timestamps.
- **Token**: A positioned encounter participant with ownership, visibility, and
  display state.
- **Session Normalization Result**: A valid, independent session representation
  that can safely be applied by the interface.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All extracted session-normalization behaviors are verified by
  package-level unit tests.
- **SC-002**: Existing VTT session snapshot tests pass without user-visible
  behavior changes.
- **SC-003**: The shared VTT model imports no web application modules or
  browser-only dependencies.
- **SC-004**: A future pure VTT rule can import the shared model from one package
  entry point.

## Assumptions

- This slice establishes the shared VTT model and session normalization boundary;
  it does not move Svelte managers, browser persistence, P2P transport, or VTT UI.
- Existing `map-engine` is the correct home for map and VTT domain logic, avoiding
  a competing package.
