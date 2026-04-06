# Quickstart: Import Progress Management

## Setup

1. **Verify Dependencies**: Ensure `idb` is available in `packages/importer`.
2. **Schema Update**: Add `import_registry` store to IndexedDB initialization in `apps/web/src/lib/utils/idb.ts`.

## Implementation Workflow

### Core Package (`packages/importer`)

1. Implement `calculateHash` in `utils.ts`.
2. Update `persistence.ts` to include `ImportRegistry` methods.
3. Modify the main import loop to check the registry before processing a chunk.

### Frontend (`apps/web`)

1. Create `import-queue.svelte.ts` store.
2. Implement `ImportProgress.svelte` component.
3. Integrate the progress bar into the existing Import modal/view.

## Testing

- **Unit**: `npm test -w packages/importer` (Hash generation, Registry purging).
- **E2E**: `npx playwright test` (Resume scenario, Restart button).
