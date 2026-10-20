# Data Model: Business / Enterprise Generator

Everything here is transient generator state until it is saved. Saving uses the existing vault entities and connections, so there is no new storage format and no migration. The contract types are in [contracts/business-api.md](./contracts/business-api.md).

## BusinessDocument

The single source of truth for one generated business. The rendered `content` and `lore` text comes from it.

| Field              | Type                                                               | Rules                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`          | `1`                                                                | Always 1                                                                                                                                                                                                                                                 |
| `options`          | `ResolvedBusinessOptions`                                          | Everything resolved from the inputs (below)                                                                                                                                                                                                              |
| `identity`         | `{ name, type, description, reputationLine, distinctive }`         | All non-empty. `type` comes from the genre's list, or is the user's custom type                                                                                                                                                                          |
| `operations`       | `{ provides, payers, whyHere, mainIncome, model, size, position }` | All non-empty. `provides` is prose, not a list of more than 6 items, and has no prices. `model` says how it earns and whether it owns what it handles; `size` gives premises, people, vehicles or stock; `position` says how it is doing financially now |
| `leadership`       | `BusinessPerson`                                                   | `role` is `"owner"`, or `"manager"` when `playersOwn` is on                                                                                                                                                                                              |
| `staff`            | `BusinessPerson[]`                                                 | Count fits the scale: tiny 0 to 1, small 1 to 2, established 2 to 3, regional and major 3 to 4                                                                                                                                                           |
| `clientele`        | `{ typical, valuable, undesirable, excluded? }`                    | First three are non-empty                                                                                                                                                                                                                                |
| `dependencies`     | `BusinessDependency[]`                                             | At least 1                                                                                                                                                                                                                                               |
| `relationships`    | `BusinessRelationship[]`                                           | At least 1                                                                                                                                                                                                                                               |
| `reputation`       | `{ perception, consequence }`                                      | Both non-empty                                                                                                                                                                                                                                           |
| `pressure`         | `string`                                                           | Non-empty                                                                                                                                                                                                                                                |
| `asset`            | `string`                                                           | Non-empty                                                                                                                                                                                                                                                |
| `secret`           | `string`                                                           | Non-empty. Must not match the criminal word list when `legitimacy` is `"legitimate"`                                                                                                                                                                     |
| `opportunity`      | `string`                                                           | Non-empty                                                                                                                                                                                                                                                |
| `complication`     | `string`                                                           | Non-empty                                                                                                                                                                                                                                                |
| `hooks`            | `string[]`                                                         | 2 to 3 items, each containing at least one anchor (see the checks below)                                                                                                                                                                                 |
| `management`       | `BusinessManagement?`                                              | Present only when `playersOwn` is on                                                                                                                                                                                                                     |
| `fallbackSections` | `BusinessSectionId[]`                                              | Sections filled from local tables after an AI failure. Empty for a local run                                                                                                                                                                             |

## ResolvedBusinessOptions

| Field             | Values                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| `genre`           | Canonical theme id or custom text                                        |
| `businessType`    | One of `BUSINESS_TYPES[genre]` or custom text                            |
| `scale`           | `tiny`, `small`, `established`, `regional`, `major` (default `small`)    |
| `legitimacy`      | `legitimate`, `grey`, `front`, `mixed` (default `legitimate`)            |
| `wealth`          | `struggling`, `modest`, `comfortable`, `rich` (default `modest`)         |
| `clientele`       | Free text or empty (rolled)                                              |
| `location`        | Free text, pre-filled from the source entity (FR-009)                    |
| `tone`            | `grounded`, `gritty`, `whimsical`, `dark`, `heroic` (default `grounded`) |
| `campaignContext` | Free text, trimmed to the generator context limit                        |
| `playersOwn`      | boolean (default false)                                                  |

When the genre changes and the current `businessType` isn't in the new genre's list, `businessType` resets to that genre's first type. A custom type is kept.

## BusinessPerson

`{ id, name, role, goal, style?, trait, pressure? }`

- `id` is stable within a document and is used as the key for regeneration and save choices.
- `role` is `owner`, `manager` or a staff role (for example "bookkeeper" or "security").
- `style` is required for leadership and optional for staff.

## BusinessDependency

`{ id, input, kind, ifItFails }`

`kind` is one of `materials`, `labour`, `transport`, `licence`, `magic`, `data`, `protection` or `finance`.

## BusinessRelationship

`{ id, name, kind, label, reason, partyKind }`

| Field       | Values                                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`      | `competitor`, `supplier`, `patron`, `regulator`, `criminal`, `neighbour`, `faction`                                                                              |
| `label`     | One of the FR-011 labels: `owned by`, `employs`, `supplied by`, `serves`, `competes with`, `regulated by`, `owes`, `protected by`, `located in`, `contracted by` |
| `partyKind` | `organisation` (saved as a Faction) or `individual` (saved as a Character)                                                                                       |

