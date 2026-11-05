# Internal scenario command contract

All commands target the current Vault/session and expected revision through the existing runtime scope/lease checks. Domain reducers are framework-free; app code owns injected IDs, storage and UI messages.

| Command               | Preconditions                                                                    | Result                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Add selected scenario | Active/writable session, no pending roll, valid stable origin and immutable seed | New heard item for a player-selected rumour, or unheard item for hidden background; no new scene or automatic focus |
| Focus / clear         | No pending roll; selected target heard and open, or null                         | Attention changes only; same choice is a no-op                                                                      |
| Mark heard            | Validated fictional reveal in a committed turn, referencing an existing item     | Persist known lead atomically with narration; no automatic objective or baseline-truth reveal                       |
| Append event / status | Explicit item/event identity, valid expected revision and transition             | Only that situation changes; terminal status clears its focus                                                       |
| Player projection     | Any readable session                                                             | Heard items and player-visible events only; no unheard counts, hidden provenance, GM truth or bindings              |

Failures: invalid payload, ID collision, provenance conflict, stale revision/control, unknown or undisclosed target, invalid transition, pending roll, collection/history/aggregate budget exceeded. They preserve the prior state and pending handoff. Exact duplicate origin/event yields already-applied with no new revision; changing immutable payload under the same identity is a conflict.

`markHeard` is the typed integration hook for narrative disclosure and #4531. Validate proposed IDs and apply it with the same completed-turn transaction; no separate pre-narration save. Focus/status actions are explicit local state operations, not prompts that let the model choose the player's intentions.

The same canonical actor ID may be referenced by several items, without sharing their secret IDs or conflating scenario outcomes. Existing time-thread references remain valid; no cross-scenario causal routing is introduced here.
