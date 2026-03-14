# Feature Specification: AI Service Refactor

**Feature Branch**: `072-ai-service-refactor`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "Reassess and generate spec.md for the 072-ai-service-refactor feature based on the analysis in docs/refactoring/AI_SERVICE_REFACTOR.md."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Context-Aware Oracle Chat (Priority: P1)

Users continue to interact with "The Oracle" to receive context-aware responses based on their vault content, even as the internal service architecture is reorganized for better maintainability.

**Why this priority**: This is the core functionality of the application. Maintaining the integrity of the Oracle's reasoning and context retrieval during a major refactor is the highest priority.

**Independent Test**: Can be fully tested by asking the Oracle specific questions about entities present in the current vault and verifying that it retrieves the correct context and provides a relevant response.

**Acceptance Scenarios**:

1. **Given** a vault with specific entities, **When** a user asks a question related to those entities, **Then** the Oracle MUST retrieve the relevant context and provide an accurate answer.
2. **Given** an ongoing conversation, **When** a user asks a follow-up question, **Then** the Oracle MUST correctly identify it as a follow-up and maintain conversation context.

---

### User Story 2 - Multimodal Image Generation (Priority: P2)

Users can request visual representations of entities or scenes, and the system continues to generate high-quality images that respect the active campaign's art style.

**Why this priority**: Image generation is a key immersive feature. Decoupling its logic from text generation ensures both can evolve independently without breaking.

**Independent Test**: Can be tested by requesting an image generation for a specific entity and verifying that an image is returned that reflects both the entity description and the current art style.

**Acceptance Scenarios**:

1. **Given** an active art style entity, **When** a user requests an image, **Then** the system MUST distill a visual prompt that incorporates the style and generate the image via the external provider.

---

### User Story 3 - Consistent Feature Gating (Priority: P3)

Users who prefer to run the application in "Lite Mode" (without AI features) experience a consistent behavior where all AI-related capabilities are gracefully disabled.

**Why this priority**: Ensuring that privacy and performance settings are strictly honored is critical for user trust and system efficiency.

**Independent Test**: Can be tested by enabling "Lite Mode" in settings and verifying that all Oracle chat and image generation features return clear, user-friendly "disabled" states or messages.

**Acceptance Scenarios**:

1. **Given** Lite Mode is enabled, **When** any AI-powered action is triggered, **Then** the system MUST prevent the execution and inform the user that AI features are disabled.

---

### Edge Cases

- **Token Limit Exhaustion**: How does the newly split `ContextRetrievalService` handle scenarios where retrieved context exceeds the Gemini model's window?
- **API Key Rotation**: How does the `AIClientManager` behave if the API key is changed during an active session?
- **Style Cache Miss**: What happens if the `ContextRetrievalService` fails to find the active art style entity?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST extract all hardcoded prompt templates into dedicated files within a `prompts/` directory to decouple prompt engineering from execution logic.
- **FR-002**: System MUST implement a centralized `AIClientManager` as the single source of truth for the AI SDK client initialization.
- **FR-003**: System MUST decompose the monolithic `ai.ts` service into four specialized domain services: `ContextRetrievalService`, `TextGenerationService`, `ImageGenerationService`, and `AICapabilityGuard`.
- **FR-004**: System MUST centralize `liteMode` enforcement within a shared guard utility to eliminate redundant checks across individual services.
- **FR-005**: System MUST update the `OracleExecutionContext` in the `oracle-engine` to use typed interfaces for the new specialized services, replacing all `any` usages.
- **FR-006**: System MUST ensure 100% functional parity with the existing implementation, verified through the migration of all existing unit tests.

### Key Entities _(include if feature involves data)_

- **AI Service Context**: The collection of specialized services (Retrieval, Text, Image) injected into the Oracle engine.
- **Prompt Template**: Structured definitions of system instructions and task-specific constraints, now managed as independent code assets.
- **Style Cache**: A session-scoped storage for the active art style entity, now explicitly owned by the `ContextRetrievalService`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All existing AI unit tests (formerly in `ai.test.ts`) pass successfully in their new per-service test files.
- **SC-002**: The `ai.ts` file is completely removed and replaced by a clean barrel export in `index.ts`.
- **SC-003**: No implementation-specific prompt strings remain within the service logic files (`.service.ts`).
- **SC-004**: Oracle response times and image generation success rates remain consistent with pre-refactor benchmarks.
