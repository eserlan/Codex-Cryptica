# Quickstart: Missing-Data Visibility & Column-Level Filters

**Feature**: `1515-table-missing-filters`  
**Date**: 2026-08-14

## Manual Testing & Verification

1. **Open the Entity Table**:
   - Navigate to `/table` or click "Entity Table" in the activity bar.
2. **Test "Incomplete only" toggle**:
   - Click the "Incomplete" toggle in the table toolbar.
   - Observe that the table list narrows only to entities missing summary, labels, or connections.
   - Notice that empty cells are clearly styled to spot gaps.
3. **Test Column-Level Filtering**:
   - Filter the "Labels" column to "Untagged / No labels".
   - Notice only entities without any labels are displayed.
   - Add a global search term and notice results combine with AND logic.
4. **Test Filter Reset**:
   - Click "Clear all filters" in the toolbar.
   - Verify table returns to full list and pagination resets to Page 1.

## Automated Tests

Run unit and integration tests:

```bash
bun test apps/web/src/lib/components/explorer/__tests__/entityListFiltering.test.ts
bun test apps/web/src/lib/components/table/__tests__/
```
