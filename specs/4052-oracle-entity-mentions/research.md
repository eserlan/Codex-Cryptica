# Research: Oracle Entity @Mentions

## D1. How are mentions held in the composer?

- **Decision**: Keep the composer a plain `<textarea>`. Selecting a suggestion inserts `@Display Name` as text and records a side list of mention ranges `{entityId, displayName, entityType, start, end}`. A pure `draft.ts` function shifts ranges on every edit and drops any mention whose text no longer equals `@displayName`.
- **Rationale**: Matches clarification Q3 (an edited token becomes plain text). Avoids a rich-text editor, which would break the existing slash-command menu, soft-keyboard behaviour and paste handling. "Visibly distinct" is shown in the picker's confirmed state and in the sent message; the textarea itself cannot style spans.
- **Alternatives**: contenteditable chips (fragile on Android, breaks `CommandMenu`); inline markup like `@[Name](id)` in the text (ugly to read and edit, leaks IDs into prompts).

## D2. Where does the stable ID travel?

- **Decision**: As structured data, never as text. `OracleChatManager.sendMessage` resolves the draft's mentions, stores them on the user `ChatMessage.mentions`, and puts resolved IDs on the `OracleIntent`. `OracleGenerator.retrieveForQuery` passes them as `pinnedEntityIds` to `retrieveContext`.
- **Rationale**: FR-006 forbids the model inferring the ID. Retrieval already returns `primaryEntityId`/`sourceIds`; pinning plugs into that.
- **Alternatives**: rewrite the query to the canonical name and rely on `findExplicitSubject` (still a text match; wrong with duplicate names).

## D3. Relationship to #1401 (name-mentioned entities)

- **Decision**: `findExplicitSubject` and the related-entity expansion stay as the fallback for text with no `@`. When `pinnedEntityIds` is present, pinned entities are added first and become primary (first pin is primary), and name matching may only add entities not already pinned.
- **Rationale**: FR-007: explicit `@` beats fuzzy text matching. No behaviour change for plain queries (FR-012).
- **Alternatives**: remove name matching (regression for plain questions).

## D4. Suggestion source

- **Decision**: Use `searchService.search` for ranking and the vault's in-memory title and alias data for exact and prefix alias hits, the same inputs as the Explorer and `Autocomplete`. Short prefixes (1-2 characters) use a local in-memory prefix scan to stay under 200 ms. Visibility filter applied before display.
- **Rationale**: FR-019: no Oracle-only index. `Autocomplete.svelte` and `CommandMenu.svelte` already do this pairing and the visibility filtering, so the behaviour is consistent.
- **Alternatives**: new index (rejected, duplicate); embed `Autocomplete` directly (its input is a standalone field, not a caret-anchored list; reuse its search and a11y pattern, not the component).

## D5. Visibility (clarification Q1)

- **Decision**: One injected predicate `isVisible(entity)` built from the existing rules (`isEntityVisible` with shared/guest mode plus draft exclusion). It is applied in three places: suggestions, `resolve`, and `pinned-context`. No GM override.
- **Rationale**: Three-stage enforcement (FR-014); the context stage re-checks so a stale or pasted ID cannot bypass the picker.

## D6. Bounded related content (clarification Q2)

- **Decision**: `pinned-context.ts` emits each pinned entity in full, then one short summary line per directly linked entity (first N by link order, summary truncated), all under the existing `MAX_CHARS = 10000`. Pins are reserved first; if pins alone exceed the cap the last pinned entities are truncated, never dropped silently without a note to the user.
- **Rationale**: Predictable, testable, and keeps mentions primary.

## D7. Unselected `@name` (clarification Q4)

- **Decision**: `resolve` extracts `@word…` candidates that are not covered by a tracked mention, matches case-insensitively against titles and aliases of visible entities, and accepts only a single hit. Several hits return `ambiguous` (the UI asks the user to choose and blocks sending until they do or choose "send as text"); no hits returns `unmatched` (a notice, and the text sends as written).
- **Rationale**: FR-010. Longest-title-first matching handles multi-word names such as `@Elara Voss`.
- **Alternatives**: fuzzy matching (risk of wrong entity, rejected).

## D8. Reply links (clarification Q5)

- **Decision**: `MentionText` for assistant messages links only titles in the set `{mentioned ∪ context sources}` on exact, word-bounded match. The set comes from `mentions` plus the message's `sourceIds`. If the reply does not already carry `sourceIds`, they are added to the assistant message when it is saved.
- **Rationale**: No wrong-link risk.

## D9. Rename and delete

- **Decision**: Stored mentions keep `entityId`; display uses the live title when the entity exists, falling back to the stored `displayName`. A missing entity renders as "unavailable" text with no link.

## D10. Mobile layout

- **Decision**: Picker is anchored above the textarea with Floating UI `flip`/`shift`, max height from `visualViewport` so it stays above the soft keyboard, rows at least 48 px high, and it never overlaps the Send button (anchored to the textarea's top edge, not the bottom).
- **Rationale**: FR-015; the same approach as `CommandMenu`.

## D11. Reuse for Cif and VTT Chat

- **Decision**: The package has no Oracle imports. The picker component takes `search`, `isVisible`, `onSelect`, `onClose` as props. Contracts document the boundary; Cif keeps its own retrieval and authority rules.
