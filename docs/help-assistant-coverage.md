# Contextual AI Help coverage

The feature registry in `packages/help-engine/src/registry/features/` owns screen
knowledge and safe guidance. Its prose sources are the same Help articles people
read in the Help library. This table records the coverage decision for each
registered feature; the coverage test requires it to stay in sync.

| Feature ID                | Screen or tab                            | Authoritative Help IDs                             | Guidance and limits                                                                                                                     |
| ------------------------- | ---------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| entity-connections        | Entity Status / Connections              | connections-tab, connection-labels, proposer-guide | Open tabs; highlight Add only when connections are editable.                                                                            |
| graph-view                | Graph                                    | graph-basics                                       | Navigate to Graph.                                                                                                                      |
| session-hub               | Session Hub / generators                 | session-hub, in-app-generators                     | Read Help; no draft selection or saving.                                                                                                |
| tables                    | Tables                                   | random-tables-decks                                | Navigate to Tables; no rolls or draws.                                                                                                  |
| campaign-generator        | Generator workflow                       | in-app-generators, generate-related                | Open a generator only in a ready, non-guest vault; never generate or save.                                                              |
| canvas                    | Spatial Canvas                           | spatial-canvas, canvas-add-entities                | Navigate to Canvas; no board changes.                                                                                                   |
| vtt-map                   | Maps / VTT                               | map-mode, vtt-session, fog-of-war                  | Navigate to Map; no token, fog or session changes.                                                                                      |
| entity-editing            | Entity view / edit                       | creating-and-editing-entities                      | Read Help; no creation, revisions or saving.                                                                                            |
| related-entity-generation | Entity Status                            | generate-related                                   | Highlight the visible Generate Related control; no generation.                                                                          |
| backup-and-restore        | Vault Settings                           | export-and-backup, cloud-backup, offline-sync      | Open Settings when available; never back up or restore.                                                                                 |
| archive-import            | Import                                   | importing, thread-weaver-import                    | Navigate or read Help; never import files.                                                                                              |
| session-journal           | Scratchpad journal overlay               | quicknote                                          | Open the journal tab only in a ready, non-guest vault; never start, end, write or promote a journal.                                    |
| entity-reports            | Report preview / Canvas / Graph / Tables | spatial-canvas                                     | Read Help; no preview creation, saving or regeneration. Canvas report controls remain unavailable in guest vaults and Adventure boards. |
| stat-sheets               | Entity Stats                             | stat-sheets, sharing-templates                     | Open Stats when a tab strip exists, or available template Settings; no layout, value, roll or publication changes.                      |
| entity-templates          | Settings → Templates                     | default-entity-templates, sharing-templates        | Open available template Settings or Help; no defaults, imports or template edits. Settings guidance is suppressed in guest mode.        |
| chronology                | Chronology / entity Timeline             | chronology                                         | Navigate to Chronology or open the available Timeline tab; no date/calendar changes.                                                    |
| family-tree               | Character Family                         | family-tree                                        | Open Family only for a character with a tab strip, including read-only browsing; no family link changes.                                |
| guided-mode               | Graph workspace                          | guided-mode                                        | Read Help; no automatic mode toggle, suggestion acceptance or Quick Start.                                                              |
| session-prep              | Public Session Prep Builder              | session-prep                                       | Knowledge and Help only. Cif remains in the existing vault Help panel; this does not add a public assistant or run the builder.         |
| publishing                | Settings → Publishing                    | publishing                                         | Open Publishing settings when available, or read Help; never publish, update, unpublish or list a world.                                |
| lore-oracle               | Lore Oracle (any screen)                 | oracle-guide, chat-commands                        | Open Intelligence settings when available, or read Help; never ask, revise, create or connect anything.                                 |

## Context and unavailable actions

Entity tabs are reported in view or edit mode using the existing mode field.
Settings, report and journal overlays suppress the underlying entity context.
Zen Mode has no tab strip, so it offers no tab-opening guidance. Character-only
Family guidance is also checked by the engine, even if an invalid provider claims
the panel is available. Readable Help remains available when other actions cannot
run. Explicit questions can retrieve features from another screen; screen matching
only controls hints and retrieval boosts.

Route descriptions use closed SvelteKit templates, including nested vault/entity
and canvas routes; they contain no resolved IDs, names, dates or journal text.
No context keys, action types, storage or third-party dependencies are added.

## Feature completion

Every major user-facing feature must make both decisions in the PR template:
Human Help coverage and contextual AI Help coverage. Add a registry entry and
update this table, extend an existing entry, or record an explicit reason for
deferring AI Help support. New registry entries must reference visible Help,
include available/unavailable action tests and include retrieval questions with
misleading context. Article metadata and registry references are build-validated.

## Rollout

Rebuild the knowledge bundle and deploy the Oracle proxy Worker **before** the
web build: the older strict Worker rejects the new area, route and panel enums.
The generated knowledge bundle is a build artifact and is not committed.
Run the live-answer evaluation separately from deterministic retrieval tests;
offline recall does not prove model answer quality or refusal of near misses.
