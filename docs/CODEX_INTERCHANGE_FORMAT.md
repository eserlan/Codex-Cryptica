# Codex Interchange Format (CIF)

**Status:** Proposal

**Version:** 1.0 (draft)

**Audience:** tool authors, migration-script authors, and people preparing a world for Codex Cryptica

Codex Interchange Format (CIF) is a proposed, portable format for moving a
world and its relationships into Codex Cryptica. It is designed to be easy to
generate, inspect, validate, and migrate from other worldbuilding tools.

> CIF is not an upload format supported by Codex Cryptica yet. The current
> importer accepts documents for analysis and uses a separate internal staging
> model. Treat this document as the contract for a future mechanical importer,
> not as a promise that a `.cif` file can be uploaded today.

## Goals

- Preserve a world as entities, relationships, and assets without relying on
  Codex Cryptica's internal IDs or storage layout.
- Use Markdown for prose so exported content remains readable outside any one
  application.
- Retain source provenance to support repeat imports, updates, and clear
  conflict review.
- Allow source-specific data to survive a migration without making every
  importer understand it.
- Keep the core format small. Advanced features belong in optional modules,
  not in the first version of every importer.

## Package forms

Use one of these package forms:

| Form | Use when | Contents |
| --- | --- | --- |
| `.cif.json` | The world has no local binary files. | One UTF-8 JSON document. |
| `.cif.zip` | The world includes images, audio, maps, or other files. | `manifest.json` and an `assets/` directory. |

The JSON object described below is the package manifest. A text-only package
may use it directly as its `.cif.json` file. In a ZIP package it is stored as
`manifest.json`.

## Core manifest

Every manifest has this shape:

```json
{
  "format": "codex-world-interchange",
  "version": "1.0",
  "source": {},
  "world": {},
  "entities": [],
  "relationships": [],
  "assets": []
}
```

`format` must be exactly `codex-world-interchange`. `version` identifies the
format version, not the version of the program that generated the file.

### Source

The `source` object describes where this package came from. It is required so
an importer can recognize a later export of the same source world.

```json
{
  "system": "example-world-tool",
  "worldKey": "shattered-coast",
  "exportedAt": "2026-07-16T12:00:00Z"
}
```

- `system` is a stable identifier for the producing tool or script.
- `worldKey` is the producer's stable ID for this world, if it has one.
- `exportedAt` is an ISO 8601 timestamp.

Producers may add a `name`, `version`, or other non-sensitive context here.
Never put API keys, account tokens, or private file-system paths in a CIF
package.

### World

The `world` object holds information about the overall setting.

```json
{
  "title": "The Shattered Coast",
  "description": "A nautical fantasy campaign.",
  "labels": ["fantasy", "campaign"]
}
```

`title` is required. `description` and `labels` are optional. CIF uses the
term **labels** consistently; do not emit `tags` as a separate public concept.

## Entities

An entity is a person, place, faction, event, item, document, creature, or any
other piece of world knowledge. Every entity needs a package-local `key`.

```json
{
  "key": "characters/captain-lyra",
  "kind": "character",
  "title": "Captain Lyra Venn",
  "summary": "A privateer with a debt to the crown.",
  "content": {
    "format": "markdown",
    "body": "## Appearance\n\nLyra wears a weathered blue coat."
  },
  "labels": ["pirates", "captains"],
  "aliases": ["Lyra", "The Storm Wren"],
  "media": [{ "assetKey": "art/lyra.png", "role": "portrait" }],
  "source": {
    "id": "npc-42",
    "url": "https://example.invalid/npcs/42"
  }
}
```

### Entity rules

- `key` is required and must be unique within the package. Use a stable,
  readable identifier such as `characters/captain-lyra`; do not use a random
  destination UUID.
- `kind` is required. Common values include `character`, `location`, `faction`,
  `event`, `item`, `creature`, `document`, and `note`. A producing tool may use
  another meaningful value; an importer can map unknown kinds to a configured
  Codex Cryptica category and report that decision.
- `title` is required and should be a human-readable name.
- `summary` is optional, plain-text short description.
- `content.format` must be `markdown` in CIF 1.0. Put the full long-form text
  in `content.body`.
- `labels` and `aliases` are optional arrays of non-empty strings.
- `source.id` is the entity's stable ID in the producing system, if available.
  It is not a Codex Cryptica ID.

The optional `parent` field expresses a structural hierarchy and refers to
another entity key:

```json
{ "key": "places/salt-harbor/docks", "parent": "places/salt-harbor" }
```

Use a relationship, not `parent`, when the meaning is narrative or semantic
(for example, a faction controlling a city).

### Dates

Dates are optional and intentionally allow incomplete fictional dates:

