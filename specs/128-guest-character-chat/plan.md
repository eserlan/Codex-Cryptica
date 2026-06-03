# Implementation Plan: Guest Character Chat for Invited World Participants

**Branch**: `128-guest-character-chat` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/128-guest-character-chat/spec.md`

## Summary

Implement host controls to expose selected Character entities to invited guests for in-character conversation. Core functionality includes:

1. Declarative guest chat configuration nested in the entity frontmatter/schema.
2. In-character generative chat execution within `@codex/oracle-engine`, enforcing public vs. hybrid visibility boundaries.
3. Local guest-side IndexedDB conversation persistence.
4. P2P transcript sync from guest to host for GM review.
5. Svelte 5 player-facing chat UI using Tailwind 4 theme tokens.
6. **Host-routed chat execution**: chat runs on the host's machine (full lore access) via `GUEST_CHAR_CHAT_REQUEST` / `CHUNK` / `DONE` P2P messages. Local execution is the fallback when no P2P connection is active.
7. **Automatic trust resolution**: guest character identity inferred from login username; trust level (trusted / neutral / untrusted) derived from vault relationship graph and applied to prompt context.
8. **Guest edit permissions**: guests can edit their own character entity and any entity tagged with their name, including the Lore tab.
9. **Knowledge & Expertise templates**: all character templates include a `## Knowledge & Expertise` section; the chat executor uses it to enforce knowledge boundaries.
10. **Dialogue-only output**: system prompt places an explicit `OUTPUT FORMAT — STRICT` constraint before the role-play persona to prevent action text and narrator prose.

## Technical Context

**Language/Version**: TypeScript 6.0.3 + Svelte 5 Runes  
**Primary Dependencies**: `@google/generative-ai` (Gemini SDK), SvelteKit, Tailwind 4, Zod  
**Storage**: OPFS (Host vault file storage) and IndexedDB (Guest client-side chat persistence)  
**Testing**: Vitest (`bun run test`)  
**Target Platform**: Browser (Chrome/Firefox/Safari)  
**Project Type**: Workspace expansion (shared library + web app UI layer)  
**Performance Goals**: UI load time < 1s, AI response streaming starts in < 2s  
**Constraints**: Offline-capable UI, absolute secret-leaking prevention (adversarial prompts mitigation)  
**Scale/Scope**: Party-scale deployment (GMs and up to 10 guests)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Core logic (schemas, prompt construction, executors) is placed in `packages/schema` and `packages/oracle-engine`. `apps/web` serves only as a visual/UI shell. (Pass)
2. **TDD**: Unit tests will cover schema parsing, prompts validation, and sync protocols. (Pass)
3. **Simplicity/YAGNI**: No dialogue trees or complex state machines; uses direct RAG chat. (Pass)
4. **Privacy**: Client-side storage (IndexedDB) for local guest transcripts. (Pass)
5. **Dependency Injection**: Any new stores (e.g. `guestChatStore`) will implement constructor-based DI. (Pass)
6. **Terminology**: Uses "Labels" instead of "Tags". (Pass)

## Project Structure

### Documentation (this feature)

```text
specs/128-guest-character-chat/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
    └── p2p-messages.ts  # P2P sync contract
```

### Source Code (repository root)

```text
packages/schema/src/
├── entity.ts            # Extend EntitySchema with guestChatConfig

packages/oracle-engine/src/
├── executors/
│   └── guest-chat-executor.ts   # New executor for guest chat prompts
└── prompt-builders.ts           # Character prompt builders

apps/web/src/
├── lib/
│   ├── components/
│   │   └── guest/
│   │       ├── GuestChatPanel.svelte    # Main player chat view
│   │       └── GuestChatBubble.svelte   # Chat bubble UI
│   └── stores/
│       └── guest-chat.svelte.ts       # DI Guest chat store
```

**Structure Decision**: Monorepo split. Add config types to `packages/schema` and prompt/AI routing to `packages/oracle-engine` to maintain the library-first core principle. Build the frontend elements inside `apps/web` utilizing Svelte 5 and Tailwind 4 design systems.

## Complexity Tracking

_No constitution violations._
