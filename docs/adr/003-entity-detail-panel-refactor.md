# Refactoring and Modularization of EntityDetailPanel

* Status: accepted
* Deciders: Espen, Gemini CLI
* Date: 2026-02-12

## Context and Problem Statement

The `EntityDetailPanel.svelte` component has become a "God Component," accumulating too many responsibilities in a single 500+ line file. It currently manages:
1.  **View/Edit State**: Complex logic for toggling between read and write modes.
2.  **Image Processing**: Lightbox logic, Drag-and-Drop archival, and URL resolution.
3.  **Content Editing**: Integration with multiple Markdown and Temporal editors.
4.  **Relationship Management**: Complex derived lookups for inbound and outbound connections.
5.  **UI Layout**: Managing tabs (Status, Lore, Inventory) and redacted states (Fog of War).

This complexity makes the component difficult to modify without side effects, hinders reusability, and slows down developer onboarding.

## Decision Outcome

Chosen option: **Component-Based Decomposition**, because it isolates domain logic into specialized sub-components, making the code more maintainable, testable, and aligned with Svelte 5's modular philosophy.

### Key Changes
*   **Logical Extraction**: Split the panel into atomic sub-components within `src/lib/components/entity-detail/`.
    *   `DetailHeader`: Title, Zen Mode, and Redaction UI.
    *   `DetailImage`: Image rendering, Lightbox, and Drag-and-Drop archival.
    *   `DetailTabs`: Tab navigation state.
    *   `DetailStatusTab`: Temporal metadata and Connections/Gossip.
    *   `DetailLoreTab`: Primary lore/notes editing.
    *   `DetailFooter`: Persistence actions (Save/Delete/Cancel).
*   **Prop-Driven State**: Pass reactive `$state` and callback handlers from the parent `EntityDetailPanel` to maintain a single source of truth while keeping sub-components focused on rendering.

## Pros and Cons of the Options

### Component-Based Decomposition

*   **Good**, because it follows the Single Responsibility Principle.
*   **Good**, because it allows for independent testing of complex sections like the Image Lightbox or Connection list.
*   **Good**, because sub-components (like `DetailHeader` or `DetailImage`) can be reused in other views (e.g., Zen Mode).
*   **Bad**, because it introduces more files and requires careful prop drilling or context usage for shared state.
*   **Bad**, because cross-component communication (e.g., footer triggering a save of data held in a tab) requires clear handler interfaces.
