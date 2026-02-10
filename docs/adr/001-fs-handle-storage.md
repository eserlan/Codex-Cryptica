# ADR 001: File System Handle Storage Strategy

- **Status:** Proposed
- **Date:** 2026-02-10
- **Context:** Svelte 5 / File System Access API Interaction

## Context and Problem Statement

In Svelte 5, all properties within a `$state` object are wrapped in JavaScript Proxies to enable fine-grained reactivity. The File System Access API (used for local vault persistence) is a security-sensitive native API that performs "brand checks" on objects passed to its methods (e.g., `createWritable`, `getFileHandle`).

On mobile browsers (Chrome Android) and certain Linux builds, these brand checks fail when a Proxy is passed instead of the raw `FileSystemHandle` object, resulting in `NoModificationAllowedError` or generic `TypeErrors`.

### Current Implementation

We currently store `rootHandle` and entity `_fsHandle` objects directly in `$state`. To fix the errors, we must call `$state.snapshot(handle)` before every single native API call.

## Decision Drivers

1.  **Reliability:** We must ensure 100% write success on mobile devices.
2.  **Maintainability:** Avoid "Snapshot Boilerplate"—the risk of a developer forgetting to snapshot a handle in a new feature is high.
3.  **Performance:** Proxies add overhead; there is no benefit to making the internal structure of a native Handle reactive.

## Considered Options

### Option 1: Reactive Handles + Explicit Snapshots

Keep handles in `$state` and use `$state.snapshot()` manually.

- **Pros:** Requires no major refactoring of the store structure.
- **Cons:** Extremely brittle. Forgetting one snapshot leads to silent "read-only" failures in production.

### Option 2: Use `browser-fs-access` Library

Integrate a third-party wrapper for the File System Access API.

- **Pros:** Better fallbacks for older browsers (e.g., Safari).
- **Cons:** Does not solve the Svelte Proxy problem. If the library's returned handles are put into `$state`, the brand-check issue remains.

### Option 3: Private Non-Reactive Handle Storage (Decision)

Move all native `FileSystemHandle` objects into private class fields (`#rootHandle`) or a non-reactive weak map. Expose only primitive metadata (name, path, authorization status) via `$state`.

- **Pros:** **Guaranteed success.** The handles never touch the Svelte reactivity system, so they are never proxied. Brand checks will always pass.
- **Cons:** Requires refactoring the `VaultStore` to separate "Handle Logic" from "UI State Logic."

## Decision Outcome

**Decision: Option 3 (Private Non-Reactive Storage)**

We will refactor `VaultStore` to store the raw `FileSystemDirectoryHandle` in a private field. We will also move entity handles into a non-reactive "Handle Registry" (a Map or WeakMap).

### Implementation Plan

1.  **Refactor `VaultStore`:** Change `rootHandle` from a `$state` property to a private `#rootHandle`.
2.  **State Synchronization:** Use a reactive `isAuthorized` boolean and `vaultName` string for the UI.
3.  **Handle Registry:** Store entity-to-handle mappings in a plain JavaScript `Map` that is not part of the reactive state.
4.  **Remove Snapshots:** Delete all `$state.snapshot()` calls once the handles are no longer reactive.
