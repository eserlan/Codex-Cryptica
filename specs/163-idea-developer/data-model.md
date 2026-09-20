# Data Model: Idea Developer (POC)

Nothing here is stored on a server. Every entity is transient or lives in the browser tab.

## Idea

The user's freeform text.

| Field  | Rule                                                                                                                                                                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text` | Trimmed; required (empty or whitespace-only is rejected, edge case 1). Maximum length is a named constant (4,000 characters, matching the bound used by existing hand-offs; also applies to each later turn's text); exceeding it is reported, never silently cut (FR-024). |

Lifetime: the tab-only restore copy (FR-030) and, for the life of the conversation, the provider. Never logged by Codex Cryptica, never in funnel events.

## Mode

| Field                  | Rule                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`                   | `"assess"` or `"develop"` at launch. A string union in `modes.ts`; adding a mode is one table entry (FR-012). |
| `label`, `description` | Plain-language UI text.                                                                                       |
| `emphasis`             | Instruction fragment for the prompt; also lists which sections the mode stresses.                             |

Every mode returns the same section structure.

## Conversation

One idea and its turns.

| Field                   | Rule                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ideaText`              | The opening idea; shown read-only beside every result. Changes go through a `change-part` turn (FR-034 and the edge case). |
| `turns`                 | Ordered `Turn` list, at most the turn cap (proposed 8).                                                                    |
| `previousInteractionId` | The provider's reference for continuing; string or null. Never placed in a link, event or log.                             |
| `latest`                | The latest validated `Development`, or absent.                                                                             |
| `hubDraftId`            | The Session Hub entity for this conversation.                                                                              |

## Turn

| Field    | Rule                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`   | `idea`, `answer-questions`, `change-part`, or `switch-mode`.                                                                                                        |
| `mode`   | `Mode.id` in force for this turn.                                                                                                                                   |
| `text`   | The user's input for the turn (the idea, the answers, or the requested change; empty allowed only for `switch-mode`). Subject to the same length bound as the idea. |
| `status` | `pending`, `done`, `failed`, or `cancelled`. Only `done` turns count toward the turn cap.                                                                           |

## Development

The validated result for one turn. Same shape for every mode and turn.

| Field                  | Rule                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `mode`                 | A `Mode.id`.                                                                                                |
| `whatChanged`          | One line; required after the first turn, absent on the first.                                               |
| `alreadyInteresting`   | Non-empty text. Names the useful tension already present.                                                   |
| `centralQuestion`      | Non-empty single question.                                                                                  |
| `makeItMove`           | Non-empty text. One immediate change or pressure.                                                           |
| `peopleWhoCare`        | 2 to 4 entries `{ name, role, wants, conflictsWith }`; interests must conflict (`conflictsWith` non-empty). |
| `playerDirections`     | 2 or more distinct entries `{ title, description }`. None presented as the single correct plot.             |
| `consequences`         | Non-empty text. What progresses if nobody intervenes.                                                       |
| `creatorQuestions`     | 2 to 4 non-empty questions. Questions the user has already answered should not be repeated.                 |
| `generatorSuggestions` | 2 to 5 `GeneratorSuggestion` entries after filtering (see below).                                           |

Forbidden: any numeric score, grade or rating field or wording (FR-009). The parser rejects it.

The original idea is not part of the model's output. The UI keeps it beside the result from the conversation (FR-004, FR-034), so preservation cannot be lost to a model error.

## GeneratorSuggestion

| Field          | Rule                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| `generatorKey` | Must be a key in the fixed catalogue (FR-013). Unknown keys are dropped. |
| `reason`       | Short text, one sentence.                                                |

The catalogue entry supplies the display label and the route (`/generators/<slug>`); the model never supplies a URL. If fewer than 2 valid suggestions remain, a default set from the catalogue tops it up (FR-015).

## GeneratorCatalogueEntry (static)

`{ key, slug, label, description }` for the suggestable generators. Verified in T041: `settlement`, `npc`, `faction`, `rumour`, `secret-society`, `quest`. `adventure-generator` is excluded because it does not read hub context. Only generators verified to read Session Hub context are included (research R6). Slugs must exist in `GENERATOR_SLUGS`; a test enforces this (SC-014).

## SessionHubDraft

The Development as one Session Hub entity. See [contracts/session-hub-draft.md](./contracts/session-hub-draft.md). Browser-local (`sessionStorage`).

## RestoredSession

The tool's own tab-only restore record; it is the persisted form of `Conversation`.

| Field          | Rule                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| `version`      | `1`.                                                                                      |
| `conversation` | The `Conversation` above (idea, turns, interaction id, latest development, hub draft id). |

Stored under its own `sessionStorage` key. Cleared on tab close (by the browser), by the user's clear or new-conversation action, and when its hub draft is removed.

## UsageWindow

Content-free limiter state in `localStorage`.

| Field        | Rule                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `version`    | `1`.                                                                                                                     |
| `timestamps` | Epoch-millisecond timestamps of recent turns (every turn counts), pruned to the rolling period. No text, no identifiers. |

Defaults: 10-second cooldown, 20 turns per hour (raised from 10 now that a conversation spans several turns; tunable). If storage is unavailable the limiter allows the request and the edge limits apply.

## FunnelEvent

Content-free record sent through `trackEvent`. See [contracts/analytics-events.md](./contracts/analytics-events.md).

## State transitions (tool)

`empty → editing → submitting → active | failed`
`active → editing` (compose the next turn), `active → submitting` (turn sent), `active → capped` (turn cap reached)
`failed → editing` (input kept), `capped → empty` (new conversation)
`any → empty` on clear or new conversation.

`submitting` is entered only if the usage limiter and bot check pass; otherwise the state is `failed` with a reason and a "try again at" time where relevant. An expired provider conversation moves `submitting → submitting` through the replay path without surfacing an error.
