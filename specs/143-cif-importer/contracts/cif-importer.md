# Contract: `@codex/importer` CIF API (143)

New public exports from `@codex/importer` (via `packages/importer/src/cif/index.ts`). All functions are pure (no I/O, no mutation of inputs) and fully client-side.

## `parseCifFile(input, options?): CifParseResult`

```ts
interface CifFileInput {
  fileName: string;
  size: number;
  text(): Promise<string>;
}
interface CifParseOptions {
  maxManifestBytes?: number; // default 20 * 1024 * 1024
}
type CifParseResult =
  | { ok: true; manifest: CifManifest }
  | { ok: false; errors: CifValidationError[] };
```

### Guarantees

1. **Never throws** on arbitrary input — malformed JSON, wrong extension, binary data all return `ok: false` with a coded, plain-language error.
2. `.cif.zip` filenames (and ZIP magic bytes in content) → `zip-not-supported` error with the FR-004 message; no partial parsing.
3. Files over `maxManifestBytes` → `oversized-manifest` error _before_ content parsing (FR-005).
4. A parsed object whose `format` is not the CIF literal → `not-cif`; unsupported `version` → `unsupported-version` naming both versions (US2 scenario 2).

## `validateCifManifest(manifest): CifValidationResult`

```ts
type CifValidationResult =
  | { ok: true; warnings: ImportWarning[] }
  | { ok: false; errors: CifValidationError[] };
```

### Guarantees

1. Enforces every cross-record rule the JSON Schema cannot: unique entity keys, unique relationship keys (when present), every `parent`/`from`/`to`/`media.assetKey` resolves in-package, `from !== to`, hierarchy acyclic (FR-002).
2. Every error carries `recordKey` where a record is identifiable (FR-003); hierarchy cycles name all member keys.
3. **Errors and warnings are disjoint**: a manifest with only warning-level findings (unknown kinds, extensions, assets present, missing worldKey) returns `ok: true` — warnings never block (FR-011/FR-012).
4. Terminates in O(records) regardless of hierarchy shape (iterative cycle walk, no recursion).

## `normalizeCifPackage(manifest): { pkg: CCImportPackage; warnings: ImportWarning[] }`

### Guarantees

1. **Field mapping** (clarified): `title`→`title`; `summary`→`content`; `content.body`→`lore`; `labels`→`labels` (deduped); `aliases`→`aliases` (deduped); `kind`→`sourceType`; `parent`→`parentRef` (sourceRef form); `dates`→`startDate`/`endDate`; legacy `tags` always `[]` (Constitution XII).
2. **Identity**: `sourceId` carries the encoded identity; the package is configured so the engine derives `cif:entity:<e(system)>:<e(worldKey|"")>:<e(key)>` — injective and kind-independent (FR-014). Missing `worldKey` adds `cif.no-world-key`.
3. **Relationships**: `directed: true` → one `RelationshipDraft`; `directed: false` → two reciprocal drafts; records identical in endpoints+kind+label are staged once with `cif.duplicate-relationship` (FR-013).
4. **Nothing disappears silently**: unmapped kinds, unknown extensions, non-empty `assets`, media entries, and unrepresentable date precision each emit their coded warning (FR-017); `sourceLabel` is the world title (FR-006 review header).
5. Output always passes `ImportEngine.parsePackage` — a CIF-valid manifest can never produce an engine-invalid staging package.

## CC-core extension contract (backward compatibility)

1. `ImportEngineOptions.sourceRefBuilder` and `updatePolicy` are optional; **omitting both reproduces today's behavior byte-for-byte** (chronica/scabard unaffected).
2. `updatePolicy: "cif"` patch rules (FR-015/FR-016): scalars replaced; `labels`/`aliases` unioned with `existing`; `type` never sent (kind change → `cif.kind-changed` warning); `parent` sent only when the draft provides one. When the writer lacks `getEntityFields`, the engine falls back to replace-scalars-only (still never sends `type`) and flags the diff as unavailable.
3. `VaultWriter.getEntityFields` is optional; `PreviewItem.existing` is only populated when it exists.
4. `appendConnection` returns `{ created: boolean }`; `created: false` increments `report.duplicatesSkipped` — existing writers updated in the same change (compile-enforced).
5. `WebVaultWriter` option `titleFallback: false` (CIF path) makes `findBySourceRef` exact-match only; default `true` preserves legacy adapters (FR-014 vs. backward compatibility).

## UI contract (informal, `apps/web`)

- Controller detection order: CIF (`.cif.json`/`.cif.zip` filename, or parsed `format === "codex-world-interchange"`) before chronica/scabard checks; `.cif.zip` → FR-004 refusal notice, never a review session.
- Review: world title + description shown in the session header; matched items render a current-vs-package field diff from `PreviewItem.existing`; cancel discards the session with zero vault mutations (FR-009).
- Report: renders `duplicatesSkipped` and all `cif.*` warning buckets; counts match FR-017.
- Test ids: `cif-import-error`, `cif-review-diff-{sourceRef}`, `import-report-duplicates`, plus existing review/report ids.
- No `fetch`/network call anywhere in the CIF path (FR-018) — enforced by a unit test asserting the library modules reference no network APIs and by running the E2E flow offline.
