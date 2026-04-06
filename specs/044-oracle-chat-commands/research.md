# Research: Oracle Chat Commands

## Decision 1: Slash Command Menu

- **Decision**: Add a floating `CommandMenu.svelte` component that monitors the chat textarea input.
- **Rationale**:
  - Decouples command discovery from the main chat logic.
  - Provides a modern "slash command" UX familiar to users of Slack/Discord.
  - Allows for keyboard-centric filtering and selection.
- **Alternatives Considered**:
  - Hardcoding a dropdown in the input field: Too rigid, harder to style consistently with floating UI.
  - Pure AI detection: Doesn't solve the "discovery" problem of what commands exist.

## Decision 2: Interactive "/connect oracle" Flow

- **Decision**: Implement the `/connect oracle` command as a sequence of "Interactive" messages in the chat.
- **Rationale**:
  - Keeps the user within the conversational flow.
  - Allows for a stateful "Wizard" experience (Step 1: Select From, Step 2: Select To, Step 3: Review Proposal).
  - Can leverage Svelte 5 runes for local state management within the interactive component.
- **Alternatives Considered**:
  - Modal-based connection: Displaces user context and feels less "oracle-like".

## Decision 3: Entity Autocomplete

- **Decision**: Reuse the existing `searchStore` and `SearchEngine` for client-side autocomplete.
- **Rationale**:
  - Avoids re-implementing indexing logic.
  - `FlexSearch` (used in `SearchEngine`) is already configured for "forward" tokenization, which is ideal for autocomplete.
  - Provides consistent results with the global search.

## Decision 4: AI Connection Proposals & Natural Language Parsing

- **Decision**: Extend `aiService` with:
  1. `proposeConnection`: Compares two entities and suggests a type.
  2. `parseConnectionIntent`: Parses a raw string (e.g., "/connect A is B's boss") into structured components.
- **Rationale**:
  - `parseConnectionIntent` allows for a "Power User" shortcut.
  - `proposeConnection` handles the discovery of relationships when the user knows _who_ but not _how_.
- **Alternatives Considered**:
  - Regex parsing for `/connect`: Too brittle for natural language like "A is the leader of B". AI is better at identifying entity names even with typos.

## Unresolved Unknowns (Resolved during Design)

- **Menu Positioning**: Will use a floating popover library or manual calculation based on caret position.
- **Command Registration**: Commands will be defined in a static configuration file and injected into both the menu and the `OracleStore`.
