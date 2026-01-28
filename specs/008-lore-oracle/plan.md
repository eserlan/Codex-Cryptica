# Implementation Plan: Lore Oracle (Cloud Opt-In)

## Overview
Integrate Google Gemini via `@google/generative-ai` to provide a lightweight, accessible AI chat interface. This feature utilizes local-first context retrieval (RAG) to ground the AI's responses in the user's own notes.

## Architecture

### 1. The Brain (`AIService`)
- **Library**: `@google/generative-ai`
- **Model**: `gemini-3-flash-preview` (Configurable, defaults to latest Flash for speed/cost).
- **System Instruction**: Defines the Oracle persona as a wise keeper of records who can "weave new threads" when asked to expand.
- **Authentication**: User-provided API Key stored in IndexedDB (`settings` store).

### 2. State Synchronization (`BroadcastChannel`)
- **Channel**: `codex-oracle-sync`
- **Mechanism**: The `OracleStore` uses a BroadcastChannel to sync `messages`, `isLoading`, and `apiKey` across all open windows.
- **Requests**: New windows broadcast a `REQUEST_STATE` message to populate their local state from existing instances.

### 3. Context Retrieval (`RAG`)
- **Logic**:
    1. Direct Fuzzy Search (FlexSearch).
    2. Keyword Extraction Fallback (if search returns 0).
    3. Active Entity Prioritization (always include selected entity).
    4. Redundancy Filter: Tracks titles already sent in the current conversation turn.
- **Truncation**: Limits individual file context to 10,000 characters to prevent prompt bloat.

### 4. Direct Vault Integration
- Chat messages can contain an `entityId`.
- Buttons allow "One-Click Save" to `content` (Chronicle) or `lore` (Detailed Notes) fields of the linked entity.

## Source Code Structure

- **`src/lib/services/ai.ts`**: Handles Gemini API calls, context retrieval, and stream processing.
- **`src/lib/stores/oracle.svelte.ts`**: Manages reactive chat state and multi-window sync.
- **`src/lib/components/oracle/OracleChat.svelte`**: Core chat UI (Shared).
- **`src/lib/components/oracle/OracleWindow.svelte`**: Docked UI with modal and pop-out support.
- **`src/routes/oracle/+page.svelte`**: Standalone Oracle page.
- **`src/lib/components/settings/AISettings.svelte`**: API Key management.

## Risks & Mitigations
- **API Rate Limits**: Handled via 429 error detection and user notification.
- **Context Redundancy**: Mitigated by tracking sent titles in the convo session.
- **Reactivity Loops**: BroadcastChannel logic includes deep equality checks before updating state.
