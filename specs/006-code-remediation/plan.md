# Plan: Code Remediation

## Overview

This feature focuses on technical debt and architectural hardening. We will improve type safety for experimental browser APIs, robustify the data saving mechanism to prevent data loss, and optimize the graph visualization for better performance.

## User Impact

- **Reliability:** Reduced chance of "lost edits" when typing fast.
- **Performance:** Smoother graph experience with fewer jarring resets.
- **Development:** Safer codebase with fewer "any" types and suppressions.

## Proposed Changes

### Frontend (`apps/web`)

- **Type Safety:** Add `file-system.d.ts` to `src/types/` and reference it in `tsconfig.json` if needed (or just global scope).
- **Store Logic:** Replace `setTimeout` debounce in `vault.svelte.ts` with a dedicated task queue.
- **Graph View:** Optimization of the `$effect` block to be smarter about when to trigger expensive operations.
- **Theming:** New file `src/lib/themes/graph-theme.ts`.

## Risks

- **Graph Stability:** Changes to the graph update logic might introduce edge cases where the graph _doesn't_ update when it should. We need to test the "Connect Mode" and "Filter" scenarios carefully.
