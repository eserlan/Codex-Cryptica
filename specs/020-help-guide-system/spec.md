# Feature Specification: Help and Guide System

**Feature Branch**: `020-help-guide-system`  
**Created**: 2026-01-30  
**Status**: Draft  
**Input**: User description: "a help and guide system that explains the different features of the application to the user"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Initial Onboarding Walkthrough (Priority: P1)

As a new user opening the application for the first time, I want a guided tour of the primary interface (Vault, Graph, and Oracle) so that I understand the core value proposition and how to start my first chronicle.

**Why this priority**: Essential for user retention. The application's unique "local-first" and "Oracle RAG" concepts require immediate explanation to prevent confusion.

**Independent Test**: Can be fully tested by a fresh installation/clear storage, which should trigger an interactive overlay sequence pointing to key UI elements.

**Acceptance Scenarios**:

1. **Given** no existing vault or settings, **When** the application loads, **Then** a "Welcome" modal appears with an option to "Start Tour."
2. **Given** the tour is active, **When** clicking "Next," **Then** the guide highlights the next UI element (e.g., the Vault button) with a brief explanation.
3. **Given** the tour is active, **When** the "Dismiss" or "Skip" button is clicked, **Then** the tour immediately closes and does not re-appear on refresh.

---

### User Story 2 - Contextual Feature Hints (Priority: P2)

As a user interacting with a complex feature (like the Graph Connect Mode or Oracle Image Gen), I want to see small, non-intrusive hints or "how-to" icons so that I can learn advanced functionality without leaving my current context.

**Why this priority**: Helps users discover advanced features (like 'C' to connect nodes) that aren't immediately obvious from the UI alone.

**Independent Test**: Can be tested by navigating to the Graph View and observing the appearance of a "Quick Tip" when specific modes are activated.

**Acceptance Scenarios**:

1. **Given** the Graph View is open, **When** the user activates "Connect Mode," **Then** a small floating hint explains how to select a source and target.
2. **Given** a feature hint is visible, **When** the user completes the action, **Then** the hint fades away automatically.

---

### User Story 3 - Persistent Help Center (Priority: P3)

As an experienced user who forgot a specific shortcut or term, I want to access a searchable help library within the Settings Modal so that I can find answers quickly without external documentation.

**Why this priority**: Provides long-term support and a reference for complex lore-management concepts.

**Independent Test**: Can be tested by opening the Settings Modal, navigating to the "Help" tab, and searching for "Oracle" to find relevant guides.

**Acceptance Scenarios**:

1. **Given** any view, **When** opening the Settings Modal and selecting the "Help" tab, **Then** a searchable interface appears containing indexed articles.

---

### Edge Cases

- **Offline Access**: Since the app is local-first, the entire help system (including images/videos if any) MUST be available offline.
- **Screen Resize**: Help overlays and highlights must re-position correctly if the user resizes their browser or rotates their mobile device during a tour.
- **Version Updates**: If a new major feature is added, the system should be able to trigger a "What's New" guide for existing users.

## Requirements _(mandatory)_



### Functional Requirements



- **FR-001**: System MUST provide a multi-step, static "read and click next" onboarding walkthrough using high-contrast highlight overlays for first-time users.

- **FR-002**: System MUST track "Tour Completion" status in local storage to prevent unwanted repetitions.

- **FR-003**: System MUST include a searchable repository of help articles accessible at any time.

- **FR-004**: Help content MUST be stored locally and work entirely offline (PWA requirement).

- **FR-005**: Walkthrough steps MUST use high-contrast overlays to dim the background and focus on specific UI elements.

- **FR-007**: Help Center MUST be accessible as a dedicated tab within the existing Settings Modal, with potential for future integration into the Lore Oracle for conversational assistance.



### Key Entities



- **GuideStep**: Represents a single point in a walkthrough (target element selector, title, content, sequence index).

- **HelpArticle**: Represents a searchable documentation entry (title, tags, markdown content).

- **UserProgress**: Tracks which guides the user has seen and completed.



## Success Criteria _(mandatory)_



### Measurable Outcomes



- **SC-001**: Users can complete the initial onboarding tour in under 60 seconds.

- **SC-002**: First-time task success rate (creating an entity and linking it) increases by 40% in qualitative manual UX testing sessions compared to unguided users.

- **SC-003**: Help Center search results return relevant topics in under 100ms.

- **SC-004**: Onboarding assets (text/images) add less than 500KB to the total PWA bundle size.
