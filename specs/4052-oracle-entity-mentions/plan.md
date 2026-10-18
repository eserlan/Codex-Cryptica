# Implementation Plan: Oracle Entity @Mentions

**Branch**: `4052-oracle-entity-mentions` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/4052-oracle-entity-mentions/spec.md`

## Summary

Typing `@` in the Oracle composer opens a touch-friendly entity picker. A pick records a structured mention (`entityId`, `displayName`, `entityType`) beside the draft text. On send, a framework-free resolver checks each mention against the active Vault and the existing visibility filter, and unselected `@name` text gets a conservative unique-match check. The resolved IDs are passed to context retrieval as **pinned** entities, so the model never infers an ID from text. Pinned entities are supplied in full, followed by short summaries of directly linked entities, trimmed to the existing context cap. Mentions are saved on the chat message, rendered as accessible entity links, and survive rename and reload. The mention model, resolver and picker are shared, Oracle-agnostic units, so Cif and VTT Chat can adopt them later.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `search-orchestrator` (`searchService`) and the Explorer's `entity-search-match`; `schema` (`isEntityVisible`, `Entity`); `@codex/ai-engine` (`DefaultContextRetrievalService.retrieveContext`); `@codex/oracle-engine` (`ChatMessage`, `OracleIntent`, `OracleGenerator.retrieveForQuery`); existing `CommandMenu` placement via Floating UI; `categories` store for type icons. New internal package `packages/entity-mention-engine`. No new third-party dependency.
**Storage**: Mentions are an optional `mentions` array on the existing persisted `ChatMessage` (chat history already in IndexedDB through `ChatHistoryService`). No new store, OPFS or vault schema change, so no migration. Old messages without the field stay valid.
**Testing**: Vitest unit tests for the package and the retrieval change; component tests for the picker and message rendering; Playwright for narrow-viewport soft-keyboard layout.
**Target Platform**: Web (desktop and mobile browsers, including Android Chrome)
**Project Type**: Monorepo: new library package plus the `apps/web` UI layer
**Performance Goals**: Suggestions update within 200 ms of a keystroke on a 5,000-entity Vault (SC-002); lookups debounced.
**Constraints**: Local-first; no entity data leaves the device except the existing Oracle request. Context stays under the existing 10,000-character retrieval cap, with pinned entities kept first.
**Scale/Scope**: One composer, one message renderer, one retrieval option. Cif and VTT Chat are out of scope.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status | Notes                                                                                                                                        |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First            | Pass   | Mention model, parser, resolver and ranking go in the new `packages/entity-mention-engine`. The web app holds only the picker UI and wiring. |
| II. TDD                     | Pass   | Every unit gets tests first, covering success and negative paths (hidden, deleted, ambiguous, no match, edited token).                       |
| III. Simplicity             | Pass   | Reuses `searchService`, `isEntityVisible` and the Explorer match helper. No Oracle-only index.                                               |
| V. Privacy                  | Pass   | All resolution is client-side; hidden entities are filtered before any text is built.                                                        |
| VII. User Documentation     | Pass   | Help article planned (see User Help Check).                                                                                                  |
| VIII. DI                    | Pass   | Resolver takes an injected entity lookup and visibility predicate; the picker takes an injected search function.                             |
| IX. Natural Language        | Pass   | Plain user-facing copy for empty, ambiguous and unavailable states.                                                                          |
| X. Quality & Coverage       | Pass   | Package ships with coverage like sibling packages.                                                                                           |
| XIV. Bounded Responsibility | Pass   | See check below.                                                                                                                             |

Re-check after design: still passes; no violations to justify.

### Discovery Intent Check

N/A: no public, indexable discovery page is added or repositioned.

### Bounded Responsibility Check

- `apps/web/src/lib/components/oracle/ChatMessage.svelte` (557 lines): already over 500. New behaviour is limited to swapping the plain text block for a single `MentionText` component; the rendering logic lives in the new component, not in this file.
- `apps/web/src/lib/stores/oracle.svelte.ts` (572 lines): touched only to pass the optional pinned IDs through; no new logic added there (it goes in `chat-manager.svelte.ts` and the package).
- `packages/ai-engine/src/context-retrieval.service.ts` (652 lines): the pinned-entity handling goes in a new sibling module (`pinned-context.ts`) called from `retrieveContext`; only the call site and the option type change in the existing file.
- `apps/web/src/lib/components/oracle/OracleChat.svelte` (406 lines): below the trigger; the picker is a separate component and the draft logic lives in a controller module.
- [x] Each listed file keeps its single responsibility; new behaviour has an extraction target.
- [x] Tests for each new module are written with it.

### User Help Check

- [x] A help article is planned in the Help system: how to mention an entity, what happens with unselected `@name`, and what is never included (hidden entities).
- [x] It states prerequisites and limits (active Vault only; Cif and VTT Chat do not support it yet).
- [x] A `FeatureHint` on the first `@` use is worth considering; decide in tasks.

## Project Structure

### Documentation (this feature)

```text
specs/4052-oracle-entity-mentions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── entity-mention-engine.md
│   └── oracle-pinned-context.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
packages/entity-mention-engine/          # new, framework-free
├── src/
│   ├── types.ts                         # Mention, ResolvedMention, MentionSuggestion
│   ├── trigger.ts                       # detect an active "@query" at the caret
│   ├── suggest.ts                       # rank, alias match, descriptor, disambiguation
│   ├── draft.ts                         # keep mention ranges valid across edits
│   ├── resolve.ts                       # IDs and unselected @name to resolved/ambiguous/unavailable/unmatched
│   ├── serialize.ts                     # safe storage and replay of mentions
│   └── index.ts
└── tests/ (colocated *.test.ts)

packages/ai-engine/src/
├── pinned-context.ts                    # new: full pinned entities + bounded linked summaries
└── context-retrieval.service.ts         # option `pinnedEntityIds` added (call site only)

packages/oracle-engine/src/
├── types.ts                             # ChatMessage.mentions, OracleIntent.mentions
└── oracle-generator.ts                  # pass pinned IDs into retrieveForQuery

packages/schema/src/ai.ts                # retrieveContext options type gains pinnedEntityIds

apps/web/src/lib/
├── components/oracle/
│   ├── EntityMentionPicker.svelte       # list, a11y, touch targets, placement
│   ├── oracle-mention-controller.svelte.ts  # draft + picker state for the composer
│   ├── MentionText.svelte               # renders message text with entity links
│   ├── OracleChat.svelte                # wires picker and controller
│   └── ChatMessage.svelte               # uses MentionText
├── stores/oracle/chat-manager.svelte.ts # resolve on send, attach to message and intent
└── content/help/                        # new article

apps/web/tests/                          # Playwright: mobile layout
```

**Structure Decision**: Library-first. The reusable parts (model, trigger detection, ranking, resolution, serialization) form a new `entity-mention-engine` package with injected lookups, so Cif and VTT Chat can reuse it without touching Oracle. Oracle-specific authority rules (pinned context, caps) stay in `ai-engine` and `oracle-engine`. The picker UI lives in `apps/web` for now. It takes a search function and callbacks as props, so moving it to a shared folder later needs no rewrite.

## Complexity Tracking

No constitution violations to justify.
