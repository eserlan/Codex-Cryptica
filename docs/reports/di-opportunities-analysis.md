# Dependency Injection — Opportunities Analysis

> **Issue:** [#1360](https://github.com/eserlan/Codex-Cryptica/issues/1360)
> **Scope:** `packages/*/src`, `apps/web/src/lib/services`, `apps/web/src/lib/stores`
> **Anchor:** Constitution **VIII — Dependency Injection** ("all services and stores
> MUST use constructor-based dependency injection… provide sensible defaults for
> production while allowing mocks in tests. Export both the class and a default
> singleton." See ADR 007.)

## TL;DR

DI is already well-established here — **71 constructors** take injected
collaborators, and several services follow the textbook pattern
(`QuickNoteService`, `CampaignGeneratorService`, `EntityTemplateService`,
`ThemeStore`, `DiceEngine`, `InteractionSessionManager`). The remaining gaps are
not missing _collaborator_ injection but **un-injected ambient dependencies** —
time, randomness, network, and storage reached through globals. These are the
exact category that made `DiceEngine` (#1363) brittle (the singleton captured
`globalThis.crypto` at import). The highest-value work is to introduce a few
small shared seams (`Clock`, `IdGenerator`, `Fetcher`) and adopt the existing
storage seam (`StorageLike`/`IThemeStorage`) in the services that still reach for
globals directly.

## Methodology

Surveyed every exported singleton (`export const x = new X()`) and graded each on
two axes:

1. **Collaborator DI** — does the constructor accept its dependencies with
   production defaults? (Most do.)
2. **Ambient DI** — does it reach `Date.now()`, `Math.random()`, `crypto`,
   `fetch`, or `localStorage` directly instead of through an injected seam?

Findings below are evidence-linked by `file:line`.

## What's already good (use these as the model)

| Component                                                                                      | Pattern                                                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `QuickNoteService` (`services/QuickNoteService.ts:14`)                                         | `constructor(db: EntityDb = entityDb)` — injectable persistence          |
| `CampaignGeneratorService` (`packages/generator-engine/.../campaign-generator-service.ts:154`) | `constructor(deps: …Deps = {})` — grouped deps object                    |
| `ThemeStore` (`stores/theme.svelte.ts:39,152`)                                                 | injects `IThemeStorage` — a clean storage seam (`loadLocal`/`saveLocal`) |
| `DiceEngine` (`packages/dice-engine/src/roller.ts:11`)                                         | injects `CryptoProvider` + `Clock`, resolved lazily                      |
| `InteractionSessionManager` / `GeneratorSessionManager`                                        | constructor-injected event bus (`InvalidationBus`)                       |
| `HelpStore` (`stores/help.svelte.ts:83`)                                                       | injects sibling stores                                                   |

Existing reusable seams already in the tree: `CryptoProvider`
(dice), `IThemeStorage` (theme), `ICategoryStorage` (categories), `StorageLike`
(`stores/ui/persistence.ts:1`), `IStorageAdapter` (`cloud-bridge/types.ts:15`).
**We should consolidate and reuse these rather than invent new ones per file.**

## Recommended shared seams

Three tiny interfaces would cover most of the gap (mirroring `DiceEngine`'s
`Clock`/`CryptoProvider`):

```ts
export interface Clock {
  now(): number;
} // default: Date
export interface IdGenerator {
  uuid(): string;
} // default: () => crypto.randomUUID()
export interface Fetcher {
  (input: RequestInfo, init?: RequestInit): Promise<Response>;
} // default: globalThis.fetch
```

…plus the **already-existing** `StorageLike` for `localStorage` access. Each
should resolve its global **lazily at call time** (the #1363 lesson) and default
to production, so nothing changes at runtime.

## Prioritized opportunities

### P1 — Non-determinism in core logic (time + randomness)

| Component                | Evidence                                                                          | Ambient dep                                     | Why it matters                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionActivityService` | `services/SessionActivityService.ts:18,19,32,62`                                  | `crypto.randomUUID`, `Date.now`, `localStorage` | No-arg `constructor()`; three globals at once. Retention logic (`Date.now() - RETENTION_MS`) is untestable without faking time. Top candidate. |
| Oracle `ChatHistory`     | `packages/oracle-engine/src/chat-history.svelte.ts:58,64,100…` (12× `Date.now()`) | time                                            | `updatedAt`/`lastUpdated` stamped from `Date.now()` throughout; inject `Clock` for deterministic history tests.                                |
| SEO generators           | `services/seo/generators/base.ts:455,459,465-473`                                 | `Math.random`                                   | Name/variety selection via `Math.random()`; an injected `Rng` (or seedable RNG) enables stable snapshot tests of generated copy.               |

### P2 — Network reached through global `fetch`

These hardcode `fetch`, forcing tests to stub the global (brittle, order-dependent):

- `services/gdrive-sync.ts:50,64,213,319` (module-level functions — also not a class)
- `packages/vault-engine/src/asset-manager.ts`
- `services/ai/image-generation.service.ts`
- `services/ai/client-manager.ts` (proxy + interactions `fetch`)
- `packages/sync-engine/src/GDriveBackend.ts`, `packages/oracle-engine/src/tts/gemini-tts-service.ts`

Inject a `Fetcher` (default `globalThis.fetch`). For `gdrive-sync.ts`, this also
argues for promoting the free functions into a small class so the seam has a home.

### P3 — Storage reached through global `localStorage`

`ThemeStore` already shows the fix (`IThemeStorage`). These still go direct and
would benefit from the same `StorageLike` seam (also fixes SSR/`browser` guards):

- `stores/search.svelte.ts`, `stores/ui/persistence.ts`, `stores/map.svelte.ts`
- `stores/vtt/vtt-grid-manager.svelte.ts`
- `services/ai/capability-guard.ts`, `services/seo/import-handler.ts`
- `services/seo/generators/session-context.ts`

## Anti-patterns observed

- **Import-time capture of a global** — the `DiceEngine` bug (#1363): a default
  param `= globalThis.crypto` evaluated when the singleton is constructed at
  import, before test polyfills run. Any new seam must resolve its global
  **lazily inside the method**, not in the constructor default.
- **Free functions over globals** (e.g. `gdrive-sync.ts`) — no injection point at
  all; wrap in a class with a `Fetcher` seam.
- **Three globals, no constructor** (`SessionActivityService`) — the clearest
  case where DI both improves testability and removes hidden coupling.

## Suggested rollout

1. Add the three shared seams (`Clock`, `IdGenerator`, `Fetcher`) in a small
   `packages/*/src` util (or reuse `dice-engine`'s `Clock`/`CryptoProvider`), each
   lazy-resolving its global.
2. **P1 first** (`SessionActivityService`, `ChatHistory`, SEO generators) — these
   unlock deterministic unit tests and have the worst non-determinism today.
3. **P2** network services behind `Fetcher`.
4. **P3** storage behind the existing `StorageLike`.
5. Each change keeps the production singleton's behaviour identical (defaults),
   adds tests using injected fakes, and follows Constitution VIII (export class +
   singleton).

## Out of scope / already fine

- Stateless pure engines that take no ambient deps (`DiceParser`,
  `CalendarEngine`, `graph-engine/transformer`) — nothing to inject.
- Components already injecting collaborators (the "What's already good" table).
