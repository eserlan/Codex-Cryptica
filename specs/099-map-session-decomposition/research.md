# Research: Map Session Store Decomposition

## Decision: Keep `MapSessionStore` as a Compatibility Facade

**Decision**: Preserve the exported `mapSession` singleton and existing `MapSessionStore` compatibility methods while moving internal responsibilities into focused collaborators. Selected consumers may migrate away from `mapSession` only when the target manager API is cleaner and the migration is low risk.

**Rationale**: `mapSession` is used by UI, tests, P2P host, and P2P guest code. A compatibility facade lets the refactor proceed without forcing every consumer to change at once. The clarification session explicitly allows consumer migration, but only where it reduces coupling without introducing duplicate state ownership.

**Alternatives considered**:

- Full replacement of `mapSession` with direct manager imports: rejected as too broad for one refactor and risky for Svelte reactivity and P2P behavior.
- No consumer migration at all: rejected because some consumers may become simpler and safer when they depend on a narrower manager API.

## Decision: Extract Lifecycle and Snapshot Responsibilities First

**Decision**: Extract active-map binding, hydration, draft restoration, reset, clear-session orchestration, and snapshot create/apply behavior into two focused collaborators.

**Rationale**: Existing specialized managers already cover token, initiative, grid, measurement, chat, media, persistence, encounter, and network behavior. The largest remaining responsibilities in `map-session.svelte.ts` are orchestration and snapshot translation, so extracting those yields the most line-count and maintainability benefit without changing gameplay.

**Alternatives considered**:

- Extract lifecycle only: rejected because snapshot assembly/application is equally central and currently keeps broad state knowledge in the facade.
- Full facade rewrite: rejected as follow-up work because it would obscure behavior-preservation validation.

## Decision: Use Constructor-Based Dependency Interfaces for New Collaborators

**Decision**: New managers will accept dependency objects that expose only the state accessors and commands they need.

**Rationale**: This matches existing VTT manager patterns and the constitution's DI requirement. It also enables unit tests for lifecycle and snapshot behavior without constructing the full app store singleton.

**Alternatives considered**:

- Import singleton stores directly in new collaborators: rejected because it weakens testability and violates DI guidance.
- Pass the whole `MapSessionStore` into collaborators: rejected because it recreates broad coupling under a different name.

## Decision: Preserve Saved Snapshot and P2P Payload Compatibility

**Decision**: `EncounterSession` snapshot shape and P2P `SESSION_SNAPSHOT` payload behavior remain unchanged. Legacy/partial snapshots must still restore safely.

**Rationale**: Snapshots are persisted locally and transmitted over P2P. The refactor is internal; users should not lose saved encounters, and host/guest sessions should not require protocol changes.

**Alternatives considered**:

- Version the snapshot format now: rejected because no new data shape is required by this refactor.
- Normalize snapshots through a new external schema library: rejected as unnecessary scope expansion.

## Decision: Automated Validation Is the Formal Acceptance Gate

**Decision**: Formal completion requires line-count reduction, focused manager tests, current map-session tests, P2P-dependent tests, saved snapshot compatibility checks, and type checking. Manual browser host/guest testing is optional supporting evidence.

**Rationale**: Automated tests are repeatable and align with the clarification answer. Manual browser testing may still be useful if the implementation touches live networking or popouts more than expected, but it is not required by the spec.

**Alternatives considered**:

- Require manual host/guest testing: rejected because it would make completion less deterministic and was clarified as optional.
- Line-count-only validation: rejected because behavior compatibility matters more than file size.
