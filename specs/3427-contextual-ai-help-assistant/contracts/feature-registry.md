# Contract: Feature Registry

Authoritative schema and cross-reference validator: `packages/help-engine/src/registry/`. One TypeScript data module per feature under `registry/features/`.

## Entry shape

See `FeatureEntry` in [data-model.md](../data-model.md). Required: `id`, `title`, `summary`, `channel`, `routes`, `areas`, `kinds`, `tabs`, `workflows`, `helpIds`, `actions`. Optional: `related`.

## Validation (unit test + bundle build; any failure is a build error)

1. `id` unique and kebab-case.
2. Every `helpIds[]` exists as `apps/web/src/lib/content/help/<id>.md` (references only — registry never copies help text).
3. Every `related[]` exists.
4. Every action target exists in the control/destination catalogue (`help-actions.md`).
5. Every workflow `actionIds[]` is in the entry's `actions`.
6. `channel: "staging"` entries are dropped from production bundles.
7. Summary ≤ 280 chars; each workflow step ≤ 160 chars; plain language (no banned jargon list shared with UX copy checks).

## Proof-of-concept entries

| id                   | Areas / tabs                              | Help sources (existing)                                                                                                                                                                 | Notes                                                                                                                                                                        |
| -------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity-connections` | `entity-detail` / `connections`, `status` | `connections-tab`, `connection-labels`                                                                                                                                                  | Workflow `add-connection`: Status tab → Add → pick entity → choose type. Actions: `openPanel(status-tab)` → `highlight(add-connection-button)`, `openPanel(connections-tab)` |
| `graph-view`         | `graph`                                   | `graph-basics`                                                                                                                                                                          | Workflows: find an entity, see relationships. Actions: `navigate(graph)`                                                                                                     |
| `session-hub`        | `session-hub`                             | `in-app-generators` (mentions Session Hub entries); **no dedicated article exists today** — the spike adds a short `session-hub` article, which is itself a finding about coverage gaps | Actions: `navigate(session-hub)`                                                                                                                                             |
| `tables`             | `tables`                                  | `random-tables-decks`                                                                                                                                                                   | Actions: `navigate(tables)`                                                                                                                                                  |
| `campaign-generator` | `generators`                              | `in-app-generators`, `generate-related`                                                                                                                                                 | The one generator workflow; action `openGenerator(campaign)`                                                                                                                 |

Phase A (#3615) adds:

| id                   | Areas / tabs              | Help sources                                              | Notes                                                                             |
| -------------------- | ------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `canvas`             | `canvas`                  | `spatial-canvas`, `canvas-add-entities`                   | Action `navigate(canvas)`                                                         |
| `vtt-map`            | `map`                     | `map-mode`, `vtt-session`, `fog-of-war`                   | Action `navigate(map)`                                                            |
| `entity-editing`     | `entity-detail` / any tab | `creating-and-editing-entities` (new)                     | Deliberately one article: also claiming the templates article distorted retrieval |
| `backup-and-restore` | `settings` / `vault`      | `export-and-backup` (new), `cloud-backup`, `offline-sync` | Actions `openPanel(settings-vault)`, `openHelp(export-and-backup)`                |
| `archive-import`     | `import`                  | `importing`, `thread-weaver-import`                       | Actions `navigate(import)`, `openHelp(importing)`                                 |

The generators are one registry entry (`campaign-generator`) plus one bundle chunk per generator, written without the word "generator" so that "where are the generators" still finds the overview.

Help IDs are file basenames under `content/help/` that exist today, except `session-hub`, which this spike creates. Any ID that does not match a real article fails validation rather than being guessed.

## Authoring rules

Reference, don't duplicate; write workflows as short plain steps; add a registry entry in the same PR as a new user-facing feature (recorded as a follow-up process item, not enforced in the spike).
