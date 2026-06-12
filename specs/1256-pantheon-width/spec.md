# Feature Specification: Pantheon Width / Domain Scope Selection

**Feature Branch**: `1256-pantheon-width`  
**Created**: 2026-06-11  
**Status**: Implemented  
**Input**: User description: "Let's make it so that we can select the widths of the Pantheon so if it's like a complete set of different types of Gods or focused for just one kind of domain"

## User Scenarios & Testing

### User Story 1 - Selecting a Focused Pantheon (Priority: P1)

An RPG GM or worldbuilder generating a Pantheon wants to focus the entire divine assembly around a single concept (e.g., War, Nature). They select "Focused (Single Domain Focus)" under the "Pantheon Focus / Width" dropdown, choose "War" as the Primary Domain, and click "Generate". The system outputs a pantheon where every member deity is themed around a specific sub-aspect of "War" (e.g. strategy, chivalry, siege, bloodshed).

**Independent Test**: Choose "Pantheon", select "Focused" width, select "War" domain, toggle AI off, and verify the fallback summary and deities lists describe/represent aspects of the "War" domain rather than unrelated domains.

**Acceptance Scenarios**:

1. **Given** a user is on the Pantheon Generator page, **When** they select "Pantheon" mode, "Focused" width, "War" domain, and click "Generate", **Then** the fallback content summary reads "A collection of deities focused on the domain of war...".
2. **Given** the generated deities structure, **When** width is "Focused", **Then** member deities list describes their control over aspects of the selected domain (e.g., "Controls a specific aspect of the war domain").

---

### User Story 2 - Selecting a Balanced Pantheon (Priority: P2)

A GM wants a diverse pantheon representing standard cosmic domains (e.g. light, death, arcana, shadow) with one primary domain representing the chief deity. They select "Diverse (Multiple Domains)" under the "Pantheon Focus / Width" dropdown. The generated pantheon contains a balanced mixture of deities governing different domains.

**Acceptance Scenarios**:

1. **Given** the user selects "Diverse" width, **When** they generate a pantheon, **Then** the output contains a mixture of deities representing various domains, with the primary domain as the central focus.

---

### Edge Cases

- **AI Model Steering**: If AI generation is enabled, the system must translate the "Focused" vs "Balanced" selection into explicit domain scope guidelines in the prompt instructions to ensure the model responds appropriately.

## Requirements

### Functional Requirements

- **FR-001**: The Pantheon Form Fields MUST display a "Pantheon Focus / Width" dropdown when the generator target is set to "Pantheon".
- **FR-002**: The dropdown MUST allow selecting between:
  - **Balanced / Diverse (Multiple Domains)** (value: `balanced`)
  - **Focused / Monolithic (Single Domain Theme)** (value: `focused`)
- **FR-003**: The selected width option MUST be passed to the `generatePantheon` engine function.
- **FR-004**: The AI generation prompt MUST include instructions steering the model's domain scope based on the selected width (Balanced vs Focused).
- **FR-005**: The fallback generation logic MUST adjust the summary and deity structure descriptions dynamically based on the width choice.
- **FR-006**: The "Surprise Me" randomization action MUST randomize the width option choice along with the other form options.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All vitest unit tests in `generator-engine.test.ts` pass, including new coverage verifying both local fallback and AI prompt steering for balanced and focused options.
