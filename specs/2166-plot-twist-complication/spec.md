# Feature Specification: Plot Twist & Complication Generator

**Feature Branch**: `2166-plot-twist-complication`  
**Created**: 2026-08-12  
**Status**: Draft  
**Input**: GitHub issue #2166

## User Scenarios & Testing

### User Story 1 - Generate a playable twist from a premise (Priority: P1)

As a GM with an existing premise, adventure, scene, or conflict, I can describe
it and generate a twist or complication that reinterprets established facts and
creates new player-facing choices.

**Independent Test**: Provide a premise with the default options and receive a
structured result containing all required sections and at least one actionable
choice.

**Acceptance Scenarios**:

1. **Given** a non-empty premise, **when** generation completes, **then** the
   result contains a reveal, overturned assumption, rationale, foreshadowing,
   consequences, and new choices.
2. **Given** a premise with explicit constraints, **when** generation completes,
   **then** the result respects those constraints and does not introduce a
   prohibited trope.

### User Story 2 - Shape the dramatic effect (Priority: P1)

As a GM, I can select genre, twist type, impact, timing, and foreshadowing
preference so the result fits the intended session.

**Independent Test**: Select each control, generate with a deterministic local
fallback, and verify the resolved options appear in the prompt and output.

**Acceptance Scenarios**:

1. **Given** selected theme and controls, **when** generation runs, **then** the
   prompt explicitly reflects those selections.
2. **Given** random twist type or timing, **when** generation runs, **then** a
   valid supported value is selected without empty fields.

### User Story 3 - Ground the twist in campaign context (Priority: P2)

As a GM working inside a campaign, I can supply selected entities and campaign
context so the twist grows from existing relationships, motives, pressures, or
assumptions rather than unrelated lore.

**Independent Test**: Pass bounded vault context and verify the prompt includes
the source/context while preserving existing entity titles and relationships.

**Acceptance Scenarios**:

1. **Given** selected campaign entities, **when** generation runs, **then** the
   prompt instructs the model to reinterpret supplied facts without
   contradicting them.
2. **Given** no campaign context, **when** generation runs, **then** standalone
   premise generation still works.

### Edge Cases

- Empty or whitespace-only premise must produce validation feedback or a safe
  local fallback, never an empty fabricated context.
- Malformed or partial AI JSON must fall back to a complete deterministic
  structured result.
- Unknown theme or option values must resolve to supported defaults.
- The generator must not claim a supplied fact is false merely to create a
  twist; it should identify an assumption and preserve established events.
- Cancellation or stale generation results must not overwrite a newer draft.

## Requirements

### Functional Requirements

- **FR-001**: The in-app generator catalogue MUST expose a `plot-twist`
  generator using the existing generic campaign generator UI.
- **FR-002**: The generator MUST accept a required premise plus optional
  avoid/constraint instructions and bounded campaign context.
- **FR-003**: The generator MUST support canonical theme/genre handling and
  controls for twist type, impact, timing, and foreshadowing.
- **FR-004**: AI prompts MUST prefer reinterpretation of established facts over
  arbitrary contradiction, invalidation, or cliché secret-villain reveals.
- **FR-005**: Generated output MUST include Reveal, Believed Assumption,
  Rationale, Foreshadowing, Immediate Consequences, and New Choices sections.
- **FR-006**: New Choices MUST contain actionable player decisions,
  opportunities, dilemmas, or trade-offs rather than only atmosphere.
- **FR-007**: The engine MUST provide a deterministic local fallback with the
  same required output shape and supported theme/options.
- **FR-008**: The engine MUST parse malformed or incomplete AI responses safely
  and fall back without exposing raw model errors to users.
- **FR-009**: The feature MUST preserve the existing vault context privacy and
  dependency-injection boundaries; no telemetry or remote persistence is added.
- **FR-010**: The implementation MUST include unit coverage for option
  resolution, prompt grounding, structured output, malformed response fallback,
  and catalogue/entity mapping.

### Key Entities

- **PlotTwistGeneratorOptions**: Premise, theme/genre, twist type, impact,
  timing, foreshadowing preference, constraints, and optional campaign context.
- **PlotTwistOutput**: Title/summary plus the six playability sections mapped to
  the existing generator output contract.
- **Campaign Context**: Bounded selected source entity, neighbors, world sample,
  existing titles, and theme data supplied through `GeneratorVaultContext`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: The generator is discoverable in the in-app catalogue and can be
  launched through the existing campaign generator flow without special-case UI.
- **SC-002**: 100% of valid local fallback generations contain all six required
  output sections and at least one non-empty new choice.
- **SC-003**: Dedicated tests cover success and malformed-response/fallback paths,
  with no regressions in the existing generator-engine suite.
- **SC-004**: Context-aware prompts include supplied context and an explicit
  continuity-preservation instruction while standalone prompts remain usable.
