# Quickstart: Oracle Store Decomposition

## 1. Directory Structure

```text
apps/web/src/lib/stores/
├── oracle.svelte.ts       # Main Facade
└── oracle/                # Internal Managers
    ├── ui-manager.svelte.ts
    ├── context-manager.ts
    ├── chat-manager.svelte.ts
    ├── action-manager.svelte.ts
    ├── settings-manager.svelte.ts
    └── reconciliation-manager.svelte.ts
```

## 2. Initialization Flow

1. Component imports `oracle` from `$lib/stores/oracle.svelte`.
2. `OracleStore` is instantiated as a singleton.
3. Constructor initializes all 6 managers, passing `this` to each.
4. Managers initialize their internal services (e.g., `ChatHistoryService`).

## 3. Development Guidelines

- **Adding State**: Add to the appropriate manager class using `$state`. Expose it via a getter on the Facade if it needs to be public.
- **Adding Logic**: Add to the appropriate manager. If it requires cross-manager state, use `this.store.<manager>.<property>`.
- **Testing**: Each manager has its own Vitest file in `apps/web/src/lib/stores/oracle/tests/`. Mock the `store` facade when testing individual managers.

## 4. Verification

Run the following to ensure no regressions:

```bash
pnpm test apps/web/src/lib/stores/oracle.svelte.test.ts
pnpm test apps/web/src/lib/stores/oracle/
```
