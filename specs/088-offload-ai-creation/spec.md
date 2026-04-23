# Feature Specification: Offload AI Entity and Connection Creation

**Feature Branch**: `issue/688-offload-ai-creation`  
**Created**: 2026-04-23  
**Status**: Implemented  
**Input**: User description: "offload ai entity (and connection) creation to a background worker"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Smooth Oracle Interaction (Priority: P1)

As a user, I want the UI to remain perfectly responsive while the Oracle is generating text and discovering entities, so that I can continue browsing the vault or graph without stuttering.

**Why this priority**: Essential for UX quality. High-latency AI calls and complex parsing should never block the main thread.

**Independent Test**: Can be tested by initiating an Oracle chat and interacting with the UI (e.g., panning the graph or opening other entities) while the response is streaming.

**Acceptance Scenarios**:

1. **Given** a connected vault, **When** I send a complex query to the Oracle, **Then** the UI remains responsive (60fps) during text generation.
2. **Given** an active Oracle stream, **When** the Oracle identifies multiple entities, **Then** the graph and sidebar do not freeze during the discovery/reconciliation phase.

---

### User Story 2 - Real-Time Discovery Feedback (Priority: P2)

As a user, I want to see "Discovery Chips" appear in real-time as the Oracle identifies entities in its response, rather than waiting for the entire response to finish.

**Why this priority**: Improves perceived performance and provides immediate feedback on what the Oracle is "thinking" about.

**Independent Test**: Can be tested by watching the Oracle chat interface during a long response; chips should pop up incrementally.

**Acceptance Scenarios**:

1. **Given** a streaming Oracle response, **When** a new entity name is mentioned and identified, **Then** a Discovery Chip appears immediately in the chat message.

---

### Edge Cases

- **Worker Initialization Failure**: If the Web Worker fails to load (e.g., in a restricted environment), the system must fallback to main-thread execution to ensure the Oracle remains functional.
- **Rapid Vault Switching**: If a user switches vaults while a background AI task is running, the task must be ignored or terminated to prevent data contamination.
- **Offline Mode**: If the browser goes offline during a background task, the worker must emit an appropriate error event that the UI can catch.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST execute Gemini AI text generation calls in a background Web Worker.
- **FR-002**: System MUST execute heuristic entity discovery (DraftingEngine) in a background Web Worker.
- **FR-003**: System MUST support incremental (real-time) entity discovery during streaming.
- **FR-004**: System MUST provide a communication bridge (Comlink) between the main thread and the worker.
- **FR-005**: System MUST fallback to main-thread execution if the worker is not ready or during SSR.
- **FR-006**: System MUST ensure entity discovery is idempotent to avoid duplicate proposals from real-time events and final batch results.
- **FR-007**: System MUST include entities with `status: 'draft'` in Oracle context retrieval to maintain conversational continuity.
- **FR-008**: System MUST allow users to find `draft` entities in the global search UI.

### Key Entities

- **OracleWorker**: The background thread managing AI and logic.
- **OracleBridge**: The main-thread proxy for worker communication.
- **DiscoveryProposal**: The metadata representing a potential entity identified by the Oracle.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Main thread remains at 60fps during Oracle text generation.
- **SC-002**: "Time to first Discovery Chip" is reduced by 50% or more compared to batch-based discovery.
- **SC-003**: 100% of AI-related logic for the Oracle (excluding context retrieval) is offloaded to the worker.
