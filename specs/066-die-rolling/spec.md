# Feature Specification: Die Rolling Support

**Feature Branch**: `066-die-rolling`  
**Created**: 2026-03-10  
**Status**: Draft  
**Input**: User description: "die rolling https://github.com/eserlan/Codex-Cryptica/issues/388"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Quick Standard Roll (Priority: P1)

As a Game Master or Player, I want to quickly roll a standard polyhedral die (d4, d6, d8, d10, d12, d20, d100) so that I can resolve simple actions without leaving the application.

**Why this priority**: Core functionality required for any tabletop RPG tool. It provides immediate value for basic gameplay.

**Independent Test**: Can be fully tested by triggering a roll for a single d20 and verifying a random result between 1 and 20 is displayed.

**Acceptance Scenarios**:

1. **Given** the application is open, **When** I trigger a d20 roll, **Then** I see a result between 1 and 20.
2. **Given** a die roll result is displayed, **When** I roll again, **Then** the new result is shown.

---

### User Story 2 - Complex Roll with Modifiers & Advanced Logic (Priority: P2)

As a user, I want to roll multiple dice with modifiers and advanced logic (e.g., "2d20kh1 + 5" or "4d6!") so that I can support various RPG systems like D&D 5E or Savage Worlds.

**Why this priority**: Advanced logic like "Keep Highest" (Advantage) or "Exploding" dice are standard in modern RPG systems.

**Independent Test**: Can be tested by entering "2d1kh1 + 5" and verifying the result is 6, or "1d1!" (which would explode infinitely if not capped, proving the logic).

**Acceptance Scenarios**:

1. **Given** a roll input, **When** I enter "2d20kh1 + 4", **Then** the system rolls two d20s, keeps the higher value, and adds 4.
2. **Given** an exploding die (e.g., 1d6!), **When** the result is the maximum value (6), **Then** an additional d6 is rolled and added to the total.

---

### User Story 3 - Roll History & Contextual Display (Priority: P3)

As a user, I want my roll results to appear in the context where I initiated them (Chat or Modal) and be preserved in a history log.

**Why this priority**: Keeps the workflow focused. Chat-based rolls stay in the conversation, while dedicated UI rolls stay in their own log.

**Independent Test**: Can be tested by using `/roll` in chat and verifying it appears in chat, then using the Modal and verifying it appears in the Modal's log.

**Acceptance Scenarios**:

1. **Given** I use a `/roll` command in the Oracle chat, **When** the result is generated, **Then** it appears as a message in the chat history.
2. **Given** I use the dedicated Die Roller, **When** I trigger a roll, **Then** the result appears in the Modal's internal roll log and NOT the main chat.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support standard polyhedral dice: d4, d6, d8, d10, d12, p10 (percentile), d20, d100.
- **FR-002**: System MUST allow rolling multiple dice of the same type (e.g., 3d6).
- **FR-003**: System MUST support basic arithmetic modifiers (+ and -) appended to die rolls.
- **FR-004**: System MUST support both chat commands (e.g., `/roll 1d20`) and dedicated UI buttons in a modal for triggering rolls.
- **FR-005**: Roll results MUST be displayed in the initiation context: chat-triggered results appear in Oracle chat; modal-triggered results appear in a log within the modal.
- **FR-006**: System MUST support advanced dice logic: "Keep Highest/Lowest" (`kh[N]`/`kl[N]`, where N is the number of dice to keep) and "Exploding" dice (`!`).
- **FR-007**: System MUST provide a random distribution that feels fair to users (using `crypto.getRandomValues` or similar). Fairness MUST be verified by a statistical distribution test in the unit suite.
- **FR-008**: System MUST display individual die results for multi-die rolls to ensure transparency.

### Key Entities

- **Roll Command**: Represents the request (e.g., "2d20kh1 + 5"), containing dice count, sides, modifiers, and logic flags.
- **Roll Result**: The outcome of a command, including the total value, individual die values, and metadata about used logic (e.g., which dice were dropped).
- **Roll Log**: A collection of Roll Results, separated by context (Chat History vs. Modal Log).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can trigger a roll and see the result in under 300ms.
- **SC-002**: 100% of standard and advanced dice formulas (AdXkhY, AdX!) are parsed correctly.
- **SC-003**: Individual die results are visible for every roll involving more than one die.
- **SC-004**: Results initiated in the Modal do not clutter the Oracle chat history.
