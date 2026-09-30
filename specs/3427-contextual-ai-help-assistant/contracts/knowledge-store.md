# Contract: Knowledge Store & Sync (Design Only)

**Status**: Designed for the findings deliverable. Not deployed in the spike (see research D1). Adopt when any trigger holds: > ~2,000 chunks, bundle > ~1 MB, lexical recall@3 < 0.85 on the evaluation set, or content must update without a Worker deploy.

## D1 schema (per environment)

```sql
CREATE TABLE knowledge_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commit_sha TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('production','staging')),
  synced_at TEXT NOT NULL
);
CREATE TABLE knowledge_documents (
  id TEXT PRIMARY KEY,              -- sourceId, e.g. connections-tab | registry:entity-connections
  kind TEXT NOT NULL,               -- help | registry
  title TEXT NOT NULL,
  feature_id TEXT,
  route TEXT,
  content_hash TEXT NOT NULL,
  version_id INTEGER NOT NULL REFERENCES knowledge_versions(id)
);
CREATE TABLE knowledge_chunks (
  id TEXT PRIMARY KEY,              -- <documentId>#<n>
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_version TEXT
);
CREATE INDEX idx_chunks_document ON knowledge_chunks(document_id);
CREATE INDEX idx_documents_feature ON knowledge_documents(feature_id);
```

Migrations live with the Worker's existing `migrations_dir`; content rows are never part of a schema migration.

## Vectorize

- Index per environment: `cc-help-staging`, `cc-help-prod`; dimension/metric follow the chosen embedding model (Workers AI `@cf/baai/bge-base-en-v1.5`, 768, cosine, evaluated offline first).
- Vector ID = chunk ID. Metadata (filterable): `documentId`, `featureId`, `kind`, `route`, `channel`, `commit`. No text in metadata; D1 is authoritative for content.
- Query: filter by `channel`, optional `featureId`; then re-rank with live-context boosts (same function as the lexical path: feature +0.20, route +0.15, entity kind +0.10, tab +0.05).

## Chunking

Markdown split on `##` headings; chunks ≤ ~450 tokens with heading prepended; registry entries yield one summary chunk plus one per workflow. Stable IDs from source ID + index; hash from normalised text.

## Sync workflows (recommendation: two workflows)

1. **Schema** (`d1 migrations apply`) — runs on changes to `migrations/` only.
2. **Knowledge sync** — runs after a successful app/Worker deploy when `apps/web/src/lib/content/help/**`, `packages/help-engine/src/registry/**`, or bundle code changed:
   parse → chunk → hash → diff against D1 (by `content_hash`) → upsert changed chunks → embed changed chunks → upsert Vectorize → delete stale chunk IDs and vectors → insert `knowledge_versions` row with commit SHA.

Separate because documentation edits are frequent and must not gate on, or risk, schema changes. Idempotent and re-runnable; failed runs leave the previous version serving.

## Stale/deletion handling

Sync computes the set difference between bundle chunk IDs and D1; missing IDs are deleted from D1 and Vectorize in the same run. A chunk whose document has `channel` downgraded is also removed.

## Isolation

Separate D1 and Vectorize per environment; staging-only entries carry `channel: staging` and are never synced to production. Each version row records the commit.

## Cost/ops notes

Embeddings are computed per changed chunk only (incremental). At the PoC corpus size this is cents per sync; the operational cost is two resources per environment and one workflow, which is why it is deferred until measured need.
