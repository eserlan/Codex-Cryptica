# Distributed Type-Safe Event Registry

## Status

Proposal. This should be implemented through the normal Speckit flow before code changes:

1. Update the feature spec, plan, contracts, and tasks under `specs/094-app-event-bus/`.
2. Add type-level and runtime tests that fail against the current centralized union.
3. Implement the registry pattern in `packages/events`.
4. Move domain event definitions into the packages that own those domains.

## Overview

The current `AppEvent` model is a centralized discriminated union in `packages/events`.
That works while the event list is small, but it does not scale well:

- `packages/events` becomes responsible for event payloads owned by other packages.
- Adding new domain packages requires editing the core event package.
- Eventually, the core package either imports domain types and creates circular dependencies, or it uses `any` and loses type safety.

The recommended direction is a distributed registry pattern using TypeScript module augmentation. The core `events` package defines the event bus contract and an empty registry. Domain packages extend that registry with the event types and payloads they own.

This keeps `packages/events` library-first and dependency-free while preserving typed `emit()` and `subscribe()` calls in consumers.

## Design Goals

- Keep `packages/events` independent from Vault, Oracle, Graph, UI, Sync, and future plugin packages.
- Make event payloads type-safe at both emit and subscribe call sites.
- Keep wildcard subscriptions compatible with the current runtime behavior.
- Require explicit event ownership by package.
- Avoid `any` fallbacks in the core API.
- Keep the runtime bus simple; the registry is a compile-time contract, not a runtime plugin loader.

## 1. Core Package Contract

`packages/events` owns the metadata envelope, base registry shape, generated event helpers, and the `AppEventBus` implementation.

```typescript
// packages/events/src/types.ts

export interface AppEventMetadata {
  sync?: boolean;
  timestamp: number;
  remote?: boolean;
  vaultId?: string;
}

export interface AppEventRegistry {
  // Domain packages extend this interface with module augmentation.
}

export interface AppEventDefinition<
  Domain extends string,
  Payload = Record<string, never>,
> {
  domain: Domain;
  payload: Payload;
}

export type AppEventType = Extract<keyof AppEventRegistry, string>;

export type AppEventDomainOf<Type extends AppEventType> =
  AppEventRegistry[Type] extends AppEventDefinition<infer Domain, unknown>
    ? Domain
    : never;

export type AppEventPayloadOf<Type extends AppEventType> =
  AppEventRegistry[Type] extends AppEventDefinition<string, infer Payload>
    ? Payload
    : never;

export type AppEventOf<Type extends AppEventType> = {
  type: Type;
  domain: AppEventDomainOf<Type>;
  payload: AppEventPayloadOf<Type>;
  metadata: AppEventMetadata;
};

export type RegisteredAppEvent = {
  [Type in AppEventType]: AppEventOf<Type>;
}[AppEventType];

export type AppEventDomain = RegisteredAppEvent["domain"];

export type AppEventForDomain<Domain extends AppEventDomain> = Extract<
  RegisteredAppEvent,
  { domain: Domain }
>;

export type AppEventListener<Event extends RegisteredAppEvent> = (
  event: Event,
) => void | Promise<void>;
```

Important constraints:

- Registry entries must include both `domain` and `payload`.
- The core package should use `unknown` only where truly unavoidable. It should not use `any` as a fallback for missing payload definitions.
- `EventDomain` should be derived from registered events instead of maintained as a separate centralized union.

## 2. Typed Bus API

The current runtime behavior can remain mostly unchanged, but the public TypeScript API should become generic.

```typescript
// packages/events/src/AppEventBus.ts

// DomainWildcard is derived from registered domains, not string — so FOOBAR:* is a type error.
export type DomainWildcard = `${Uppercase<AppEventDomain>}:*`;
export type EventWildcard = "*" | DomainWildcard;

export class AppEventBus {
  subscribe<Type extends AppEventType>(
    filter: Type,
    listener: AppEventListener<AppEventOf<Type>>,
    name?: string,
  ): () => void;

  subscribe<Domain extends AppEventDomain>(
    filter: `${Uppercase<Domain>}:*`,
    listener: AppEventListener<AppEventForDomain<Domain>>,
    name?: string,
  ): () => void;

  subscribe(
    filter: "*",
    listener: AppEventListener<RegisteredAppEvent>,
    name?: string,
  ): () => void;

  // Implementation overload — most permissive, runtime-only.
  // The typed overloads above provide the public surface; this overload is
  // not part of the public API and should not be called directly.
  subscribe(
    filter: AppEventType | EventWildcard | Array<AppEventType | EventWildcard>,
    listener: AppEventListener<RegisteredAppEvent>,
    name?: string,
  ): () => void {
    // Existing set/map dispatch can remain runtime-oriented (lowercase matching, etc.).
    // The typed overloads guarantee callers pass valid filters; the implementation
    // does not need to re-validate them at runtime.
  }

  emit<Type extends AppEventType>(event: AppEventOf<Type>): void {
    // Existing dispatch behavior can stay runtime-oriented.
  }
}
```

