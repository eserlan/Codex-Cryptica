# Reference one-shot fixture

An original, system-light one-shot (about 30 turns) with an answer key, for offline import and play tests.

## Conventions

- Every section is an ATX heading followed by a source-ID marker, `<!-- source-id: ros-scene-2-yard -->`. IDs are unique, lowercase kebab-case and stable. Prettier puts one blank line between the heading and the marker.
- Read-aloud prose is a blockquote starting `> **Read aloud:**`.
- GM-only material is a blockquote starting `> **GM only:**`.

## Files

- `adventure.md`: the clean adventure.
- `adventure.pdf`: a multi-page text-based PDF build of `adventure.md` (licensed under the repository `LICENSE`, Polyform Noncommercial License 1.0.0), used by `packages/adventure-engine/tests/adventure-pdf-import.test.ts`.
- `adventure.v1.json`: the converted Adventure JSON v1 package, audited against the answer key by `packages/adventure-engine/tests/reference-one-shot-coverage.test.ts`.
- `answer-key.json`: expected sections, NPCs, secrets, conditions, branch, alternative solution, clue and endings. Checked by `packages/adventure-engine/tests/reference-one-shot.test.ts`.

## Variants (Prettier-ignored, one defect each)

- `variants/missing-headings.md`: two sections lose their headings and markers.
- `variants/duplicate-sections.md`: one heading text appears twice over different content.
- `variants/contradictory.md`: Maren's motivation is stated twice, in conflict.
- `variants/malformed.md`: unclosed code fence, a heading with no space, a skipped level and a broken table.
- `variants/adversarial.md`: embedded instructions to an AI reader, inert data only.
- `variants/incomplete.v1.json`: schema-valid package missing the shrine branch, flooded ending and Wick's talk option; must fail the coverage audit.
