# Quickstart: World Timeline

## Implementation Steps

1. **Schema Update**:
   - Add `TemporalMetadata` and new entity fields to `packages/schema/src/index.ts`.
2. **Parsing Logic**:
   - Update `packages/editor-core/src/parsing/markdown.ts` to extract `date`, `start_date`, and `end_date` from frontmatter.
3. **Timeline Store**:
   - Implement `apps/web/src/lib/stores/timeline.svelte.ts` using Svelte 5 `$derived` to keep the timeline synced with the main `vault` store.
4. **Timeline View**:
   - Create `apps/web/src/routes/timeline/+page.svelte`.
   - Implement a vertical list grouped by Year or Era.
5. **UI Integration**:
   - Add a temporal metadata editor to `EntityDetailPanel.svelte`.
   - Add a "Timeline" link to the main app header.

## Validation

- Run `npm test --workspace=schema` to verify type safety.
- Create nodes with varying dates and verify sorting in the Timeline View.
- Offline Verification: Ensure timeline loads from OPFS/Local cache without network.
