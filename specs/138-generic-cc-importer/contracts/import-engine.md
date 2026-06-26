# Contract: Import Engine API

Public surface of `packages/importer/src/cc/index.ts`. The engine is a class with constructor DI and a default factory (Constitution VIII).

## Construction

```ts
class ImportEngine {
  constructor(deps: { writer: VaultWriter }, options?: ImportEngineOptions) {}
}

interface ImportEngineOptions {
  mappingRules?: MappingRuleSet; // default: { rules: [], defaultType: "note" }
  maxAssetBytes?: number; // default: 25 * 1024 * 1024
  acceptedVersions?: string[]; // default: ["1.0"]
}

// Production helper that wires the web VaultWriter binding:
function createImportEngine(
  writer: VaultWriter,
  options?: ImportEngineOptions,
): ImportEngine;
```

## Methods

### `parsePackage(input: unknown): ParseResult`

Validates raw (e.g. JSON-parsed) input against the package schema. Pure; no vault access.

```ts
type ParseResult =
  | { ok: true; value: CCImportPackage; warnings: ImportWarning[] }
  | { ok: false; errors: ValidationError[] };
```

### `prepare(pkg: CCImportPackage): Promise<ImportSession>`

Validates, applies deterministic type mapping, computes source refs, resolves links (in-package then vault via `findBySourceRef`), matches existing entities, and returns a curatable `ImportSession`. No writes occur. Reads the vault only through `writer.findBySourceRef`.

- Throws/returns error if the package fails validation (callers should `parsePackage` first or handle the rejection).
- Each `PreviewItem` carries `resolvedType`, `typeFallback`, `sourceRef`, `match`, and a default `decision`.

### Curation (caller mutates the session before commit)

The session exposes pure helpers (no I/O) so the UI/tests can set decisions:

```ts
setItemDecision(session, draftRef, "include" | "ignore"): ImportSession;
setMatchDecision(session, draftRef, "skip" | "create" | "update"): ImportSession;
```

(Implementation MAY use immutable updates returning a new session, or mutate in place — chosen impl documented in code; tests assert resulting decisions.)

### `commit(session: ImportSession): Promise<ImportReport>`

Requires explicit caller approval (calling `commit` IS the approval — FR-020; the UI gates the button). Writes through `writer`:

1. For each included item: `update` (matched + chosen update) or `create` (new / chosen create); record id by source ref. Skipped/ignored counted, not written.
2. Resolve relationship endpoints to committed ids; write one-directional connections on the `from` entity via `updateEntity`. Endpoints resolving to skipped/failed/uncreated entities → `unresolvedReferences`.
3. Route eligible assets through `saveAsset`; substitute placement refs in content; oversized/byte-less → `assetsSkipped`.
4. Build and return `ImportReport` with reconciling totals (SC-007).

Guarantees: no AI/network calls (FR-027); deterministic field output (SC-005); no dangling connections (FR-026); no automatic merge (FR-022).

## Error model

- Validation errors: returned, not thrown (`ParseResult`).
- Per-item commit failures: captured in `ImportReport.failures`, never abort the whole commit.
- Programmer errors (e.g. committing a session not produced by `prepare`): throw.
