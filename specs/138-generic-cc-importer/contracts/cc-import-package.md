# Contract: CC Import Package Format (v1.0)

The serialisable contract every source adapter (#1536–#1544) produces and the engine consumes. Plain JSON-compatible data except `AssetDraft.bytes` (binary). Defined with `zod` in `packages/importer/src/cc/package.ts`; the schema is the single source of truth, the shape below is its documentation.

## Shape

```ts
interface CCImportPackage {
  version: "1.0";
  sourceSystem: string; // machine id, e.g. "kanka"
  sourceLabel: string; // human label, e.g. "Kanka — Tales of Avaris"
  entityDrafts: EntityDraft[];
  relationshipDrafts: RelationshipDraft[];
  assetDrafts: AssetDraft[];
  warnings: ImportWarning[];
}

interface EntityDraft {
  sourceId?: string; // sourceId OR sourcePath required
  sourcePath?: string;
  sourceType?: string; // declared type; absent ⇒ note fallback
  title: string; // required, non-empty
  content?: string; // markdown, default ""
  lore?: string;
  tags?: string[]; // default []
  metadata?: Record<string, unknown>;
  parentRef?: string; // source id/path of parent
}

interface RelationshipDraft {
  fromRef: string; // source id/path
  toRef: string; // source id/path
  type?: string; // default "related_to"
  label?: string;
}

interface AssetDraft {
  id: string; // unique within package
  bytes?: Blob | Uint8Array; // missing ⇒ skipped with warning
  originalName: string;
  mimeType: string;
  placementRef: string; // entity sourceId or in-content ref token
}

interface ImportWarning {
  code: string; // e.g. "DUPLICATE_SOURCE_ID"
  message: string;
  ref?: string;
}
```

## Validation contract (FR-006, FR-007)

`validatePackage(pkg): { ok: true; value: CCImportPackage } | { ok: false; errors: ValidationError[] }`

- Rejects when `version` is missing/unknown, required fields are absent, or any draft is structurally invalid.
- Collects **all** errors (not first-only); each `ValidationError` has `{ path, code, message, ref? }`.
- A draft with neither `sourceId` nor `sourcePath` is invalid.
- Duplicate `sourceId` across `entityDrafts` is a **warning** (`DUPLICATE_SOURCE_ID`), not a rejection.
- Any field instructing a direct vault write / non-draft mutation ⇒ rejection (FR-028).

## Determinism contract (FR-012, SC-005)

Given identical `(package, MappingRuleSet, vault state)`, the engine yields identical entity field values, source refs, connection targets, and report counts. Only freshly generated entity ids and the report `committedAt` timestamp may differ between runs.

## Adapter obligations

- Adapters MUST set stable `sourceId`/`sourcePath` values (used for repeat-import matching).
- Adapters MUST NOT write to the vault; they only return a `CCImportPackage`.
- Adapters MAY pre-populate `warnings` (e.g. lossy conversion notes); the engine carries them through.
