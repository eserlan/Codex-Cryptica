# Contract: Funnel events

Sent through `trackEvent()` (`zaraz-analytics.ts`), so they are fail-silent and merged with attribution. Emitted only from the `(marketing)` route group. Never from the authenticated app (FR-022).

Privacy boundary (FR-021, `docs/devops/ZARAZ_ANALYTICS.md`): no idea text, no result text, no titles, no free text. Only page identifiers, enumerated values and counts.

| Event                             | When                                            | Properties                                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `idea_developer_arrived`          | Tool page opened with a source from a CTA       | `source_kind` (from the `from` query value, allow-listed: `answer`, `tools`, `other`), `source_id` (from `source`, slug pattern only), `suggested_mode` (from `mode`: `assess`, `develop`, or absent) |
| `idea_developer_submitted`        | First turn passes the limiter and is sent       | `mode`                                                                                                                                                                                                |
| `idea_developer_turn_submitted`   | A later turn passes the limiter and is sent     | `turn_kind`, `turn_index`, `mode`                                                                                                                                                                     |
| `idea_developer_result_shown`     | A validated development is displayed            | `mode`, `turn_index`, `suggestion_count`                                                                                                                                                              |
| `idea_developer_generator_opened` | User opens a suggested generator                | `generator_key`, `position`                                                                                                                                                                           |
| `idea_developer_signup_started`   | User chooses "Save to your Codex" on the result | `placement` (`result`)                                                                                                                                                                                |

Each is recorded once per action. The interaction id, turn text and development text are never included. `idea_developer_arrived` is recorded once per page load and only when a source id is present.

## Tests

- Payload snapshot for each event contains only the properties above.
- A test feeds an idea containing a marker string through the full flow and asserts the marker appears in no tracked payload (SC-006).
- A test asserts the module is not imported from anywhere under the authenticated app routes (SC-007).
