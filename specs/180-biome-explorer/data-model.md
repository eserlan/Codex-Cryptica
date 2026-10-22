# Data Model: Biome Explorer

Shapes are described in plain terms with zod-style field notes. Reference data is static and bundled. Only `BiomeProfile` is persisted.

## Reference data (bundled, read-only)

### ReferenceBiome

| Field        | Type                                 | Notes                                                                      |
| ------------ | ------------------------------------ | -------------------------------------------------------------------------- |
| `id`         | string (kebab-case, unique)          | e.g. `boreal-forest`                                                       |
| `name`       | string                               | Plain-language name                                                        |
| `category`   | `climate-zone` \| `landform-habitat` | Coastline and wetland are `landform-habitat`                               |
| `summary`    | string (≤ 160 chars)                 | Shown on the concise card                                                  |
| `filters`    | `FilterFacet[]`                      | e.g. `cold`, `dry`, `wet`, `forested`, `open`, `coastal`, `high-elevation` |
| `conditions` | `Conditions`                         | See below                                                                  |
| `landscape`  | `Statement[]`                        | Landforms, soils, typical terrain                                          |
| `vegetation` | `Statement[]`                        | Typical plants and structure                                               |
| `wildlife`   | `Statement[]`                        | Wildlife **niches** (roles) first, example species second                  |
| `resources`  | `Statement[]`                        | Useful materials and food sources                                          |
| `hazards`    | `Statement[]`                        | Weather, terrain, wildlife and seasonal hazards                            |
| `variations` | `Statement[]`                        | Sub-types and regional variants                                            |
| `images`     | `ImageRef[]` (≥ 1)                   | First is a reviewed AI illustration; photographs are optional extras       |
| `sourceIds`  | string[] (≥ 1)                       | Resolves against `Source`                                                  |
| `related`    | `{ label, href }[]` (optional)       | Links to existing settlement and worldbuilding guidance (spec assumption)  |

### Conditions

Every field is a `Range` or `undefined` (shown as "Not a fixed value" in the UI, never silently filled).

| Field               | Type          | Notes                                           |
| ------------------- | ------------- | ----------------------------------------------- |
| `temperature`       | `Range`       | Annual mean, °C, with `note` for seasonal swing |
| `seasonality`       | `Statement[]` | How seasons differ (text, with basis)           |
| `precipitation`     | `Range`       | Annual, mm                                      |
| `elevation`         | `Range?`      | Metres; required for `high-elevation` biomes    |
| `waterAvailability` | `Statement[]` | Surface water, groundwater, seasonal flooding   |
| `notes`             | `Statement[]` | Extra constraints and limits                    |

### Range

`{ low: number, high: number, unit: string, note?: string }` with `low <= high`. A range is never collapsed to a single value.

### Statement

`{ text: string, basis: "pattern" | "simplification" | "exception", sourceIds: string[] }`

- `basis` is mandatory (FR-011).
- Every `sourceIds` entry must resolve (FR-012).

### ImageRef

A union on `origin`. Both forms share `url` (https URL on the asset host, never a local file), `alt` (non-empty, FR-006) and `kind`.

**`origin: "generated"`** (the main image of every biome, FR-008a)

| Field         | Type                                                         | Rule                                                                                                                            |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `kind`        | `"illustration"`                                             | Always; never shown as a photograph (FR-008)                                                                                    |
| `tool`        | string, non-empty                                            | Model or tool name                                                                                                              |
| `generatedAt` | ISO date                                                     | When it was made                                                                                                                |
| `prompt`      | string, non-empty                                            | The description used, written from the biome's own statements                                                                   |
| `review`      | `{ reviewedBy, reviewedAt, notes }` (optional in the schema) | If present, all three are required. The release-gate test (not the schema) requires it on every generated image before shipping |

**`origin: "licensed"`** (optional secondary images)

| Field        | Type                           | Rule                                           |
| ------------ | ------------------------------ | ---------------------------------------------- |
| `kind`       | `photograph` \| `illustration` | Never mislabel an illustration as a photograph |
| `creator`    | string, non-empty              | FR-006                                         |
| `sourceUrl`  | https URL                      | Where it came from                             |
| `licence`    | enum from the allow-list       | `CC0-1.0`, `PD`, `CC-BY-4.0`, `CC-BY-SA-4.0`   |
| `licenceUrl` | https URL                      | Link to the licence text                       |

`images[0]` of every `ReferenceBiome` must be a `generated` image.

### Source

`{ id, title, author?, year?, url? }`. Shared across biomes in `catalogue/sources.ts`.

## Persisted data

### BiomeProfile (stored in the Note entity's `biome` field)

