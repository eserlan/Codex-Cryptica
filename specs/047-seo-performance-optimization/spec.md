# Feature Specification: SEO & Performance Optimization

**Feature Branch**: `047-seo-performance-optimization`
**Created**: 2026-02-18
**Status**: Implemented
**Input**: Retroactive specification based on implemented commits (feat/seo).

## User Scenarios & Testing

### User Story 1 - Automated SEO Auditing (Priority: P1)

As a developer, I want to automatically audit the application's SEO and performance scores so that I can prevent regressions before deployment.

**Why this priority**: Ensures the application remains discoverable and performant as features are added.

**Independent Test**: Run `npm run audit` and verify it generates a report.

**Acceptance Scenarios**:

1. **Given** a local development build, **When** I run `npm run audit`, **Then** Unlighthouse should scan the site and output a report to `./audit-report`.
2. **Given** a CI environment, **When** I run `npm run build:audit`, **Then** the process should fail if scores drop below the defined budget (SEO < 90, Performance < 80).

---

### User Story 2 - Marketing Landing Page (Priority: P2)

As a potential user, I want to see a landing page that explains the application's features so that I understand its value before entering the workspace.

**Why this priority**: Improves user acquisition and provides a crawlable surface for search engines.

**Independent Test**: Visit the root URL `/` in a fresh browser session.

**Acceptance Scenarios**:

1. **Given** a new user (no localStorage preferences), **When** they visit `/`, **Then** they should see the Marketing Landing Page with a single primary "Enter Workspace" call-to-action.
2. **Given** a returning user who has set "Skip Welcome Screen", **When** they visit `/`, **Then** they should bypass the landing page (or see the workspace immediately).

---

### User Story 3 - Feature Indexing (Priority: P3)

As a search engine bot, I want to access a static list of features so that I can index the application's capabilities.

**Why this priority**: Single Page Applications (SPAs) often hide content behind interactions; a dedicated features route ensures visibility.

**Independent Test**: Navigate to `/features`.

**Acceptance Scenarios**:

1. **Given** any user or bot, **When** they request `/features`, **Then** they should receive a server-side renderable (or statically analysable) list of key features.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST include `unlighthouse` configuration with strict budgets for SEO and Accessibility.
- **FR-002**: System MUST provide a `skipWelcomeScreen` preference in `uiStore`, persisted to `localStorage` key `codex_skip_landing`.
- **FR-003**: The root route `/` MUST display the marketing content by default unless `skipWelcomeScreen` is true.
- **FR-004**: System MUST include a `/features` route listing core capabilities.
- **FR-005**: Global layout MUST include standard Open Graph and Twitter Card metadata.
- **FR-006**: PDF parsing worker MUST be served from the local origin to prevent cross-origin security issues during audits.

### Key Entities

- **UIStore**: Manages `skipWelcomeScreen` and `dismissedLandingPage` state.
- **UnlighthouseConfig**: Defines the audit thresholds and scanning scope.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Unlighthouse SEO score > 90.
- **SC-002**: Unlighthouse Accessibility score > 90.
- **SC-003**: "Time to Interactive" on landing page < 1.5s and "Largest Contentful Paint" < 1.2s.
- **SC-004**: Zero "crawling errors" reported by the audit tool for the main routes.
