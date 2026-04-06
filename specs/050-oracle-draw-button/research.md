# Research: Advanced Oracle Draw Button

## Decision: Component-Level Integration

**Rationale**:
The "Draw" button serves different purposes in different contexts. In the chat, it's a shortcut for a manual `/draw` command. In the sidepanel and Zen mode, it's a content-creation tool that updates the entity itself. Placing the logic directly in the relevant components (`ChatMessage`, `DetailImage`, `ZenModeModal`) allows for context-specific UI feedback (like local loading states).

## Decision: OracleStore Trigger Method

**Rationale**:
To avoid duplicating the image generation flow (context retrieval -> distillation -> generation -> saving), a new method `drawEntity(entityId: string)` will be added to `OracleStore`. This method will handle the lifecycle of the request, including vault updates for Sidepanel/Zen mode triggers.

## Decision: UI Feedback & Jargon

**Rationale**:
To maintain consistency with the existing jargon system, the "Draw" button label will be theme-aware (falling back to "Visualize" or "Sketch" if needed, though "Draw" is the primary command). A status message will indicate when a "Global Art Style" is being applied, leveraging the existing `AIService` style caching.

## Alternatives Considered

- **Dedicated Draw Wizard**: Rejected. A single button is more intuitive for simple "draw this" actions.
- **Global Generation Queue**: Rejected. Current usage doesn't justify the complexity of a queue; sequential handling is sufficient for now.

## Integration Patterns

- **Svelte 5 Runes**: Use `$derived` for button visibility based on `oracle.tier`.
- **Vault Store Update**: Images generated for existing entities will use `vault.updateEntity` to persist the new `image` and `thumbnail` fields.
