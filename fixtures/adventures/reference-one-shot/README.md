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
- `answer-key.json`: expected sections, NPCs, secrets, conditions, branch, alternative solution, clue, endings and per-section `actionableDetails` (paraphrased playable facts, used by the `fidelity` dimension). Checked by `packages/adventure-engine/tests/reference-one-shot.test.ts`. Grouping headings carry `"container": true` and are not required for scorer coverage.

## Variants (Prettier-ignored, one defect each)

- `variants/missing-headings.md`: two sections lose their headings and markers.
- `variants/duplicate-sections.md`: one heading text appears twice over different content.
- `variants/contradictory.md`: Maren's motivation is stated twice, in conflict.
- `variants/malformed.md`: unclosed code fence, a heading with no space, a skipped level and a broken table.
- `variants/adversarial.md`: embedded instructions to an AI reader, inert data only.
- `variants/adversarial.v1.json`: schema-valid JSON package with embedded instructions to an AI reader, kept as inert data; checked by `packages/adventure-engine/tests/adventure-json/adventure-json-adversarial.test.ts`.
- `variants/incomplete.v1.json`: schema-valid package missing the shrine branch, flooded ending and Wick's talk option; must fail the coverage audit.
- `variants/sparse.v1.json`: schema-valid package with exactly the same entity IDs and anchors as `adventure.v1.json` but text cut to bare names, so triggers, clues, alternate outcomes and consequences are gone; must fail the scorer's `fidelity` dimension.
