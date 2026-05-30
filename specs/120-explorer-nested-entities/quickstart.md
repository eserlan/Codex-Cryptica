# Quickstart: Entity Explorer Hierarchy

This document outlines how to verify and test the Hierarchical Entity Explorer.

## Development Checklist

To verify the implementation of hierarchical nesting:

1. **Verify Schema Validation**:
   - Ensure Zod validates entities with the `parent` property.
   - Run: `bun run test packages/schema/`

2. **Verify Delete Promotion**:
   - Run `entities.test.ts` to ensure parent deletion promotes children to root and schedules their saves.
   - Run: `bun run test apps/web/src/lib/stores/vault/entities.test.ts`

3. **Verify UI Tree Rendering**:
   - Start local dev server: `bun run dev`
   - Open Sidebar Explorer.
   - Verify that adding a child nests it, collapses it, and search queries correctly keep parent paths visible.