```json
{
  "dates": {
    "start": { "value": "1142", "precision": "year" },
    "end": { "value": "1143-07-18", "precision": "day" }
  }
}
```

Valid precisions in CIF 1.0 are `year`, `month`, and `day`. A custom calendar
can be represented in an extension until a dedicated calendar module exists.

## Relationships

Relationships form the world graph. They refer to entities by package-local
keys, never by titles.

```json
{
  "key": "lyra-serves-crown-navy",
  "from": "characters/captain-lyra",
  "to": "factions/crown-navy",
  "kind": "serves",
  "label": "Privateer charter",
  "directed": true,
  "source": { "id": "relation-17" }
}
```

- `from`, `to`, and `kind` are required.
- Both endpoints must refer to existing entity keys.
- `directed` defaults to `true`. Set it to `false` for symmetric relationships
  such as `spouse_of` or `sibling_of`.
- `label` is optional explanatory text. Keep the machine-readable relationship
  in `kind`; do not encode it only in `label`.
- Relationship `key`s are optional but strongly recommended for repeatable
  updates and useful error reports.

## Assets and media

Assets are first-class package records. In a ZIP package, `path` is relative to
the package root and must stay inside `assets/`.

```json
{
  "key": "art/lyra.png",
  "path": "assets/lyra.png",
  "mediaType": "image/png",
  "sha256": "<hex-encoded SHA-256 digest>",
  "title": "Portrait of Captain Lyra"
}
```

An entity attaches an asset through its `media` array:

```json
{ "assetKey": "art/lyra.png", "role": "portrait" }
```

Useful media roles include `portrait`, `cover`, `map`, `illustration`, and
`attachment`. The asset `key` must be unique, and every `assetKey` must resolve
to an asset in the same package.

For a `.cif.json` package, use only publicly accessible URLs in an optional
`url` field. Do not embed base64 file data in the manifest.

## Extensions

Source-specific information may be retained under `extensions` at the world,
entity, relationship, or asset level:

```json
{
  "extensions": {
    "world-anvil": {
      "articleId": "12345",
      "template": "character"
    }
  }
}
```

Use a stable, producer-owned namespace as the property name. Consumers that do
not recognize an extension must ignore it safely and report it as preserved or
unsupported; they must not reject an otherwise valid core package.

## Complete example

```json
{
  "format": "codex-world-interchange",
  "version": "1.0",
  "source": {
    "system": "example-export-script",
    "worldKey": "shattered-coast",
    "exportedAt": "2026-07-16T12:00:00Z"
  },
  "world": {
    "title": "The Shattered Coast",
    "labels": ["fantasy", "campaign"]
  },
  "entities": [
    {
      "key": "characters/captain-lyra",
      "kind": "character",
      "title": "Captain Lyra Venn",
      "summary": "A privateer with a debt to the crown.",
      "content": {
        "format": "markdown",
        "body": "## Appearance\n\nLyra wears a weathered blue coat."
      },
      "labels": ["pirates"],
      "media": [{ "assetKey": "art/lyra.png", "role": "portrait" }],
      "source": { "id": "npc-42" }
    },
    {
      "key": "factions/crown-navy",
      "kind": "faction",
      "title": "The Crown Navy",
      "content": { "format": "markdown", "body": "The royal fleet." }
    }
  ],
  "relationships": [
    {
      "key": "lyra-serves-crown-navy",
      "from": "characters/captain-lyra",
      "to": "factions/crown-navy",
      "kind": "serves",
      "label": "Privateer charter",
      "directed": true
    }
  ],
  "assets": [
    {
      "key": "art/lyra.png",
      "path": "assets/lyra.png",
      "mediaType": "image/png",
      "sha256": "<hex-encoded SHA-256 digest>"
    }
  ]
}
```

## Validation checklist

Before distributing a package, validate that:

- The manifest is valid UTF-8 JSON and identifies CIF 1.0.
- Every entity key and asset key is unique.
- Every relationship endpoint and parent reference resolves to an entity.
- Every entity media reference resolves to an asset.
- Every ZIP asset path is relative, stays under `assets/`, and matches its
  declared SHA-256 digest.
- Required titles, keys, kinds, and Markdown content are present.
- No secrets or user-specific private paths are included in provenance or
  extensions.

## Import behavior in Codex Cryptica

When CIF support is implemented, Codex Cryptica should validate the complete
package before writing to a vault, show a review step for entity matches and
kind mappings, then create entities before connections and assets. A failed or
unmapped record should produce a clear report without silently discarding the
rest of the package.

The current internal importer already has analogous concepts—entity drafts,
relationship drafts, source references, review decisions, and an import
report. CIF is deliberately separate from that internal representation so
external authors do not need to depend on vault implementation details.
