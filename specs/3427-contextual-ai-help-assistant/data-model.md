# Data Model: Contextual AI Help Assistant (Spike)

All entities are transient or build-time. Nothing is written to the vault, IndexedDB, OPFS, or remote storage.

## Terminology

| Spec term               | Code/contract term                                 |
| ----------------------- | -------------------------------------------------- |
| Screen description      | `HelpContextV1` ("context packet" in the arch doc) |
| Guidance action / guide | `GuidanceAction` (with optional `then`)            |
| Help Service Metric     | `help.request` log line                            |

## HelpContextV1 (Screen Description)

Built by `HelpContextStore` on the client; re-validated by the Worker with the same strict schema.

| Field              | Type            | Rule                                                                                                                                                                                                                                                                                                     |
| ------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v`                | literal `1`     | Schema version; unknown versions rejected                                                                                                                                                                                                                                                                |
| `routeTemplate`    | string          | A SvelteKit route template only (e.g. `/(app)/vault`), never a resolved path. Every segment must be literal or a `[param]` token.                                                                                                                                                                        |
| `area`             | enum            | Closed list: `entity-detail`, `graph`, `session-hub`, `tables`, `generators`, `other`                                                                                                                                                                                                                    |
| `entityKind`       | enum \| null    | One of the seven built-in categories (`character`, `creature`, `location`, `item`, `event`, `faction`, `note`), `custom` for any user-defined category, or `null` when not on an entity. There is no built-in `settlement`: a Settlement is a `location` or, in a vault with a custom category, `custom` |
| `tab`              | enum \| null    | Closed list of tab IDs (e.g. `status`, `connections`)                                                                                                                                                                                                                                                    |
| `mode`             | enum            | `view` \| `edit` \| `draft`                                                                                                                                                                                                                                                                              |
| `surface`          | enum            | `vault` \| `public`. The spike only produces `vault`; `public` is accepted by the schema but reserved (the panel is not shown outside the app)                                                                                                                                                           |
| `flags`            | string[] (≤ 8)  | Allow-listed material flags only: `generators` (a generator can be opened) and `connections-editable` (the Add button exists; absent in a read-only guest vault)                                                                                                                                         |
| `availableActions` | string[] (≤ 12) | Allow-listed control/action IDs currently valid on screen                                                                                                                                                                                                                                                |

Validation: `.strict()` (unknown keys rejected, not silently accepted). Excluded by construction: entity IDs, vault IDs, names, titles, text, URLs, query strings, credentials.

## FeatureEntry (Registry)

| Field       | Type                      | Notes                                                                                |
| ----------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `id`        | string                    | Stable kebab-case, unique (e.g. `entity-connections`)                                |
| `title`     | string                    | Plain-language name                                                                  |
| `summary`   | string                    | What it is for, 1–2 sentences                                                        |
| `channel`   | `production` \| `staging` | Staging-only entries are excluded from production bundles                            |
| `routes`    | string[]                  | Route templates where it lives                                                       |
| `areas`     | area[]                    | Matches `HelpContextV1.area`                                                         |
| `kinds`     | string[] \| `"any"`       | Entity kinds it applies to (labels, not tags)                                        |
| `tabs`      | string[]                  | Tabs where it applies                                                                |
| `workflows` | Workflow[]                | Named tasks, see below                                                               |
| `helpIds`   | string[]                  | IDs of existing `content/help/*.md` articles it draws on; must exist                 |
| `related`   | string[]                  | Feature IDs; must exist                                                              |
| `actions`   | ActionRef[]               | Safe actions offerable for this feature; targets must exist in the control catalogue |

**Workflow**: `{ id, title, steps: string[] (short, plain), actionIds: string[] }`.

## HelpChunk (Knowledge Bundle item)

| Field               | Type                 | Notes                                           |
| ------------------- | -------------------- | ----------------------------------------------- |
| `id`                | string               | `<sourceId>#<n>` stable within a bundle version |
| `sourceId`          | string               | Help article ID or `registry:<featureId>`       |
| `kind`              | `help` \| `registry` |                                                 |
| `featureId`         | string \| null       | Used for context boosting                       |
| `title` / `heading` | string               | For display and citation                        |
| `text`              | string               | ≤ ~450 tokens                                   |
| `hash`              | string               | Content hash (used by the future sync design)   |

**KnowledgeBundle**: `{ version: 1, commit, builtAt, chunks: HelpChunk[], features: FeatureEntry[] }`.

## HelpQuestion (request)

`{ question (1–500 chars), history: { role: "user"|"assistant", text }[] (≤ 4, ≤ 600 tokens total), context: HelpContextV1 }`. Transient.

## HelpAnswer (response)

| Field         | Type                                       | Notes                                                                         |
| ------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| `outcome`     | `answered` \| `no-match` \| `out-of-scope` | Fallback/offline are client-side outcomes and are not returned by the Worker  |
| `answer`      | string                                     | Plain language, short                                                         |
| `sources`     | `{ id, title, helpId? }[]`                 | Only IDs from the supplied source set; ≥ 1 when `answered`                    |
| `action`      | GuidanceAction \| null                     | Expanded by the Worker from a server-supplied candidate; never model-authored |
| `suggestions` | `{ helpId, title }[]`                      | For `no-match`: closest topics                                                |

## GuidanceAction

Discriminated union on `type`:

| `type`          | Payload                        | Validation                                                                                     |
| --------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `navigate`      | `{ to: DestinationId }`        | `DestinationId` from a closed destination catalogue (not a free route) and valid for `surface` |
| `openHelp`      | `{ helpId }`                   | Article must exist in bundle                                                                   |
| `openPanel`     | `{ panel: PanelId }`           | Panel/tab in catalogue and in `availableActions`                                               |
| `highlight`     | `{ target: ControlId, label }` | Control in catalogue; must be in `availableActions` for this screen                            |
| `openGenerator` | `{ generatorId }`              | Generator in catalogue; flag-gated                                                             |

One optional `then` step (max depth 1) lets the spike scenario be a single offered guide: `openPanel(status-tab)` then `highlight(add-connection-button)`. Nothing in any type can create, modify, delete, import, or export vault content.

## HelpServiceMetric (log line)

`{ event: "help.request", outcome: "answered"|"no-match"|"out-of-scope"|"error"|"rate-limited", latencyMs, area }`. No identifiers, no content, no IP. Count is the number of lines.

## State transitions (panel)

`closed → idle → pending → (answered | no-match | out-of-scope | fallback) → idle`. `pending → idle` on cancel (the unanswered question is taken back off the page). A screen change during `pending` marks the eventual answer as "for a previous screen" and drops its guide. The panel keeps the last 8 messages (four exchanges) on screen and sends only the last 4 turns; it is cleared on reset and never persisted.
