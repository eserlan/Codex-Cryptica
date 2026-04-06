# Feature Specification: Staging Indicator

**Feature Branch**: `074-staging-indicator`  
**Created**: 2026-03-20  
**Status**: Final  
**Input**: User description: "a way to know we're in staging https://github.com/eserlan/Codex-Cryptica/issues/455"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Brand-Integrated Environment Awareness (Priority: P1)

As a developer or tester, I want to immediately see that I am in the staging environment so that I don't accidentally perform actions thinking I am in production.

**Why this priority**: Essential for preventing data corruption or accidental "live" changes by providing visual context.

**Independent Test**: Can be fully tested by loading the staging URL and verifying that the "Codex Cryptica" brand title in the header has a distinct staging style (red background/glow).

**Acceptance Scenarios**:

1. **Given** I am browsing the staging environment, **When** the page loads, **Then** the brand title in the header is wrapped in a high-contrast red pill with a white border and glow.
2. **Given** I am browsing the production environment, **When** the page loads, **Then** the brand title appears with its standard styling.

---

### User Story 2 - Small Screen Consistency (Priority: P2)

As a mobile user testing the staging environment, I want the environment indicator to be visible even on small screens without taking up extra vertical space.

**Why this priority**: Specifically requested in the issue ("Especially useful on small screens"). Ensures usability across devices.

**Independent Test**: Can be tested by resizing the browser to mobile dimensions and verifying the "CC" mobile logo retains the staging style.

**Acceptance Scenarios**:

1. **Given** a small screen device, **When** I open the staging app, **Then** the "CC" logo in the header applies the same red staging styling.
2. **Given** the staging style is active, **When** I interact with the app, **Then** no additional banners or badges obstruct the UI.

---

### Edge Cases

- **What happens when the environment cannot be determined?** The system should default to showing no indicator to avoid false "staging" warnings in production.
- **Subfolder deployments**: The system MUST detect staging if the app is hosted at a `/staging/` path (e.g., GitHub Pages).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST detect the current execution environment via `VITE_APP_ENV`, Vite `MODE`, `window.location.hostname` (containing "staging"), or `window.location.pathname` (containing "/staging").
- **FR-002**: System MUST apply a distinct "Staging Style" to the brand title (`H1`) in the `AppHeader` ONLY when the environment is identified as "staging".
- **FR-003**: The staging style MUST use a high-contrast red background (#dc2626), white border, and a red outer glow to ensure maximum visibility.
- **FR-004**: The styling MUST be applied to both the full "Codex Cryptica" text (desktop) and the "CC" logo (mobile).
- **FR-005**: The indicator MUST be visible on every page/route within the application via the global layout header.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of testers can correctly identify they are in staging within 1 second of page load.
- **SC-002**: The staging indicator is visible on 100% of screen configurations without using additional vertical space.
- **SC-003**: 0% "accidental production changes" reported by the team due to environment confusion.
- **SC-004**: The indicator adds 0ms to the layout shift (CLS) as it's an inline style modification of an existing element.
