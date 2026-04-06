# Research: Lite Version (No AI Support)

## Decision: SDK Initialization Prevention

**Decision**: Add a `liteMode` check in `AIService` and `OracleStore`.
**Rationale**: Prevents any instantiation of `GoogleGenerativeAI` or network requests when the user has opted for Lite Mode. This satisfies the strict privacy requirement.
**Alternatives considered**:

- Dynamic imports for the AI SDK: Overly complex for the current build setup.
- Null-provider pattern: More robust but potentially overkill for a single toggle.

## Decision: Restricted Oracle Command Handling

**Decision**: Refactor `OracleStore.ask` to separate deterministic command parsing from AI processing.
**Rationale**: Allows reuse of the existing regex-based logic for `/connect` and `/merge` without involving the AI pipeline.
**Alternatives considered**:

- Implementing a full Command Pattern: Too much refactoring for a single feature. The current regex logic is sufficient.

## Decision: UI Entry Point Removal

**Decision**: Use Svelte 5 reactive logic in `uiStore` to conditionally hide components and buttons.
**Rationale**: Provides the fastest UI response and cleanest implementation. Components like the "Draw" button in `EntityDetail` can simply be wrapped in `{#if !uiStore.liteMode}`.
**Alternatives considered**:

- CSS-based hiding: Less secure as elements still exist in DOM and might be interactable via keyboard.

## Decision: Deterministic Command Support

**Decision**: Support `/connect`, `/merge`, `/help`, and `/clear` in Lite Mode.
**Rationale**: These provide essential vault organization functionality that doesn't require an LLM.
**Alternatives considered**:

- Disabling Oracle completely: Too restrictive; users still benefit from the command-line style interface for structured tasks.
