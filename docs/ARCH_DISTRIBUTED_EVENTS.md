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
- All transport-related fields (`timestamp`, `sync`, `remote`, `vaultId`) belong under `metadata`; they must not be modeled as top-level `AppEvent` fields.
- The core package should use `unknown` only where truly unavoidable. It should not use `any` as a fallback for missing payload definitions.
- `EventDomain` should be derived from registered events instead of maintained as a separate centralized union.
- The core package must not rely on app-owned augmentations in its own runtime implementation. If the registry is empty inside `packages/events`, `RegisteredAppEvent` evaluates to `never`. Keep an internal runtime envelope type for implementation details, and use test-only module augmentations for type-level tests.

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

  subscribe<Type extends AppEventType>(
    filter: readonly Type[],
    listener: AppEventListener<AppEventOf<Type>>,
    name?: string,
  ): () => void;

  subscribe<Domain extends AppEventDomain>(
    filter: `${Uppercase<Domain>}:*`,
    listener: AppEventListener<AppEventForDomain<Domain>>,
    name?: string,
  ): () => void;

  subscribe<Domain extends AppEventDomain>(
    filter: readonly `${Uppercase<Domain>}:*`[],
    listener: AppEventListener<AppEventForDomain<Domain>>,
    name?: string,
  ): () => void;

  subscribe(
    filter: "*",
    listener: AppEventListener<RegisteredAppEvent>,
    name?: string,
  ): () => void;

  subscribe(
    filter: readonly EventWildcard[],
    listener: AppEventListener<RegisteredAppEvent>,
    name?: string,
  ): () => void;

  // Implementation overload — most permissive, runtime-only.
  // The typed overloads above provide the public surface; this overload is
  // not part of the public API and should not be called directly.
  subscribe(
    filter:
      | AppEventType
      | EventWildcard
      | readonly (AppEventType | EventWildcard)[],
    listener: AppEventListener<RegisteredAppEvent>,
    name?: string,
  ): () => void {
    // Existing set/map dispatch can remain runtime-oriented (lowercase matching, etc.).
    // TypeScript catches normal invalid callers, but runtime validation may still be
    // useful for JS callers, dynamic strings, casts, and stale plugin code.
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

// Prefer string literal keys in module augmentation unless type-level tests prove
// computed keys preserve literal registry entries. Constants remain the public API
// for callers; string-literal registry keys make the augmentation easier to audit.
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

**Requirement 2 — the augmenting module must be included by a non-type-erased import.**

A `declare module` block only widens the registry if the file containing it is part of the TypeScript program. Type-only imports (`import type`) do not reliably force that in application bundles because they can be erased. Consumers should use a value import or side-effect import when they depend on an augmentation being visible:

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
import "graph-engine";
```

The package names in this example should match the actual workspace package names. Some packages currently use scoped names such as `@codex/vault-engine`, while others use unscoped names such as `graph-engine`. Normalize package names separately if desired; do not hide naming drift inside the event registry migration.

If this file is added, document why it exists and add a type-level test that verifies each augmentation is visible from this module. A pure `import type` of this file is not sufficient.

## 5. Migration Plan

1. Add the registry types in `packages/events/src/types.ts` while preserving compatibility aliases where practical.
2. Add compile-time tests for valid emits, invalid event names, exact payload inference, wildcard domain inference, and global wildcard inference.
3. Add runtime tests proving the existing dispatch, named listener replacement, unsubscribe, error isolation, and reset behavior still work.
4. Move Vault event constants and registry entries to the package that owns Vault behavior.
5. Bridge all existing Vault lifecycle events before migrating consumers. This includes cold/warm boot and indexing events such as `VAULT_OPENING`, `CACHE_LOADED`, `SYNC_CHUNK_READY`, and `SYNC_COMPLETE`; otherwise services like search can lose initial indexing or background sweep behavior.
6. Move Oracle, UI, Sync, Graph, and future domain events incrementally.
7. Replace hardcoded event strings in app code with exported constants.
8. Remove the old centralized event union after all domains are registered.

## 6. Fate Of The VaultEventBus Bridge

The current architecture has a legacy `VaultEventBus` in `apps/web/src/lib/stores/vault/events.ts` that translates old `VaultEvent` shapes into `AppEvent`s and emits them onto `AppEventBus`. This bridge exists because vault-engine and the web app predate `AppEventBus`.

Once vault event definitions are registered in `vault-engine` (migration step 4), the bridge can be removed incrementally:

1. **vault-engine emits directly.** Any code inside `vault-engine` that currently dispatches `VaultEvent`s should switch to emitting typed `AppEvent`s through an injected event sink interface, not the concrete singleton. For example, accept `{ emit(event): void }` or a callback in constructors. `vault-engine` must not import the singleton `appEventBus` directly, preserving testability and keeping domain packages loosely coupled to the bus implementation.

2. **Bridge parity is proven first.** The bridge must emit AppEvent equivalents for every legacy `VaultEvent` that still drives behavior. In particular, search/indexing paths must continue to receive cache-load, vault-opening, sync-chunk, and sync-complete events with enough payload data to rebuild or update the index.

3. **Web app consumers migrate off VaultEventBus.** Components and services subscribed to `vaultEventBus` switch to `appEventBus.subscribe(VAULT_EVENTS.*, ...)`. The bridge continues to emit both while any legacy listener remains.

4. **Bridge is removed.** Once no code subscribes to `vaultEventBus` directly, the bridge and the `VaultEventBus` class are deleted.

Do not delete `VaultEventBus` before all consumers are migrated. The bridge is a compatibility shim, not part of the target architecture.

## 7. Cross-Tab Transport

`CrossTabBroadcaster` is the event bus adapter for browser tab synchronization. The target contract is JSON string transport over `BroadcastChannel`, not browser structured clone of raw event objects:

1. Local events with `metadata.sync: true` and no `metadata.remote` are serialized with `JSON.stringify(event)` and sent over `codex-system-events`.
2. Serialization failures are ignored so non-JSON-compatible payloads do not break local event dispatch.
3. Remote messages are accepted only when they are strings that parse into valid event envelopes.
4. Re-emitted remote events must set `metadata.remote: true` to prevent broadcast loops.
5. The broadcaster must expose `destroy()` and callers must invoke it from component/service teardown, including Svelte `onDestroy` or an `onMount` cleanup return.

This keeps the documented JSON-compatible payload rule enforceable. If the project later chooses structured clone semantics instead, update this document, the Speckit contract, and runtime tests in the same change.

## 8. Listener Semantics

Named listeners are globally unique by name across the bus, not scoped by domain or filter. Registering a new listener with an existing name replaces the previous registration everywhere.

`reset()` clears non-named listeners and preserves named listeners. This is intentional: long-lived services such as search and cross-tab broadcasting should survive vault switches. Unsubscribe closures must only remove the named-listener mapping if it still points at the same listener instance, so an old unsubscribe cannot delete a newer replacement with the same name.

## 9. Testing Requirements

Runtime tests should cover:

- Specific event subscribers receive matching events only.
- Domain wildcard subscribers receive events from that domain only.
- Global subscribers receive all events.
- Named listeners replace prior registrations without duplicate calls.
- Old unsubscribe closures do not delete newer listeners registered with the same name.
- `reset()` clears non-named listeners and preserves named long-lived listeners.
- Listener errors do not stop other listeners.
- Cross-tab forwarding uses JSON string transport, rejects malformed remote messages, tags remote events with `metadata.remote: true`, and unsubscribes/closes cleanly on `destroy()`.
- Vault bridge parity covers lifecycle and indexing events before consumers migrate from `VaultEventBus`.

Type-level tests should cover:

- `emit()` accepts registered event types with correct payloads.
- `emit()` rejects unregistered event types.
- `emit()` rejects missing or malformed payload fields.
- Specific `subscribe()` callbacks infer the exact payload type.
- Domain wildcard `subscribe()` callbacks infer the domain event union.
- Global wildcard `subscribe()` callbacks infer the full registered event union.
- Domain augmentations are visible through package public entrypoints.

## 10. Risks And Decisions

### Module augmentation visibility

Risk: a package defines registry entries, but consumers do not import a module that makes those entries visible.

Decision: every event-owning package must export its event registration module from its public entrypoint. Add type-level tests from the consumer package perspective.

### Wildcard typing complexity

Risk: the runtime wildcard syntax is string-based and uppercase, while domains are lowercase payload fields.

Decision: keep runtime matching simple, but add explicit helper types and tests. If exact wildcard inference becomes too complex, preserve exact typing for specific event subscriptions and document wildcard subscriptions as domain/global unions.

### Computed keys in declare module

Risk: a developer writes `[VAULT_EVENTS.VAULT_OPENING]: AppEventDefinition<...>` inside `declare module "@codex/events"` and assumes it preserves a literal registry key. Current TypeScript can preserve this when the constant is a literal, but the behavior depends on the expression staying simple and test-covered.

Decision: prefer string literals as registry keys (e.g., `"VAULT:VAULT_OPENING"`) because they are easiest to audit and least likely to widen unexpectedly. Computed keys are allowed only if type-level tests prove `AppEventRegistry["VAULT:VAULT_OPENING"]` resolves to the expected `AppEventDefinition` shape.

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
