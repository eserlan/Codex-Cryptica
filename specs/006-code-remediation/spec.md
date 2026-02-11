# Code Remediation & Architecture Hardening

## Background

A recent expert architectural review identified several key areas for improvement in the `Codex-Arcana` codebase. While the project successfully adopts Svelte 5 and a modular architecture, there are critical gaps in type safety, data persistence reliability, and graph visualization performance that need to be addressed to ensure scalability and stability.

## Objectives

1.  **Harden and Type Local-First Storage:** Ensure the new OPFS-based storage is robust and type-safe.
2.  **Harden Persistence Layer:** Replace the fragile `setTimeout` save mechanism with a robust, sequential write queue to prevent race conditions.
3.  **Optimize Graph Rendering:** Prevent unnecessary and expensive full graph re-layouts when minor state changes occur.
4.  **Standardize Themes:** Extract hardcoded visual styles from components to improve maintainability.

## Implementation Plan

### 1. OPFS Storage Hardening

- **Goal:** Ensure full type safety and reliability for the new OPFS storage layer.
- **Action:** The migration to OPFS has largely resolved the original `NoModificationAllowedError` and brand-check issues. The primary action is to ensure all interactions with the OPFS handles are correctly typed within the `vault.svelte.ts` and `opfs.ts` utilities.
- **Success Criteria:** Removal of all `@ts-expect-error` comments related to file system operations in `VaultStore.svelte.ts`.

### 2. Robust Write Queue (Persistence)

- **Goal:** Prevent data races during rapid edits.
- **Action:**
  - Implement a `AsyncQueue` class that serializes async operations.
  - Refactor `VaultStore.saveToDisk` to push save operations into this queue keyed by file ID.
  - Ensure that a new save request for the same file overwrites or chains after the pending one.

### 3. Graph Performance Optimization

- **Goal:** Incremental updates without jarring re-layouts.
- **Action:**
  - Refactor the `$effect` in `GraphView.svelte`.
  - Separate "Data Sync" (adding/removing elements) from "Layout Execution".
  - Only trigger a full layout if the node count changes significantly or on initial load. For minor updates (e.g., label changes), update data in place.

### 4. Theme Extraction

- **Goal:** Clean up component logic.
- **Action:** Move `SCIFI_GREEN_STYLE` from `GraphView.svelte` to `apps/web/src/lib/themes/graph-theme.ts`.

## Verification

- **Type Check:** `npm run lint` should pass with zero file system related type errors.
- **Load Test:** Rapidly typing in the editor should result in consistent file writes without errors.
- **Graph Test:** Adding a new node should smoothly appear; editing a title should not reset the graph layout.