| Field                | Type                                    | Notes                                                   |
| -------------------- | --------------------------------------- | ------------------------------------------------------- |
| `version`            | `1`                                     | For future change                                       |
| `reference`          | `ReferenceSnapshot \| null`             | `null` when started from blank                          |
| `own`                | `OwnFields`                             | The user's own description (see below)                  |
| `alterations`        | `Alteration[]`                          | Fictional changes with causes                           |
| `illustrationPrompt` | string (optional)                       | The last prompt copied or stored; regenerated on demand |
| `referenceLinks`     | `{ url, label }[]` (https only, max 10) | External references the user collected                  |

The entity itself supplies `title` (profile name), `labels` (includes `biome` and the reference name), `image` (user-attached picture), `lore` (the user's free notes) and the generated `content` (Markdown rendering).

### ReferenceSnapshot

`{ biomeId, name, capturedAt, conditions, landscape, vegetation, wildlife, resources, hazards, sourceIds, sources }`

- A **copy** of the reference values at the time of creation, including the resolved source records. A saved profile therefore still opens and exports correctly if the library changes or a biome is removed (spec edge case).
- Read-only after creation. The editor never writes into it.

### OwnFields

The user's version of each aspect. Each is free text with optional structured numbers where relevant.

| Field        | Type                                                                   | Maps to editable aspect |
| ------------ | ---------------------------------------------------------------------- | ----------------------- |
| `climate`    | `{ temperature?: Range, precipitation?: Range, seasonality?: string }` | Climate                 |
| `terrain`    | string                                                                 | Terrain                 |
| `vegetation` | string                                                                 | Vegetation              |
| `water`      | string                                                                 | Water availability      |
| `pressures`  | string                                                                 | Ecological pressures    |
| `notes`      | string                                                                 | Anything else           |

Each field starts **empty** when the profile is created from a reference, with the reference shown next to it. When the user edits a field, the diff against the snapshot is recorded as a _departure_ (derived, not stored). A field left empty means "same as the reference".

### Alteration

`{ id, aspect: "climate" | "terrain" | "vegetation" | "water" | "pressures" | "other", description: string, cause: string, effects: string[], aiAssisted?: boolean }`

- `description` required, `cause` optional (reminder only), `effects` optional.
- `aiAssisted` is true only when the user accepted at least one AI suggestion for that alteration. It is shown in the editor and not in exports.

## Derived views (not stored)

- **ComparisonMatrix**: rows = attributes (temperature, seasonality, precipitation, elevation, water, landscape, vegetation, wildlife, resources, hazards). Columns = selected biomes (2–3). Cells hold ranges or statements, or `"Doesn't apply"` where a biome has no value for that row.
- **Departure**: for each editable aspect, `{ aspect, referenceSummary, ownText, changed: boolean }`.
- **SearchResult**: the biome plus which fields matched, for the screen-reader result count.

## Validation rules

| Rule                                                                                                                            | Source                     |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Profile `title` is required and trimmed, 1–120 characters                                                                       | FR-021; story 4 scenario 4 |
| Duplicate titles are allowed and never overwrite; the list shows reference name and saved date to tell them apart               | Edge case                  |
| `referenceLinks` accept `https:` URLs only, max 10                                                                              | R10                        |
| Alteration `description` required; empty `cause` yields a **warning**, never an error                                           | FR-019                     |
| `own` text fields max 4,000 characters each; all strings are stored as plain text and rendered as text, never as HTML           | Safety                     |
| Attached image: existing entity image limits and formats apply, with a plain error on failure that leaves the profile unchanged | Edge case                  |
| The `biome` field is optional on `EntitySchema`; entities without it are unchanged                                              | Compatibility              |

## State transitions

```text
Library ──(Make my own / from blank)──▶ Draft (unsaved)
Draft ──Save──▶ Saved profile (entity exists)
Draft ──Save fails──▶ Draft (kept; retry or export offered)
Draft ──Discard (confirmed)──▶ Library
Saved profile ──Open──▶ Editing (a working copy)
Editing ──Save──▶ Saved profile (content re-rendered)
Saved profile ──Make a copy──▶ Draft (new profile, original untouched)
Saved profile ──Delete (confirmed)──▶ removed from the vault
```

## Relationships

- `BiomeProfile` → (optional) `ReferenceBiome` by `reference.biomeId`, but only through the snapshot. There is no live link.
- `BiomeProfile` lives inside one `Entity` (Note, `kind: "biome"`). Standard entity connections (graph links to locations, factions, and so on) work unchanged.
- No relationship to maps, hexes, settlements or creatures (follow-up #4290).
