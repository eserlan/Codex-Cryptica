# Contract: Screen Description (`HelpContextV1`)

Authoritative schema: `packages/help-engine/src/context/`. Summary of rules (full field table in [data-model.md](../data-model.md)).

## Included

`v`, `routeTemplate`, `area`, `entityKind` (built-in category ID or `custom`), `tab`, `mode`, `surface`, `flags` (allow-listed), `availableActions` (allow-listed IDs).

## Areas (phase A)

`entity-detail`, `graph`, `session-hub`, `tables`, `generators`, `canvas`, `map`, `import`, `settings`, `other`. `canvas`, `map` and `import` come from the route. `settings` comes from the open Settings dialog, and its `tab` is the open Settings tab (`vault`, `intelligence`, `schema`, `templates`, `theme`, `publishing`, `about`, `help`); `tab` is an entity tab only when the area is `entity-detail`, and a tab that does not belong to the area is dropped. When several things are open the most specific one wins: Settings, then a generator, then an entry, then the route. The entry's kind and tab are reported only while the entry is the screen.

## Excluded — enforced by schema and tests

| Never sent                                | Why / how enforced                                         |
| ----------------------------------------- | ---------------------------------------------------------- |
| Entity, vault, campaign, session IDs      | No field exists; route uses template, not path             |
| Entity names, titles, descriptions, notes | No free-text field in the schema                           |
| Custom category names                     | Collapsed to `custom`                                      |
| URLs, query strings, hashes               | Only SvelteKit route templates accepted                    |
| Credentials/API keys/tokens               | No field; capability token travels only in `Authorization` |
| Settings, vault size, counts              | Not in schema                                              |

## Producer

`HelpContextStore` has explicit, registered providers (route, entity detail tab, mode). A provider returns only schema fields; unknown output is dropped by `.strict()` parsing followed by a sanitiser that discards (not rejects) on the client so a bad provider cannot break help. The Worker rejects on violation (`INVALID_CONTEXT`).

## Evolution

Adding a field requires: schema change in `help-engine`, a version bump if semantic, an update to this contract, and a privacy review note in the PR. Tests assert the exact key set so silent additions fail CI.

## Examples

Settlement → Connections (valid): see [help-ask-api.md](./help-ask-api.md).

Invalid (rejected): `routeTemplate: "/vault/3f2a…/entity/9b1c…"`, any extra key such as `entityTitle`, `surface: "admin"`.
