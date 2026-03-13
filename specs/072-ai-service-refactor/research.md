# Research & Decisions: AI Service Refactor

## 1. Domain Separation Strategy

- **Decision**: Split the monolithic `ai.ts` into `ContextRetrievalService`, `TextGenerationService`, and `ImageGenerationService`.
- **Rationale**: Currently `ai.ts` is 800+ lines doing RAG, text generation, image generation, and prompt engineering. This violates the Single Responsibility Principle. Splitting these domains allows for independent testing, prevents scope creep within a single file, and clarifies data ownership (e.g. `ContextRetrievalService` owns the `styleCache`).
- **Alternatives considered**: Keep `ai.ts` but extract only prompts. Rejected because the file would still remain a "God File" coordinating too many disparate sub-systems.

## 2. Prompt Engineering Decoupling

- **Decision**: Extract all large prompt template literals into a dedicated `prompts/` directory as builder functions.
- **Rationale**: Hardcoded strings pollute the execution logic and make it difficult to iterate on prompts or version them independently. Exporting builder functions (e.g. `buildSystemPrompt(demoMode: boolean)`) allows for typed arguments and cleaner service logic.
- **Alternatives considered**: Use an external CMS or database for prompts. Rejected as YAGNI (You Aren't Gonna Need It); file-based prompts are sufficient for current needs and easier to version control.

## 3. SDK Client Initialization

- **Decision**: Create an `AIClientManager` to act as a singleton source of truth for the `GoogleGenerativeAI` instance.
- **Rationale**: `ai.ts` currently initializes the client in two different places (`init` and `expandQuery`), leading to potential state inconsistencies when API keys change. A centralized manager ensures all domain services share the same authenticated client.
- **Alternatives considered**: Pass the API key to every generation method and initialize per-call. Rejected due to unnecessary overhead and complexity.

## 4. Lite Mode Enforcement

- **Decision**: Implement an `AICapabilityGuard` utility to centralize `liteMode` checks.
- **Rationale**: `uiStore.liteMode` is checked ~6 times across public methods. Centralizing this check reduces boilerplate and ensures consistent enforcement.
- **Alternatives considered**: Check `liteMode` at the component layer before calling the AI services. Rejected because the services should protect themselves from unauthorized execution, maintaining strong boundaries.
