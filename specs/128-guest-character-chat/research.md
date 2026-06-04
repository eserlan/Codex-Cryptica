# Research & Architecture: Guest Character Chat

This document details the architectural decisions, rationale, and alternatives considered for implementing the Guest Character Chat feature.

## 1. Schema & Frontmatter Configuration

- **Decision**: Add an optional `guestChatConfig` object to `EntitySchema` in `packages/schema/src/entity.ts`.
- **Rationale**: Keeps configuration declarative, localized to the specific character, and automatically serializable to/from markdown frontmatter.
- **Alternatives Considered**:
  - _Separate database_: Storing guest chat configurations in a separate IndexedDB table. Rejected because it decouples configuration from the entity files, making manual file manipulation, migrations, and P2P transfers harder to coordinate.
  - _Global config file_: Rejected because it introduces a monolithic file that would be a hotspot for sync conflicts in multi-user/P2P environments.

## 2. In-Character Generation in `@codex/oracle-engine`

- **Decision**: Create a `GuestChatExecutor` in `packages/oracle-engine/src/executors/guest-chat-executor.ts` that implements character-restricted, prompt-injection-safe system prompt construction.
- **Rationale**: Placing this in `@codex/oracle-engine` adheres to Principle I (Library-First). Implementing it as a distinct command-pattern executor ensures it is testable, decoupled, and reusable.
- **Prompt Constraints**:
  - Instruct the model to play the character defined by the target entity.
  - For "Public Lore Only" mode: only feed public description/fields in context.
  - For "Public + Private" hybrid mode: supply private notes under a separate prompt header marked `[HIDDEN REASONING]` with strict instructions to _never_ repeat or directly quote the hidden details, but rather use them to guide in-character actions/hints.
- **Alternatives Considered**:
  - _Client-side Svelte-store prompt construction_: Rejected because it leaks prompt templates and system directives to the web front-end logic, which violates the architectural separation of concerns.

## 3. P2P Sync & Guest Transcript Persistence

- **Decision**:
  - Guests persist chat history locally in IndexedDB (using a new IndexedDB store `guest_chat_transcripts` or local storage) to survive reloads.
  - Guests push transcripts to the Host using a new P2P protocol message type: `GUEST_CHAT_TRANSCRIPT_SYNC`.
  - Hosts receive this message and write the transcript files into the vault storage (e.g. `vault-root/.codex/transcripts/{guestId}_{characterId}.json`) to allow GM review.
- **Rationale**: Guests do not have direct file write permissions. Syncing via P2P ensures the host receives and registers the conversations in their own local database/file-system securely.
- **Alternatives Considered**:
  - _Ephemeral guest chats (no host review)_: Rejected because the product requirements explicitly demand that hosts can review guest conversations.

## 4. UI Layer Integration

- **Decision**: Create a dedicated `GuestChatPanel` component in Svelte 5 and Svelte runes in `apps/web/src/lib/components/guest/GuestChatPanel.svelte`, exposing the curated list of enabled characters and the conversation bubble interface.
- **Rationale**: Keeps the player-facing experience separated from the GM-facing Oracle chat sidebar, using custom Tailwind 4 styled components.
