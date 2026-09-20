# Contract: Conversation turns

How the service talks to the model across turns. Uses `aiClientManager.sendInteraction` with the registry key `luna-fast`.

## Request per turn

| `sendInteraction` param | First turn                                                                                                                           | Later turns                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`                 | `luna-fast`                                                                                                                          | `luna-fast`                                                                                                                                                                 |
| `systemInstruction`     | The tool's fixed instruction (develop, do not replace; eight sections with an example JSON shape; no scores; idea is delimited data) | **Sent again.** The Responses API does not carry `instructions` across `previous_response_id`, so omitting it made the model forget the sections and the `whatChanged` rule |
| `input`                 | Mode emphasis + the delimited idea                                                                                                   | Turn text framed by kind (see below) + mode emphasis if it changed                                                                                                          |
| `previousInteractionId` | none                                                                                                                                 | The id returned by the previous turn                                                                                                                                        |
| `storeConversation`     | `true` (required for chaining)                                                                                                       | `true`                                                                                                                                                                      |
| `generationConfig`      | `{ responseMimeType: "application/json", maxOutputTokens }`                                                                          | same                                                                                                                                                                        |
| `signal`                | AbortController for cancel                                                                                                           | same                                                                                                                                                                        |

The idea and earlier turns are **not** resent on later turns. Only the fixed system instruction is, and it never contains user text.

## Turn framing (later turns)

| Kind               | Input sent                                                                             |
| ------------------ | -------------------------------------------------------------------------------------- |
| `answer-questions` | "The creator answers: ..." followed by the user's text, delimited as data              |
| `change-part`      | "The creator asks for this change: ..." followed by the user's text, delimited as data |
| `switch-mode`      | The new mode's emphasis instruction only                                               |

User text is always delimited as data and never appended to the system instruction (FR-027).

## Response

`{ id, text }`. `text` is parsed and validated per [idea-developer-response.md](./idea-developer-response.md). On success the store saves `id` as `previousInteractionId`.

## Errors

| Case                                                    | Behaviour                                                                                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Invalid JSON or rule failure                            | Ask again once with the reason appended ("Your previous reply was not usable: ..."), then fail with input kept (FR-026). The reason is logged to the console as a fixed sentence about the shape, never the reply or idea text |
| `InteractionExpiredError` (409 `INTERACTION_NOT_FOUND`) | Replay (below), then continue transparently (FR-037)                                                                                                                                                                           |
| Limiter or bot check refuses                            | No request is made; plain-language message with a retry time                                                                                                                                                                   |
| Network or provider error                               | Fail with input kept; the turn is `failed` and does not count toward the cap                                                                                                                                                   |
| Bot check (session or challenge) failure                | Distinct plain-language message that keeps the input and offers retry; no turn recorded (R18)                                                                                                                                  |
| Abort                                                   | Turn is `cancelled`; conversation state is unchanged                                                                                                                                                                           |

## Replay

Build one first-turn input from: the original idea, the ordered `done` turns (kind and text), and the latest development as "current state". Send it with no `previousInteractionId` and the full system instruction, store the new id, and continue. If replay itself fails, keep the user's typed input and offer a new conversation.

## Limits

- Turn cap per conversation: 30 `done` turns (constant). It is not shown to the user; only reaching it produces a message.
- One turn in flight at a time.
- Per-turn: bot check and the per-browser limiter.

## Privacy

Nothing here is written to Codex Cryptica storage or logs. The provider holds the conversation for its retention window while it continues; the tool page discloses this and offers a new conversation (FR-023).

## Tests

- Later turns send neither the idea nor earlier turns (assert the request body).
- Each kind produces the framed input above; user text never enters `systemInstruction`.
- Expired-id path replays and continues; replay failure keeps the typed input.
- The cap stops turn 9; a `failed` or `cancelled` turn does not count toward it.
