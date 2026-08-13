# Quickstart: CIF Mechanical Importer, Phase 1 (143)

## Try it (once implemented)

1. `bun install && bun run dev` (app at `apps/web`).
2. Open a vault, go to **Settings → Import**, and select `schemas/cif/1.0/examples/valid-text-only.cif.json`.
3. Review opens: world title in the header, every entity listed with title + category + create decision. Confirm and check the vault: entities, labels, hierarchy, and relationships all present.
4. Re-select the same file: every entity now shows a **match** with update/skip options and a field diff; choosing skip everywhere changes nothing.
5. Feed it garbage: rename a `.txt` to `.cif.json`, duplicate an entity `key`, point a relationship at a missing key, or select a `.cif.zip` — each is refused with a message naming the record/rule, and no review opens.
6. Offline check: disconnect the network and repeat step 2–3 — identical behavior.

## Test-first development loop

```bash
# Library (pure functions — write these tests first)
bun test packages/importer

# Published-fixture parity (the public contract)
bun test packages/importer -- cif

# Web controller/UI tests
cd apps/web && bunx vitest run src/lib/components/settings src/lib/features/importer

# Gates before any commit (Constitution VI.3)
bun run lint && bun run test
```

Fixtures: start from the published examples (`schemas/cif/1.0/examples/`); add library fixtures for each invalid class (duplicate key, unresolved endpoint/parent, self-link, hierarchy cycle, unsupported version, oversized), unknown kinds/extensions, undirected + duplicate relationships, missing worldKey, dates at each precision, and a generated 1,000-entity manifest for SC-006.

## Key files

| Purpose                                                           | Path                                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| CIF schemas/types                                                 | `packages/importer/src/cif/package.ts`                                      |
| Container parsing + size guard                                    | `packages/importer/src/cif/parse.ts`                                        |
| Cross-record validation                                           | `packages/importer/src/cif/validate.ts`                                     |
| CIF → staging normalization                                       | `packages/importer/src/cif/normalize.ts`                                    |
| Engine extensions (updatePolicy, sourceRefBuilder, diff snapshot) | `packages/importer/src/cc/engine.ts`, `ports.ts`, `session.ts`              |
| Web writer (`getEntityFields`, `titleFallback`)                   | `apps/web/src/lib/features/importer/web-vault-writer.ts`                    |
| Detection + flow wiring                                           | `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts` |
| Public contract + fixtures                                        | `docs/CODEX_INTERCHANGE_FORMAT.md`, `schemas/cif/1.0/`                      |
| Contract for this feature                                         | `specs/143-cif-importer/contracts/cif-importer.md`                          |

## Acceptance spot-checks (map to spec)

- Valid fixture imports 100% of records → SC-001
- Each invalid class blocked pre-review, record named, vault untouched → SC-002
- Entire flow offline → SC-003
- Renamed entity still matches; skip-all re-import is a no-op → SC-004
- Every warning class appears in the report (no silent loss) → SC-005
- 1,000-entity manifest < 5 s, UI responsive → SC-006
- No dangling parent/relationship refs after cancel/failure → SC-007
- Update: prose replaced with visible diff, labels unioned, category preserved → US3 scenario 7
