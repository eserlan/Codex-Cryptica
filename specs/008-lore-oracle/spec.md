# Feature Specification: Lore Oracle (Cloud AI Assistant)

## Background
Users desire a natural language interface to query their vault ("Who is the king?"). Running local LLMs proves too resource-intensive for mobile/tablet devices. Therefore, we will implement an **Opt-In Cloud Oracle** powered by Google Gemini.

## Objectives
1.  **Accessibility**: Ensure the feature works on any device (phone, tablet, laptop) without heavy hardware requirements.
2.  **RAG (Retrieval-Augmented Generation)**: Use the local `FlexSearch` index to retrieve relevant notes and send them as context to the Gemini API.
3.  **Opt-In Privacy**: The feature must be disabled by default. Users must explicitly provide their own API Key to enable it, understanding that snippets of their data will be sent to Google for inference.
4.  **Actionable Lore**: Allow users to directly save Oracle responses back into their vault entities (Chronicle or Lore fields).
5.  **Multitasking**: Support a standalone window mode for the Oracle so users can chat while navigating the graph or editing notes.

## Functional Requirements

### FR-001: Privacy-First Activation
- System MUST NOT initialize or make any network requests to Google unless a valid Gemini API Key is provided by the user.
- System MUST store the API key locally in IndexedDB and never transmit it to any non-Google server.

### FR-002: Context-Aware Retrieval (RAG)
- System MUST retrieve up to 5 relevant vault entries based on the user's query.
- System MUST prioritize the currently selected entity in the context.
- System MUST fallback to keyword extraction if direct fuzzy search returns no results.
- System MUST track sent context within a session to avoid sending redundant data in subsequent turns.

### FR-003: Integrated Chat UI
- System MUST provide a docked chat window in the main application.
- System MUST provide a "Pop Out" button to open the Oracle in a separate standalone window.
- System MUST synchronize chat history and state across all open windows/tabs using `BroadcastChannel`.

### FR-004: Direct Injection
- Assistant messages MUST provide "COPY TO CHRONICLE" and "COPY TO LORE" buttons when a target entity is identified.
- These actions MUST automatically update the target entity and navigate the user to the appropriate tab in the Detail Panel.

## Constraints
-   **Network**: Requires active internet connection.
-   **Secrets**: API Keys must be stored locally (IndexedDB).
-   **Cost**: Rely on Google Gemini's free/pay-as-you-go tier via user's own key.

## Success Criteria
- **SC-001**: 100% of Oracle responses are grounded in the user's provided vault context (when available).
- **SC-002**: Chat history stays perfectly in sync when multiple browser windows are open.
- **SC-003**: Users can successfully save a generated summary to an entity in under 3 clicks.
