# Distributed Type-Safe Event Registry

## Overview

As Codex-Cryptica grows, a centralized `enum` or union type for all system events becomes a bottleneck. It creates circular dependencies (where the `events` package must import types from every other package) and becomes difficult to maintain.

The **Distributed Registry Pattern** leverages TypeScript's **Interface Merging** to allow any package to "plug in" its own events to the global bus without modifying the core `events` library.

---

## 1. The Core (`packages/events`)

The event bus defines a "blank" registry interface. The bus logic uses this interface as the single source of truth for event types and their associated payloads.

```typescript
// packages/events/src/types.ts

/**
 * Any package can extend this interface using 'declare module'
 */
export interface AppEventRegistry {
  // Initially empty or contains core system events
}

/**
 * Automatically generates a union of all events registered across the monorepo
 */
export type RegisteredEvent = {
  [K in keyof AppEventRegistry]: {
    type: K;
    domain: AppEventRegistry[K] extends { domain: infer D } ? D : string;
    payload: AppEventRegistry[K] extends { payload: infer P } ? P : any;
    metadata: AppEventMetadata;
  };
}[keyof AppEventRegistry];
```

---

## 2. The Domain Provider (`packages/vault-engine`)

When a new package (like the Vault) is created, it defines its own constants and "registers" them by extending the global interface.

```typescript
// packages/vault-engine/src/events.ts

export const VAULT_EVENTS = {
  ENTITY_UPDATED: "VAULT:ENTITY_UPDATED",
  SWITCHED: "VAULT:VAULT_SWITCHED",
} as const;

/**
 * Module Augmentation:
 * This tells TypeScript that these specific strings are now valid AppEvents
 */
declare module "@codex/events" {
  interface AppEventRegistry {
    [VAULT_EVENTS.ENTITY_UPDATED]: {
      domain: "vault";
      payload: { id: string; patch: any };
    };
    [VAULT_EVENTS.SWITCHED]: {
      domain: "vault";
      payload: { id: string };
    };
  }
}
```

---

## 3. The Consumer (`apps/web`)

Developers get full autocompletion and type checking without the `events` package ever knowing that the `vault` package exists.

```typescript
import { appEventBus } from "@codex/events";
import { VAULT_EVENTS } from "@codex/vault-engine";

// Autocomplete works for VAULT_EVENTS constants
appEventBus.subscribe(VAULT_EVENTS.ENTITY_UPDATED, (event) => {
  // event.payload is automatically typed to { id: string; patch: any }
  console.log(event.payload.id);
});
```

---

## Why This Works for Us

1.  **Zero Circular Dependencies**: The `events` package is a pure utility. It doesn't import from Vault, Oracle, or UI.
2.  **Plugin Architecture**: If we add a new "Plugin" package in the future, it can define its own events and the core app will "see" them instantly in the IDE.
3.  **Refactor Safety**: If you rename a key in `VAULT_EVENTS`, the TypeScript compiler will immediately flag every broken subscriber across the entire workspace.
4.  **Wildcard Compatibility**: Because we use a naming convention like `DOMAIN:ACTION`, our runtime wildcard logic (`vault:*`) remains simple and efficient while the types stay rigid.