## BusinessManagement

`{ strengths[2..3], liabilities[2..3], upgrades[>=1], obligations[>=1], successAttracts[>=1] }`

Obligations are named only. They never contain currency or numeric prices.

## BusinessSectionId

`identity | operations | leadership | staff:<personId> | clientele | dependencies | relationships | reputation | pressure | asset | secret | opportunity | complication | hooks | management`

## Checks (FR-007)

`checkBusiness(doc): BusinessIssue[]`, where each issue is `{ section, code, detail }`:

| Code                    | Rule                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `missing`               | A required field above is empty                                                                                                                                      |
| `hook-unanchored`       | The hook contains none of these, case-insensitive: a person's name, a relationship's name, a dependency's `input`, or a keyword from `asset`, `pressure` or `secret` |
| `legit-secret-criminal` | `legitimacy` is `legitimate` and `secret` matches the criminal-front word list                                                                                       |
| `staff-count`           | Staff count is outside the scale's range                                                                                                                             |
| `inventory-list`        | A section has more than 6 list items, or matches a price pattern (currency symbol or "N gp/cr/eddies")                                                               |
| `management-mismatch`   | `management` is present when `playersOwn` is off, or missing when it is on                                                                                           |
| `relationship-label`    | A relationship's label is not in `BUSINESS_ALLOWED_LABELS` for its kind (for example a `neighbour` labelled "located in")                                            |

Names that appear in the text without being introduced are not an issue but a **warning** (`warnings` on the document): the check is a heuristic, so it asks the stage that wrote them to retry once, then shows the names to the GM instead of rewriting their text. Local output passes every check by construction, and tests assert this across every genre and type.

## Lifecycle

```text
configure ─▶ generating (stages: identity → connections → trouble)
          ─▶ review (regenerate one section, any number of times)
          ─▶ save step (people ticks, party choices, source link)
          ─▶ saved (Faction + Characters + connections)  |  rolled back on failure
```

## Save plan (in-app)

`BusinessSavePlan`:

- `business`: the Faction draft (title, rendered content and lore, labels such as `business` and the genre), with an optional `collision`, as for people.
- `people`: `{ personId, draft, ticked: true, link: "owned by" | "employs", collision? }`. With `playersOwn` on, leadership uses `employs`. `collision` is the id of an existing entity with the same title. The save step then offers rename or keep.
- `parties`: `{ relationshipId, label, choice }`, where `choice` is either:
  - `{ kind: "match", entityId, ticked: true }`, or
  - `{ kind: "create", draft, entityType: "faction" | "character", ticked: false }`
- `source`: `{ entityId, labelOptions, label, ticked: true }`, when launched from an entity. The label options are:
  - Location: `located in`
  - Character: `owned by`
  - Faction: `protected by` or `contracted by`

Connection direction: every connection runs from the business to the other entity. For example, business → owner is `owned by`, and business → staff is `employs`.

On failure, every entity created by this save is removed and the error is shown. Existing entities are never modified beyond the new connections.
