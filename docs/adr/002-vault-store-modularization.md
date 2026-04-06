# Modularization of Vault Storage Layer

- Status: accepted
- Deciders: Espen, Gemini CLI
- Date: 2026-02-12

## Context and Problem Statement

The original `VaultStore` in `vault.svelte.ts` had evolved into a "God Object," accumulating responsibilities for:

1.  **Active Data Management**: Entity CRUD, labels, and connections.
2.  **Global Registry**: Managing the list of available vaults and switching between them.
3.  **File I/O**: Direct interaction with OPFS and FSA APIs.
4.  **Relationship Adjacency**: Manually synchronizing a stateful `inboundConnections` map.
5.  **Service Integration**: Tight coupling with Search and AI services.

This complexity made the store difficult to maintain, prone to state-sync bugs (especially in connections), and extremely hard to unit test reliably.

## Decision Outcome

Chosen option: **Modular Domain-Driven Refactor**, because it cleanly separates concerns, guarantees state consistency through Svelte 5 runes, and enables robust testing via dependency injection.

### Key Changes

- **Split Logic**: Moved core logic into specialized modules (`registry.ts`, `entities.ts`, `relationships.ts`, `io.ts`, `assets.ts`, `migration.ts`).
- **Dedicated Registry**: Created `VaultRegistryStore` to handle vault-level metadata separately from entity-level data.
- **Derived Adjacency**: Converted `inboundConnections` to a `$derived` state, eliminating manual sync logic and associated bugs.
- **Dependency Injection**: Refactored `init()` to accept optional injected services, allowing for side-effect-free unit tests.
- **Standardized Mocks**: Implemented `createMockOpfs` and `createMockIDB` utilities for consistent test environments.

## Pros and Cons of the Options

### Modular Domain-Driven Refactor

- **Good**, because each file now adheres to the Single Responsibility Principle (SRP).
- **Good**, because `$derived` relationships ensure the graph adjacency map is always a "source of truth" calculation of the current entities.
- **Good**, because unit tests can now mock the filesystem and IndexedDB layers without "noisy" console errors or flaky timeouts.
- **Good**, because it decouples the "Active Vault" UI state from the "Vault List" management state.
- **Bad**, because it increases the total number of files in the project.
- **Bad**, because developers must now manage imports across multiple domain files rather than one central store.
