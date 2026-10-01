# Contract: `POST /api/help/ask`

Served by `apps/workers/oracle-proxy` (new `help.ts`). Same origin allow-list (CORS), capability-token session guard (`enforceLlmSession`) and existing LLM rate limiters as other LLM routes; no new bindings, secrets or variables (FR-030a).

## Request

Headers: `Content-Type: application/json`, `Authorization: Bearer <capability token>` (from the existing `ensureSessionManager`).

```json
{
  "question": "How do I connect the faction I just created?",
  "history": [
    { "role": "user", "text": "How do I create a faction?" },
    {
      "role": "assistant",
      "text": "Use Generate related or create one from the entity list."
    }
  ],
  "context": {
    "v": 1,
    "routeTemplate": "/(app)/vault",
    "area": "entity-detail",
    "entityKind": "location",
    "tab": "connections",
    "mode": "view",
    "surface": "vault",
    "flags": ["connections-editable"],
    "availableActions": ["status-tab", "connections-tab"]
  }
}
```

Validation (reject with 400, no model call):

- `question`: 1–500 chars after trim; empty → `EMPTY_QUESTION`; over limit → `QUESTION_TOO_LONG`.
- `history`: ≤ 4 items, roles `user|assistant`, ≤ 600 tokens (approx.); otherwise trimmed server-side from the oldest, never rejected.
- `context`: must pass `HelpContextV1` strict schema. Unknown keys or non-template route segments → `INVALID_CONTEXT`. (The client strips these before sending; the Worker does not trust it.)
- Body ≤ 8 KB.

## Response 200

```json
{
  "outcome": "answered",
  "answer": "Connections here is a read-only picture. To add one, open the Status tab and use Add under Connections, then choose the faction.",
  "sources": [
    {
      "id": "connections-tab#2",
      "title": "Connections Tab",
      "helpId": "connections-tab"
    },
    { "id": "registry:entity-connections#0", "title": "Entity Connections" }
  ],
  "action": {
    "type": "openPanel",
    "panel": "status-tab",
    "label": "Open the Status tab",
    "then": {
      "type": "highlight",
      "target": "add-connection-button",
      "label": "Add connection"
    }
  },
  "suggestions": []
}
```

`outcome` values:

| `outcome`      | Meaning                                    | `sources`                  | `action`                                        |
| -------------- | ------------------------------------------ | -------------------------- | ----------------------------------------------- |
| `answered`     | Grounded answer                            | ≥ 1, all from supplied set | optional                                        |
| `no-match`     | Below relevance floor or no valid citation | `[]`                       | `null`; `suggestions` holds closest help topics |
| `out-of-scope` | Not about using Codex Cryptica             | `[]`                       | `null`                                          |

## Errors

| Status  | Code                                                                                                        | When                                         | Client behaviour                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| 400     | `EMPTY_QUESTION`, `QUESTION_TOO_LONG`, `INVALID_CONTEXT`, `BAD_REQUEST`                                     | Validation                                   | Inline message; no fallback needed                                  |
| 401     | `SESSION_TOKEN_MISSING`, `SESSION_TOKEN_INVALID`, `SESSION_TOKEN_EXPIRED` (from the existing session guard) | Missing, invalid or expired capability token | Refresh token once, else fallback                                   |
| 403     | `FORBIDDEN` (existing guard)                                                                                | Origin not allowed                           | Fallback state                                                      |
| 429     | `RATE_LIMITED`                                                                                              | Burst or per-minute limiter                  | Plain message "Too many questions, try again shortly" + static help |
| 502/504 | `UPSTREAM_ERROR`                                                                                            | Provider failure after registry fallback     | Fallback state                                                      |
| 503     | `HELP_NOT_CONFIGURED`                                                                                       | Bundle or provider missing                   | Fallback state                                                      |

Every error body: `{ "error": { "code": "...", "message": "..." } }` with no echo of the question.

## Server pipeline (ordered)

1. CORS + method check. 2. Session guard + rate limit. 3. Validate body and context. 4. Retrieve (registry filter → lexical rank → context boost). 5. If top score < `MIN_RELEVANCE`: return `no-match` (no model call). 6. Build prompt; call the `help-answer` operation (structured output) with schema `{ answer, sourceIds[], actionId, confidence }` (`actionId` is an empty string for "none", which every provider accepts). 7. Validate: drop unknown `sourceIds`; if `answered` with none left → `no-match`; expand `actionId` only from the supplied candidate list and only if valid for `context`. 8. Emit one metric line. 9. Respond.

Timeouts: upstream call budget 7 s; overall 8 s; abort → 504.

## Metric line (only observability output)

`area` is any value of the engine's `HELP_AREAS` list; the Worker takes the list from the engine, so a new area cannot be reported by the app and then rejected.

```json
{
  "event": "help.request",
  "outcome": "answered",
  "latencyMs": 2310,
  "area": "entity-detail"
}
```