This is the main value of the design. A subscriber to `VAULT:ENTITY_UPDATED` receives the exact vault entity update payload. A subscriber to `VAULT:*` receives the union of vault events. A subscriber to `*` receives the full registered event union.

`DomainWildcard` is derived from `AppEventDomain` so unregistered domain prefixes (e.g., `FOOBAR:*`) are type errors. The overload for domain wildcards uses `Uppercase<Domain>` so `"vault"` → `"VAULT:*"` inference works automatically. Wildcard typing must be covered by type-level tests; it should not silently collapse to the full event union.

## 3. Domain Provider Convention

Each package that owns events must define and export those events from a stable module.

```typescript
// packages/vault-engine/src/events.ts

import type { AppEventDefinition } from "@codex/events";

// Constants are for consumers calling subscribe/emit — they avoid hardcoded strings at call sites.
export const VAULT_EVENTS = {
  VAULT_OPENING: "VAULT:VAULT_OPENING",
  CACHE_LOADED: "VAULT:CACHE_LOADED",
  ENTITY_UPDATED: "VAULT:ENTITY_UPDATED",
  VAULT_SWITCHED: "VAULT:VAULT_SWITCHED",
} as const;

// IMPORTANT: TypeScript does not allow computed property names in module augmentation.
// The declare module block must use string literals directly, even though the
// VAULT_EVENTS constants are used at call sites. Keep them in sync manually.
declare module "@codex/events" {
  interface AppEventRegistry {
    "VAULT:VAULT_OPENING": AppEventDefinition<"vault", Record<string, never>>;
    "VAULT:CACHE_LOADED": AppEventDefinition<"vault", { entities: unknown[] }>;
    "VAULT:ENTITY_UPDATED": AppEventDefinition<
      "vault",
      { id: string; patch: unknown; entity: unknown }
    >;
    "VAULT:VAULT_SWITCHED": AppEventDefinition<"vault", { id: string }>;
  }
}
```

Domain packages must follow these rules:

- Event constants live in the package that owns the domain behavior.
- Event strings use the existing `DOMAIN:ACTION` convention.
- Payloads should use domain-owned exported types where possible.
- Payloads that cross tabs through `metadata.sync: true` must be JSON-serializable.
- Avoid `any`; use concrete types or `unknown` until a concrete type exists.

## 4. Export And Registration Visibility

Module augmentation only works when the augmenting module is visible to the TypeScript program. This is the easiest failure mode to miss, and it has two independent requirements that must both be satisfied.

**Requirement 1 — TypeScript must see the augmenting file.**

Each domain package must re-export its event registration module from its public entrypoint:

```typescript
// packages/vault-engine/src/index.ts

export * from "./events";
```

The consumer's `tsconfig.json` must also resolve the package via `paths` or workspace symlinks. In `apps/web/tsconfig.json`, verify `@codex/vault-engine` resolves to `packages/vault-engine/src/index.ts` (not a built `dist/`). If it resolves to a `dist/` that was compiled before augmentations were added, TypeScript will silently see stale types.

**Requirement 2 — the augmenting module must be imported at runtime.**

A `declare module` block only widens the registry if the file containing it is part of the compiled program. Type-only imports (`import type`) do not guarantee this. Consumers must use a value import or side-effect import:

```typescript
import { appEventBus } from "@codex/events";
import { VAULT_EVENTS } from "@codex/vault-engine"; // value import — augmentation is live

appEventBus.subscribe(VAULT_EVENTS.ENTITY_UPDATED, (event) => {
  event.payload.id; // correctly typed as string
});
```

For application-wide event availability, `apps/web` should have one explicit registration module if needed:

```typescript
// apps/web/src/lib/app/event-registrations.ts
// Only add this file if normal imports don't make all augmentations visible.
// It must be imported with a side-effect import at app init (not just type-checked).

import "@codex/vault-engine";
import "@codex/oracle-engine";
import "@codex/graph-engine";
```

If this file is added, document why it exists and add a type-level test that verifies each augmentation is visible from this module. A pure `import type` of this file is not sufficient.

## 5. Migration Plan

