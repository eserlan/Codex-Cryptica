---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
---

# SDD Plan

## User Input

The user input `$ARGUMENTS` can specify additional context or overrides. If empty, proceed with defaults.

## Outline

1. **Setup**: Run `.specify/scripts/bash/setup-plan.sh --json` from repo root.
    - Parse the JSON output for `FEATURE_SPEC`, `IMPL_PLAN`, `SPECS_DIR`, and `BRANCH`.
    - If command fails, ensure you are in a feature branch or specify the feature.

2. **Load context**: 
    - Read `FEATURE_SPEC` (path from step 1).
    - Read `.specify/memory/constitution.md`. 
    - Load `IMPL_PLAN` template (this file is created/copied by the script in step 1, you should read it from the path provided).

3. **Execute plan workflow**: Follow the structure in `IMPL_PLAN` template to:
   - Fill **Technical Context** (mark unknowns as "NEEDS CLARIFICATION")
   - Fill **Constitution Check** section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate `research.md` (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate `data-model.md`, `contracts/`, `quickstart.md`
   - Phase 1: Update agent context by running the agent script ` .specify/scripts/bash/update-agent-context.sh gemini`
   - Re-evaluate Constitution Check post-design

4. **Stop and report**: Command ends after Phase 2 planning. Report branch, `IMPL_PLAN` path, and generated artifacts.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION -> research task
   - For each dependency -> best practices task
   - For each integration -> patterns task

2. **Generate and dispatch research agents**:
   - For each unknown, perform necessary research (using search tools or code reading).
   
3. **Consolidate findings** in `research.md` (in `SPECS_DIR`) using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: `research.md` with all NEEDS CLARIFICATION resolved.

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** -> `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action -> endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `contracts/` directory (inside `SPECS_DIR`).

3. **Agent context update**:
   - Run `.specify/scripts/bash/update-agent-context.sh gemini`
   - Add only new technology from current plan

**Output**: `data-model.md`, `/contracts/*`, `quickstart.md`.

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
