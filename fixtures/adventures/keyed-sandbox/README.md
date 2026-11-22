# Keyed sandbox fixture

An original keyed-location module for validation tests. The source states one transition, from the gatehouse to the hall. The remaining keyed areas are joined by room adjacency only, so the order of play is left to the players and each of those scenes carries an `UNKNOWN_SCENE_PROGRESSION` unresolved entry while keeping its `"explicit"` status.

## Files

- `adventure.v1.json`: a hand-written, correct conversion. Checked by `packages/adventure-engine/tests/adventure-json/adventure-json-validator.test.ts`.

## Licence

Original content, licensed under the repository `LICENSE`, Polyform Noncommercial License 1.0.0, the same way as the reference one-shot.
