# Research: Data Integrity At Trust Boundaries

## 1. Zod Validation for YAML and IndexedDB

**Decision**: Use `zod` schema validation in `packages/schema` to parse frontmatter during imports, and to validate DB records when loading from `idb`.

**Rationale**: `zod` is already in the project's dependencies and provides excellent TypeScript inference, eliminating the need to maintain parallel types and validation logic. Using it ensures malformed entities are caught early and gracefully.

**Alternatives considered**:

- Custom `type-guards`: Harder to maintain and less declarative.
- `yup` or `joi`: Not currently standard in the repo, Zod is preferred for modern TS.

## 2. IndexedDB Migration Rollbacks

**Decision**: Implement a pre-migration hook wrapping our database initialization logic. Before calling the `idb` upgrade mechanism for a new `DB_VERSION`, we export a full OPFS zip snapshot (using existing sync-engine capabilities if possible, or manual blob snapshot) and log it in a new `migration_log` store inside the DB (or a separate meta-DB if necessary to avoid chicken-and-egg issues).

**Rationale**: Native `idb` `upgrade` callbacks do not support asynchronous external backups within the transaction natively without blocking, but we can intercept the open process _before_ bumping the version by checking the current version first.

**Alternatives considered**:

- Doing nothing: Leaves users vulnerable to data loss on bad migrations.
- Server-side backups: Violates local-first privacy principles.

## 3. Import Settings File Type Checks

**Decision**: Add strict `.md` and other supported extension checks in `ImportSettings.svelte` or the underlying `importer` service before invoking the parsing logic.

**Rationale**: Prevents accidental import of media or binary files into the text parsing engine, which could crash the client.
