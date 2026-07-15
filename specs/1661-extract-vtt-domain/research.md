# Research: VTT Domain Extraction

## Decision: Extend `map-engine`

**Rationale**: The workspace already contains the map-domain library and depends
only on `schema`. Reusing it creates one home for future pure VTT rules.

**Alternatives considered**:

- Create a `vtt-engine` package: rejected because it would split closely related
  map and VTT rules before a distinct boundary exists.
- Keep the logic in `apps/web`: rejected because session invariants are not tied to
  Svelte or browser APIs.

## Decision: Extract the model and normalization first

**Rationale**: Session types, token visibility migration, collection cloning,
selection validation, and turn bounds are pure behavior used across VTT managers.
They make a small, testable first increment.

**Alternatives considered**:

- Move reactive managers wholesale: rejected because they depend on `$state`,
  timers, storage, P2P messages, and UI state.
- Extract persistence or P2P first: rejected because both are browser adapters and
  would not establish the domain boundary.

## Decision: Preserve a web compatibility module

**Rationale**: Existing app imports keep their stable local path while new code can
import the package directly. This reduces migration risk and keeps this extraction
focused.

**Alternatives considered**:

- Rewrite every web import immediately: rejected as unnecessary churn.
