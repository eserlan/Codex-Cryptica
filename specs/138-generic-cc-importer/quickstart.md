# Quickstart: Generic CC Import Engine

How a developer (or an adapter author) uses the engine. The engine is headless and client-side; this example uses an in-memory writer so it runs in a test.

## 1. Build a CC import package

Normally a source adapter produces this. Here we hand-write one:

```ts
import type { CCImportPackage } from "@codex/importer";

const pkg: CCImportPackage = {
  version: "1.0",
  sourceSystem: "kanka",
  sourceLabel: "Kanka — Tales of Avaris",
  entityDrafts: [
    {
      sourceId: "12345",
      sourceType: "Character",
      title: "Sara Vane",
      content: "A river smuggler.",
      tags: ["pc"],
    },
    {
      sourceId: "678",
      sourceType: "Location",
      title: "Rivertown",
      content: "A wharf city.",
    },
  ],
  relationshipDrafts: [{ fromRef: "12345", toRef: "678", type: "located_in" }],
  assetDrafts: [],
  warnings: [],
};
```

## 2. Create the engine with a VaultWriter

```ts
import { ImportEngine } from "@codex/importer";

const engine = new ImportEngine(
  { writer: myVaultWriter }, // in tests: an in-memory fake
  {
    mappingRules: {
      rules: [
        { when: { sourceType: "Character" }, thenType: "character" },
        { when: { sourceType: "Location" }, thenType: "location" },
      ],
      defaultType: "note",
    },
  },
);
```

## 3. Prepare → preview

```ts
const session = await engine.prepare(pkg);

// Inspect what will happen — nothing written yet:
session.items.forEach((i) =>
  console.log(
    i.draft.title,
    "→",
    i.resolvedType,
    i.typeFallback ? "(fallback)" : "",
    i.match ? "already in vault" : "new",
  ),
);
session.relationships.forEach((r) =>
  console.log(r.draft.type, r.status, r.reason ?? ""),
);
```

## 4. Curate (optional)

```ts
import { setItemDecision, setMatchDecision } from "@codex/importer";

let s = setItemDecision(session, "678", "ignore"); // skip Rivertown
// for a matched item on re-import:
s = setMatchDecision(s, "12345", "update"); // field-level overwrite
```

## 5. Commit → report

```ts
const report = await engine.commit(s);

console.log(
  report.entitiesCreated,
  "created,",
  report.entitiesUpdated,
  "updated,",
  report.itemsSkipped,
  "skipped",
);
console.log("Unresolved links:", report.unresolvedReferences);
```

## What to verify (maps to acceptance)

- Created entities carry `discoverySource = "kanka:Character:12345"` etc. (FR-011, SC-002).
- Re-running `prepare` with the same package now reports each item as `match: { entityId }` (US3, SC-003).
- The `located_in` connection exists on **Sara only**, not on Rivertown (Clarification Q2, FR-016a).
- A relationship to a non-existent `toRef` appears in `report.unresolvedReferences`, and no connection is created (FR-015, SC-004).
- `entitiesCreated + entitiesUpdated + itemsSkipped + entity-stage failures === entityDrafts.length` (SC-007).
- No network/AI calls happen during `prepare`/`commit` (FR-027, SC-006).

## Running the tests

```bash
bun run --filter @codex/importer test     # or: cd packages/importer && bun test
bun run lint
```
