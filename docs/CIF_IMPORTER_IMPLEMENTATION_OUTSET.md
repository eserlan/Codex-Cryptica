# CIF Importer Implementation Outset

**Status:** Pre-specification design outset

**Related format:** [Codex Interchange Format (CIF)](./CODEX_INTERCHANGE_FORMAT.md)

**Tracking issue:** [#1722](https://github.com/eserlan/Codex-Cryptica/issues/1722)

**Audience:** Codex Cryptica maintainers preparing an implementation spec

This document turns the proposed external [Codex Interchange Format
(CIF)](./CODEX_INTERCHANGE_FORMAT.md) into an implementation boundary for
Codex Cryptica. It is deliberately not a feature specification: it identifies
the decisions, constraints, and work that a future spec must settle before
implementation begins.

## Outcome

Codex Cryptica can import a validated `.cif.json` or `.cif.zip` package into a
chosen local vault through the existing review-and-merge workflow. The import
is client-side, resumable where practical, and produces a clear report of what
was created, updated, skipped, or could not be imported.

The importer must not expose CIF as supported until its core records,
relationships, and supported asset roles can be imported without silent data
loss.

## Existing foundations

The current importer package already provides useful building blocks:

| Existing capability | Location | CIF use |
| --- | --- | --- |
| Versioned, validated import staging package | `packages/importer/src/cc/package.ts` | Target model after a CIF package is parsed and normalized. |
| Review session, create/update/skip choices | `packages/importer/src/cc/session.ts` | Reuse for duplicate matching and import review. |
| Two-phase entity then relationship commit | `packages/importer/src/cc/engine.ts` | Preserve the endpoint-safe commit order. |
| Stable source-reference matching | `packages/importer/src/cc/source-ref.ts` | Make repeated CIF imports identifiable. |
| Web vault adapter | `apps/web/src/lib/features/importer/web-vault-writer.ts` | Extend to persist supported CIF assets and attach them to entities. |
| Source-specific adapters | `chronica.ts`, `scabard.ts` | Follow the same adapter pattern without coupling CIF to a source system. |

Two gaps define the initial scope:

1. The published JSON Schema defines the CIF 1.0 structure, but there is no
   CIF parser, cross-record validator, or adapter yet.
2. The web vault writer explicitly reports generic asset persistence as
   unsupported. CIF assets cannot be advertised until that path is designed
   and implemented.

## Proposed architecture

Keep parsing, validation, normalization, and mapping inside the importer
workspace package. The Svelte app should only select a file, display review
state, and supply the vault writer adapter.

```text
.cif.json / .cif.zip
        |
        v
parse container + enforce size/path limits
        |
        v
validate CIF schema + cross-record references
        |
        v
normalize CIF → CCImportPackage
        |
        v
existing ImportEngine.prepare()
        |
        v
existing review UI: create / update / skip
        |
        v
existing ImportEngine.commit()
        |
        +--> entities and relationships
        +--> web vault asset persistence and entity attachment
```

The core new library surface should live under
`packages/importer/src/cif/` and be exported from `@codex/importer`:

```text
packages/importer/src/cif/
  package.ts       # Zod schemas and public CIF types
  validate.ts      # structural and cross-record validation
  parse.ts         # JSON plus ZIP container parsing
  normalize.ts     # CIF → CCImportPackage mapping
  report.ts        # CIF-specific warnings and loss/mapping decisions
  *.test.ts
```

This maintains the constitution's library-first rule and allows source-tool
adapters to produce CIF without importing application code.

The implementation should use
[`schemas/cif/1.0/manifest.schema.json`](../schemas/cif/1.0/manifest.schema.json)
as the public structural contract. It must add code-level validation for rules
that JSON Schema cannot express cleanly: package-local key uniqueness,
cross-record references, archive file presence, safe paths, and digest checks.

## Import contract

### Parse before writing

The implementation must fully parse and validate the manifest before it opens
an import review session or mutates a vault. For ZIP packages, it must reject:

- archives exceeding configured compressed or extracted-size limits;
- duplicate file paths;
- absolute paths or `..` traversal in asset paths;
- an asset entry outside `assets/`;
- an asset missing from the archive or whose SHA-256 does not match; and
- unsupported compression or malformed archive data.

Package-level failures should stop the import with actionable messages. A
valid package with an unmapped kind or unknown extension should enter review
with a warning instead.

### Stable identity and repeat imports

For each entity, derive the existing importer source reference from the CIF
package source and entity key. A suggested canonical form is:

```text
cif:<source.system>:<source.worldKey>:<entity.key>
```

The future specification must settle how escaping is handled, or move this to
a structured source-reference format before CIF support ships. It must not use
titles for primary matching; titles are ambiguous and may change.

On re-import, matching source references should offer **update**, **skip**, or
**create** decisions. The review must say which records match an existing
entity and which package fields an update can change.

### Mapping to CC entities

The normalizer maps CIF's external model into the current `CCImportPackage`:

| CIF field | Current target | Decision needed in the spec |
| --- | --- | --- |
| `entity.key` | `EntityDraft.sourceId` | Preserve the raw key and generate a collision-safe source reference. |
| `entity.kind` | `EntityDraft.sourceType` | Define built-in mappings and how users choose a category for unknown kinds. |
| `title` | `title` | Direct mapping. |
| Markdown body | `content` | Direct mapping; decide where optional `summary` is shown or stored. |
| `labels` | `labels` | Direct mapping; do not introduce a new public `tags` concept. |
| `parent` | `parentRef` | Resolve to the created CC entity ID before persistence, rather than storing a package key. |
| `relationships` | `RelationshipDraft` | Resolve endpoint keys after entity creation. |
| `source` | `discoverySource` | Preserve package identity for repeat import. |
| `media` and `assets` | asset persistence + entity fields/content | Define supported roles and deterministic attachment behavior. |

`CCImportPackage` is an internal staging model, not the external CIF contract.
The normalizer may extend it where necessary, but external authors must never
need to construct its `sourcePath`, `sourceType`, or Blob-based asset drafts.

### Relationship semantics

Existing CC connections are directed records stored on the source entity.
For CIF relationships:

- import `directed: true` as one connection;
- import `directed: false` as two reciprocal connections, unless the future
  connection model gains a native symmetric representation;
- preserve `kind` as the connection type and `label` as explanatory text; and
- avoid duplicate connections based on source, target, type, and label.

The spec must decide whether relationship identities/provenance need their own
persistent storage. Without it, repeat updates can add or preserve links but
cannot reliably distinguish one otherwise identical source relationship from
another.

### Assets and media

This is the largest intentionally open design area. The implementation spec
must define:

- the vault storage API used to write bytes locally;
- accepted MIME types and per-file, total-package, and image-dimension limits;
- how MIME type is verified rather than trusted from the manifest;
- whether an asset hash deduplicates files already in the vault;
- the destination and lifetime of a stored asset reference;
- how `portrait`, `cover`, `map`, `illustration`, and `attachment` affect an
  entity (`image`, `thumbnail`, Markdown links, or a new media field); and
- rollback or cleanup behavior if an asset write fails after entities exist.

The importer should attach an asset only after the asset bytes are successfully
stored. It must report a failed attachment per entity; it must not display a
path that does not resolve in the vault.

## Suggested delivery phases

### Phase 1 — Text-only CIF foundation

Deliver `.cif.json` packages containing world metadata, entities, labels,
Markdown content, hierarchy, and relationships. No ZIP or assets.

Success criteria:

- invalid structure and unresolved keys never reach the review UI;
- valid entities and relationships complete through the existing review flow;
- repeated import offers stable source-reference matches; and
- no network request is required to parse or import a text-only package.

### Phase 2 — ZIP and assets

Add bounded ZIP parsing, asset verification, browser-local storage, and
role-based attachment. Keep the full package local to the browser.

Success criteria:

- traversal, size-limit, hash-mismatch, and unsupported-media failures are
  safely rejected or reported;
- a valid portrait imports, is persisted, and renders on its attached entity;
- an asset failure leaves clear report data and no broken media reference; and
- cancellation stops remaining work safely.

### Phase 3 — Fidelity and interoperability

Add optional modules only after the core package is stable: custom calendar
dates, map data, category definitions, and supported source-tool extensions.

Each module needs its own versioning, validation, loss report, and tests. It
must not make a core CIF 1.0 package invalid.

## Testing and quality gates

The implementation is a library feature and must be test-first. At minimum,
add tests for:

- valid text-only package parsing and CIF-to-staging normalization;
- the published valid fixture passing JSON Schema validation and the published
  invalid fixture failing it;
- invalid manifest shapes, duplicate keys, missing references, and self-links;
- source-reference stability across two imports;
- create, update, skip, and cancellation behavior through `ImportEngine`;
- unknown entity kinds and extensions producing warnings rather than data loss;
- ZIP path traversal, duplicate paths, over-limit packages, corrupt archives,
  missing assets, and checksum mismatch;
- a successful asset write and attachment; and
- a failed asset write that produces a report and no broken entity media.

Run the repository quality gates required by the constitution: `bun run lint`
and `bun run test`.

## Privacy and security requirements

- Parse, hash, validate, and import package contents client-side.
- Treat every package, manifest field, archive path, and media type as
  untrusted input.
- Never fetch arbitrary URLs automatically during import. Remote asset URLs
  require an explicit future policy and user acknowledgement.
- Never send package contents to the Oracle or any third party merely to
  validate or mechanically import CIF.
- Do not log full imported content, private source URLs, or binary data in
  telemetry or error reports.

## Decisions required before specification

1. What is the exact source-reference encoding and escaping rule?
2. Should `summary` be stored as a first-class CC field, added to Markdown, or
   omitted with a visible loss warning?
3. How should CIF hierarchy resolve to CC's `parent` field after entity IDs are
   assigned?
4. Which media roles ship in the first asset-enabled release, and where does
   each role persist?
5. Which local storage API owns imported binaries and their lifecycle?
6. How should an update import reconcile removed relationships and assets:
   preserve, remove after confirmation, or only add/change?
7. What package and per-asset size limits work on the supported browser and
   device range?
8. Is calendar/map/category fidelity in scope for CIF 1.0, or explicitly a
   follow-up module?

## Definition of ready for a feature spec

This outset is ready to become a feature specification when the decisions
above are answered, the v1 core schema is frozen, and a user journey is chosen
for file selection, preflight errors, review, progress, cancellation, and the
final import report. The resulting spec should keep Phase 1 independently
deliverable; assets should not block a safe text-only mechanical importer.
