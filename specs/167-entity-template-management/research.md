# Research: Entity Template Management

## R-001: Canonical model (revised)

- **Decision**: A template is `{ id, name, entityType, markdown, version }`. The markdown body is stored and used exactly as written. The editor is a plain markdown text box.
- **Rationale**: The first design modelled sections (title, hint, order) and compiled them to markdown. In use that was more machinery than the job needs: a template is just the text a note starts with, and people already know markdown. Storing the text directly removes the compile and parse steps, the heading-injection risk, and the lossy round trip for built-in and legacy files. Nothing was released with the section model, so no migration is needed.
- **Alternatives**: Structured sections with a visual builder (the original plan; rejected as too complex). Reuse the stat sheet field model (typed value cells, wrong shape for prose). Typed fields remain a follow-up, and the stored object keeps unknown extra fields so they can be added without breaking existing files.

## R-002: Built-in and legacy templates

- **Decision**: Built-in and legacy templates carry their original markdown and are returned unchanged. Duplicating one copies that text into a new user template.
- **Rationale**: SC-004 requires byte-identical output for existing vaults, including empty legacy files. With markdown as the model there is nothing to convert.

## R-003: Built-in listing

- **Decision**: One built-in row per entity type: the theme-aware default for the vault's current theme, falling back to the generic template. Id `builtin:{type}`; the content resolves from the theme at read time.
- **Rationale**: Matches today's behaviour and avoids listing about ten theme variants per type.
- **Alternatives**: List every theme's variant (noisy). Freeze to generic only (regresses themed vaults).

## R-004: Resolution order

- **Decision**: Chosen default for the type, then the legacy file for the type, then the theme built-in, then the generic built-in, then blank. Implemented once as a pure function in the package.
- **Rationale**: FR-018. A user who picks a default expects it to win over a stray legacy file, and a legacy file still wins over built-ins as it does today.
- **Alternatives**: Legacy before the chosen default (makes the choice ineffective).

## R-013: Legacy file precedence

- **Decision**: Legacy `{type}.md` files are read with today's precedence: the linked local folder when one exists, otherwise the vault's own directory. `.cc/templates` is checked before `.codex/templates` in whichever location is used. The two locations are never merged.
- **Rationale**: Today's callers pass `folderHandle ?? vaultHandle`. Merging both would change output for some vaults and break SC-004.

## R-005: Storage location and linked-folder sync (risk)

- **Decision**: Write user templates to `.codex/templates/{id}.json` and defaults to `.codex/templates/defaults.json` in the vault's OPFS directory, using `writeOpfsFile`, matching `stores/vault/io.ts` (`publish-registry.json`, `maps.json`, `canvases/`).
- **Rationale**: User decision; follows the established `.codex/` metadata convention; portable and inspectable.
- **Checked (T048)**: The sync backends in `packages/sync-engine/src` (`FileSystemBackend`, `OpfsBackend`, `SyncPlanner`, `LocalSyncService`) and `walkOpfsDirectory` contain no dot-directory filtering, so `.codex/templates/*.json` is treated like `.codex/canvases/*.canvas`, which already syncs. This is a code-reading result; it has not been exercised against a real linked folder, so quickstart step 11 stays as a manual check.
- **Fallback**: If it does not propagate, templates still work from OPFS. Legacy `.md` reads keep using the linked folder handle. Document the limitation in help text rather than adding a second store.

## R-006: Sync resolver for the AI engine

- **Decision**: `EntityTemplateStore` keeps an in-memory snapshot after `loadForVault`. `resolveSync(type, themeId)` reads only that snapshot. `app-init.ts` passes it to `configureAIEngine`. Before a vault loads, it falls back to `resolveTemplateSync`.
- **Rationale**: The AI resolver type is synchronous (`TemplateResolver`), so no file I/O is possible on that path.
- **Alternatives**: Make the resolver async (touches the ai-engine contract and every caller for no user gain).

## R-007: Service compatibility

- **Decision**: Keep `EntityTemplateService.resolveTemplate(type, themeId?, dirHandle?)` and `extractSummary`, delegating to the store. The handle argument stays for compatibility and only matters when the store has not loaded yet (falls back to the current logic).
- **Rationale**: Existing tests and mocks in `VaultControls`, `MobileCreateEntitySheet` and `RelatedEntityModal` keep working; the `RelatedEntityModal` bug is fixed because the store is vault-scoped and needs no handle.
- **Alternatives**: Change every caller's signature (more churn in files over 500 lines).

## R-008: Identity

- **Decision**: User template ids come from the injected id generator (`runtime-deps`); ids are stable across rename. Imported templates always get a new id.
- **Rationale**: Prevents silent overwrite (FR-013), keeps the default pointer valid after rename, and stays deterministic in tests.

## R-009: Package format and marketplace readiness

- **Decision**: A Template Package is JSON `{ kind: "entity-template", formatVersion: 1, template: {...} }`, validated on import with Zod. It contains no vault-specific state (no defaults, no source).
- **Rationale**: FR-014, FR-025. A future marketplace listing (#3548) can wrap it unchanged. Unknown `formatVersion` is rejected with a plain message, and unknown extra fields inside sections are preserved so typed fields can be added later.

## R-010: Read-only contexts

- **Decision**: The store exposes `canEdit`, false in guest mode or when no writable vault handle exists. The UI hides mutating actions and shows one explanation line.
- **Rationale**: FR-021. The guest vault is read-only and has no OPFS directory.

## R-011: Concurrency and failures

- **Decision**: Last write wins. Each save writes the template file first, then updates the in-memory list; a failed write leaves the list unchanged and surfaces a notification. Malformed files are skipped and reported once per load.
- **Rationale**: FR-022, edge cases. Templates are small and rarely edited concurrently, so locking is not warranted (YAGNI).

## R-012: Validation rules

- **Decision**: Name non-empty, single line, at most 80 characters; entity type present; body at most 50,000 characters. An empty body is valid (a blank note).
- **Rationale**: FR-011. The size cap bounds imports and file reads; a name with a line break would break the list.
