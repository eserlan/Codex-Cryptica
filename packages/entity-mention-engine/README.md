# entity-mention-engine

Framework-free rules for `@` entity mentions in a text composer: finding the
trigger, ranking suggestions, keeping mention ranges right while the user
types, resolving typed names and linking titles in replies.

## Boundaries

- **No I/O.** The package never reads storage, the vault or the network. The
  caller passes a `MentionSource` (`getEntity`, `isVisible`, `listCandidates`)
  and, for full-text hits, a list of entity ids.
- **Visibility is the caller's rule.** Every suggestion, resolution and link
  goes through `source.isVisible`. A hidden or foreign-Vault entity can never
  be returned, even when the caller passes its id.
- **Data, not markup.** A mention is `{ entityId, displayName, entityType,
start, end }`. Only the id is used for resolution and links. The text is
  checked against `displayName` before a mention is trusted, so an edited or
  tampered record renders as plain text.
- **No UI.** Picker, keyboard handling and ARIA live in `apps/web`
  (`EntityMentionPicker`, `oracle-mention-controller`).

## Public API

| Export                                            | Purpose                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `detectTrigger(text, caret)`                      | Finds an `@query` at a word start. Returns `null` for emails and mid-word `@`.                                     |
| `suggest(query, source, searchHits?, limit?)`     | Ranks visible entities by title, alias and word match. Adds visible full-text hits last.                           |
| `applySelection(text, trigger, entity, mentions)` | Replaces `@query` with `@Display Name `, records the mention and returns the new caret.                            |
| `reconcile(prev, next, mentions)`                 | Shifts mentions after an edit and drops any mention whose text was changed.                                        |
| `serialize(mentions, text)`                       | Keeps only intact, non-overlapping mentions. Safe to store.                                                        |
| `resolve(text, mentions, source)`                 | Resolves tracked mentions by id and typed `@name`s. Returns `resolved`, `ambiguous`, `unavailable` or `unmatched`. |
| `collectPinnedIds(results)`                       | De-duplicated entity ids, in order, for context retrieval.                                                         |
| `linkTitles(text, candidates)`                    | Links exact, word-bounded titles in a reply. Longer titles win.                                                    |
| `segmentText(text, mentions)`                     | Splits text into plain and mention parts for rendering.                                                            |

## Reuse notes

- **Cif (help assistant):** provide a `MentionSource` limited to help or product
  items, or none. Cif keeps its own retrieval. The picker and engine need no
  change.
- **VTT Chat:** provide a table-scoped source with its own permission predicate.
  Pass that source's ids as `pinnedEntityIds` only after the same check.

## Tests

`bun test` inside this package. The 5,000-entity ranking check in
`tests/suggest.test.ts` guards the 200 ms budget (SC-002).