1. Add the registry types in `packages/events/src/types.ts` while preserving compatibility aliases where practical.
2. Add compile-time tests for valid emits, invalid event names, exact payload inference, wildcard domain inference, and global wildcard inference.
3. Add runtime tests proving the existing dispatch, named listener replacement, unsubscribe, error isolation, and reset behavior still work.
4. Move Vault event constants and registry entries to the package that owns Vault behavior.
5. Move Oracle, UI, Sync, Graph, and future domain events incrementally.
6. Replace hardcoded event strings in app code with exported constants.
7. Remove the old centralized event union after all domains are registered.

## 6. Fate Of The VaultEventBus Bridge

The current architecture has a legacy `VaultEventBus` in `apps/web/src/lib/stores/vault/events.ts` that translates old `VaultEvent` shapes into `AppEvent`s and emits them onto `AppEventBus`. This bridge exists because vault-engine and the web app predate `AppEventBus`.

Once vault event definitions are registered in `vault-engine` (migration step 4), the bridge can be removed incrementally:

1. **vault-engine emits directly.** Any code inside `vault-engine` that currently dispatches `VaultEvent`s should switch to emitting typed `AppEvent`s via an injected `AppEventBus` reference. `vault-engine` must not import the singleton `appEventBus` directly — it should receive the bus as a constructor argument or via a callback, preserving its testability.

2. **Web app consumers migrate off VaultEventBus.** Components and services subscribed to `vaultEventBus` switch to `appEventBus.subscribe(VAULT_EVENTS.*, ...)`. The bridge continues to emit both while any legacy listener remains.

3. **Bridge is removed.** Once no code subscribes to `vaultEventBus` directly, the bridge and the `VaultEventBus` class are deleted.

Do not delete `VaultEventBus` before all consumers are migrated. The bridge is a compatibility shim, not part of the target architecture.

## 7. Testing Requirements

Runtime tests should cover:

- Specific event subscribers receive matching events only.
- Domain wildcard subscribers receive events from that domain only.
- Global subscribers receive all events.
- Named listeners replace prior registrations without duplicate calls.
- `reset()` clears non-named listeners and preserves named long-lived listeners.
- Listener errors do not stop other listeners.
- Sync events remain serializable before `BroadcastChannel` forwarding.

Type-level tests should cover:

- `emit()` accepts registered event types with correct payloads.
- `emit()` rejects unregistered event types.
- `emit()` rejects missing or malformed payload fields.
- Specific `subscribe()` callbacks infer the exact payload type.
- Domain wildcard `subscribe()` callbacks infer the domain event union.
- Global wildcard `subscribe()` callbacks infer the full registered event union.
- Domain augmentations are visible through package public entrypoints.

## 8. Risks And Decisions

### Module augmentation visibility

Risk: a package defines registry entries, but consumers do not import a module that makes those entries visible.

Decision: every event-owning package must export its event registration module from its public entrypoint. Add type-level tests from the consumer package perspective.

### Wildcard typing complexity

Risk: the runtime wildcard syntax is string-based and uppercase, while domains are lowercase payload fields.

Decision: keep runtime matching simple, but add explicit helper types and tests. If exact wildcard inference becomes too complex, preserve exact typing for specific event subscriptions and document wildcard subscriptions as domain/global unions.

### Computed keys in declare module

Risk: a developer writes `[VAULT_EVENTS.VAULT_OPENING]: AppEventDefinition<...>` inside `declare module "@codex/events"` and sees no immediate TypeScript error, but the augmentation silently produces an index signature instead of a literal key, breaking narrowing.

Decision: `declare module` blocks must always use string literals as keys (e.g., `"VAULT:VAULT_OPENING"`). The `VAULT_EVENTS` constants are used only at call sites (`subscribe`, `emit`). Add a type-level test that asserts `AppEventRegistry["VAULT:VAULT_OPENING"]` is the expected `AppEventDefinition` shape — this catches the regression.

### Payload type ownership

Risk: payload types drift into `packages/events`, recreating the dependency problem.

Decision: payload types belong to the domain package. `packages/events` owns only generic event infrastructure.

### Runtime validation

Risk: TypeScript checks compile-time callers, but events received from `BroadcastChannel` are untrusted runtime data.

Decision: this proposal does not add a schema system. `CrossTabBroadcaster` should continue treating cross-tab messages defensively (JSON parse inside try/catch, type guard before re-emit) and reject malformed envelopes before forwarding to the bus.

## Recommendation

Adopt the distributed registry pattern, but only with the stronger typed API and explicit export convention described above. The architecture is a better long-term fit than a centralized union, but the implementation must prove three things with tests before replacing the current model:

1. Event payload narrowing works for real consumers.
2. Domain package augmentations are visible through public package imports.
3. Existing runtime behavior remains unchanged.
