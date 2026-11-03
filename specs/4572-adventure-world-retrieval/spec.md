# Feature Specification: World-grounded Adventure interactions

**Feature Branch**: `4572-adventure-world-retrieval`
**Created**: 2026-11-03
**Status**: Implemented and locally validated
**Input**: [#4623](https://github.com/eserlan/Codex-Cryptica/issues/4623), under epic #4528.

## User Scenarios & Testing

### User Story 1 — The world informs every response (Priority: P1)

As a player in an existing world, I want Oracle to consult relevant world and play knowledge whenever it responds, including after dice rolls, so established facts remain consistent.

**Why this priority**: Grounding only the opening does not sustain believable play.
**Independent Test**: Start in a known settlement, interact with a known NPC and resolve a roll; each response respects relevant established facts.

**Acceptance Scenarios**:

1. **Given** canonical people, places and relationships, **when** opening or taking an action, **then** relevant world facts and current play knowledge inform the response with identifiable sources.
2. **Given** a pending roll and supplied outcome, **when** resolving it, **then** relevant world knowledge is consulted without rerolling or losing the original action.
3. **Given** existing provisional discoveries and commitments, **when** revisiting after reload, **then** Oracle reuses that knowledge and canonical facts take precedence.

### User Story 2 — Knowledge respects time and disclosure (Priority: P1)

As a player, I want Oracle to distinguish what exists, what my character knows and what has not happened yet.

**Why this priority**: Grounding must preserve secrets and historical uncertainty.
**Independent Test**: Play before a dated succession with a secret NPC motive; neither appears as a player-known present fact.

**Acceptance Scenarios**:

1. **Given** future, hidden and uncertain facts, **when** Oracle receives relevant context, **then** applicability and disclosure remain distinct; deterministic player-facing projections exclude hidden facts, and model-generated outputs are evaluated for unearned disclosures.
2. **Given** conflicting canonical and provisional assertions, **when** responding, **then** canonical authority is preserved and unresolved canonical contradictions remain uncertain.

### User Story 3 — Recover without losing play (Priority: P1)

As a player, I want a failed knowledge lookup to be recoverable without losing my action, roll or committed progress.

**Why this priority**: Retrieval becomes mandatory and therefore must fail safely.
**Independent Test**: Interrupt a lookup, retry and verify one resulting committed turn with the original roll.

**Acceptance Scenarios**:

1. **Given** a lookup error, **when** generating, **then** generation stops with an actionable retry and committed state and input remain intact.
2. **Given** a successful lookup with no matches, **when** continuing, **then** Oracle may establish provisional details without presenting invented background as existing canon.
3. **Given** cancellation or a changed session during lookup, **when** results arrive, **then** stale work is discarded and nothing is committed.

### Edge Cases

Missing/deleted anchors; no matching records; hidden-only matches; undated lore; contradictory dates; large Vaults; navigation/cancellation during lookup; changed Vault contents; worker fallback; retained provider conversations; interrupted opening; repeat roll resolution; read-only/offline/AI-disabled sessions.

## Requirements

### Functional Requirements

- **FR-001**: Every play-related AI interaction MUST resolve purpose-appropriate world and committed play knowledge before generation. Existing openings, actions, roll resolutions and background-situation generation are in scope; future dialogue, summaries, elaboration, extraction and consequences must follow the same rule when introduced.
- **FR-002**: Relevant context MUST include canonical anchors and relevant records/relationships/events, location/date, participants, commitments, unresolved situations and available provisional discoveries. Do not require future multi-scenario/entity features to ship this contract.
- **FR-003**: Context MUST preserve source identity, canonical precedence, temporal uncertainty/contradiction and separate player-known and GM-only knowledge. Retrieval cannot itself grant fictional knowledge.
- **FR-004**: Retrieval MUST be bounded by explicit record and text budgets; it MUST NOT load every Vault body or require another AI pass.
- **FR-005**: Successful empty retrieval MUST differ from failure. Retrieval failure blocks the affected generation with recoverable retry. An explicitly selected canonical character, starting location or source anchor missing at lookup produces an unavailable-source outcome; optional search matches may be absent. The user may restore the record or edit the selection before retrying.
- **FR-006**: Cancellation, stale results, failures and retries MUST preserve committed state, drafts and supplied dice outcomes and MUST NOT duplicate turns/events or mutate canonical entities.
- **FR-007**: Each interaction MUST resolve context afresh, or reuse only context proven valid for its Vault/session revision, location, date, disclosure and purpose. Unverifiable validity requires fresh resolution.
- **FR-008**: All provider/worker routes MUST receive the same resolved context; retained conversation history MUST be reset before dispatch when validity cannot be established or its source/disclosure/time scope changes.
- **FR-009**: Retrieval and inspection MUST remain local; generation respects existing explicit AI configuration/availability. Diagnostics MUST contain only safe counts, durations and outcome codes, never world/secret text.
- **FR-010**: New play-related AI call sites MUST be covered by a maintained entry-point inventory and tests verifying the shared contract.

### Key Entities

- **Context request**: Purpose, Vault/session identity and revision, action or pending roll, current location/date and cancellation.
- **Resolved context**: Bounded sourced world excerpts and committed session knowledge, separated by disclosure and temporal applicability.
- **Resolution outcome**: Ready (including empty), failed, cancelled or stale; only ready permits generation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All inventoried production play AI paths consult world/play knowledge in deterministic integration checks across direct and worker routes.
- **SC-002**: A 30-turn existing-world fixture preserves relevant canonical and discovered facts through a roll, revisit and reload with zero duplicate commits or unearned secret/future disclosures.
- **SC-003**: Every tested failed/cancelled lookup preserves the prior committed session and original action/roll; retry yields at most one new committed turn.
- **SC-004**: A 10,000-record synthetic Vault stays within documented record/text limits with bounded body reads; lookup latency and context volume are recorded separately from model generation.

## Assumptions and Boundaries

This adds a consistent grounding contract, not a new retrieval database, world simulator, rumour system or entity creation feature. Reuse current search and chronology semantics. Use current provisionalFacts and scenario state; richer entity/scenario collections integrate later under #4533/#4529. No automatic canonical writes, new public routes, remote storage or session schema migration is required. Model obedience is evaluated separately from deterministic disclosure and source-delivery guarantees.

## Operational decisions

Retrieval is performed immediately before each interaction; a successful empty search may proceed. Because no reliable vault-wide revision contract has been established, do not claim snapshot isolation: recheck session/control and selected source identities after asynchronous work and clear retained provider history before each new interaction until a reliable validity signal exists. Concurrent Vault edits during a single lookup may still require a future snapshot mechanism; document this limitation. A retrieval failure must not be swallowed by the optional background-rumour fallback. After successful grounding, optional model generation or malformed rumour output may still use the existing local fallback.

Deterministic disclosure guarantees apply to source projections and application-controlled surfaces. A model receiving GM-only context can still reveal it; evaluate generated narration, suggestions and recaps with adversarial fixtures, and do not describe a prompt instruction as a guarantee.
