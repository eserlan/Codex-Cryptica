# Mystery fixture

An original, non-linear mystery (about 40 turns) with an answer key, for offline import and play tests. The party may investigate the harbour market, the old tidemill, the chapel and the optional tide archive in any order before descending to the drowned crypt.

## Conventions

- Every section is an ATX heading followed by a source-ID marker, `<!-- source-id: mys-scene-2-tidemill -->`. IDs are unique, lowercase kebab-case and stable. Prettier puts one blank line between the heading and the marker.
- Read-aloud prose is a blockquote starting `> **Read aloud:**`.
- GM-only material is a blockquote starting `> **GM only:**`.

## Files

- `adventure.md`: the clean adventure.
- `answer-key.json`: expected sections, NPCs, secrets, conditions, branch, alternative solution, clue, conclusions, testimonies and endings. Checked by `packages/adventure-engine/tests/mystery-fixture.test.ts` and parsed by `ConversionAnswerKeySchema`.
- `adventure.v1.json`: a hand-written, correct conversion, used as the scorer's positive control in `packages/adventure-engine/tests/adventure-json/conversion-score.test.ts`.

## Licence

Original content, licensed under the repository `LICENSE`, Polyform Noncommercial License 1.0.0, the same way as the reference one-shot.
