# Feature Specification: Standalone Generator Session Hub

**Feature Branch**: `137-standalone-generator-session-hub`  
**Created**: 2026-06-24  
**Status**: Draft  
**Input**: GitHub issue [#1524](https://github.com/eserlan/Codex-Cryptica/issues/1524) — "Standalone generators: session hub with selectable and inspectable generated entities"

## Overview

Standalone (public) generator pages today produce a single, disconnected result per entity type. A visitor who arrives from search, Reddit, or a shared link can generate an NPC, a settlement, or a faction — but each generation stands alone, knows nothing about what came before, and is lost the moment they generate something else of the same type.

This feature treats standalone generators as **lightweight hub sessions**. Without requiring a vault, an account, or any persistent world state, generated entities accumulate into a temporary "this session" hub, can be marked as reusable context, and can influence subsequent generations. Each generated result shows which earlier session entities actually shaped it, and the user can save any or all of them into a Codex Cryptica vault as a natural next step.

**Scope boundary with sibling [#1525](https://github.com/eserlan/Codex-Cryptica/issues/1525)**: This spec OWNS the session-context and provenance concepts because standalone generators have no vault to lean on. Issue #1525 (in-vault generators) is a sibling that EXTENDS these concepts to persistent vault context. This spec must remain self-contained but should define the session-context and provenance model so the in-vault scenario can reuse it rather than diverge.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generated entities accumulate in a session list (Priority: P1)

A visitor on a standalone generator page generates one or more entities. Each result is added to a compact "Generated so far" / "This session" list. The visitor can open any prior entity to review its full details without losing their current generator state or input.

**Why this priority**: This is the foundation — without a persistent session list, none of the reuse, provenance, or save flows are possible. On its own it already delivers value: a visitor can generate several things and revisit them instead of losing each result as soon as they generate the next.

**Independent Test**: Generate three entities of different types on a standalone page, confirm all three appear in the session list, open each one to review its details, and confirm the active generator form/result is preserved when returning from the review.

**Acceptance Scenarios**:

1. **Given** a visitor on a standalone generator page with no prior generations, **When** they generate an entity, **Then** the entity appears in a session list labeled with temporary-session language (e.g. "This session" / "Generated so far").
2. **Given** a session list with multiple generated entities, **When** the visitor opens one entity from the list, **Then** its full details are shown for review and the visitor can return to the generator without losing their current input or latest result.
3. **Given** a session list, **When** the visitor has generated entities of more than one type, **Then** the list visually distinguishes entities (e.g. grouped or labeled by type) so the list stays scannable.
4. **Given** an empty session (nothing generated yet), **When** the page loads, **Then** no confusing empty hub UI is shown — the standalone flow stays fast and uncluttered.

---

### User Story 2 - Later generations reuse marked session entities as context (Priority: P1)

The visitor marks which session entities should be available as context for future generations. When they run another generator, the marked entities are offered to the generation so the new result can reference them, producing a connected mini-world (e.g. an NPC who operates out of a previously generated settlement).

**Why this priority**: This is the core "hub" value proposition from the issue — standalone does not mean one-shot. Reuse of prior results as context is what turns a string of disconnected generations into a coherent set. P1 because the feature's headline promise is unmet without it.

**Independent Test**: Generate a settlement and mark it for reuse; generate a faction; confirm the faction's content can and does reference the settlement when the settlement is marked; then unmark the settlement, generate again, and confirm the new result no longer incorporates it.

**Acceptance Scenarios**:

1. **Given** a generated session entity, **When** the visitor views it in the session list, **Then** they can toggle whether it is "available for future generations" via a lightweight control.
2. **Given** one or more session entities marked as available, **When** the visitor runs another generator, **Then** the marked entities are supplied to that generation as context.
3. **Given** a session entity that is NOT marked (or has been unmarked), **When** the visitor runs another generator, **Then** that entity is not used as context for the new result.
4. **Given** the default marking behavior for newly generated entities, **When** an entity is first generated, **Then** its reuse state follows a single, clearly communicated default (see Assumptions / FR-009) and the visitor can immediately see and change it.

---

### User Story 3 - Each result shows which session entities it actually used (Priority: P2)

When a generated result was influenced by earlier session entities, the result displays a per-result provenance line (e.g. "Used: Saltmarket Docks, The Glass Bank") so the visitor understands why the output contains particular references. Provenance only appears when meaningful session context was actually used.

**Why this priority**: Provenance is what makes the reuse trustworthy and legible. It is P2 rather than P1 because reuse can technically function without it, but the issue treats visibility as a primary user need ("see which already-generated entities were actually used"), so it ships close behind the core.

**Independent Test**: With two session entities marked for reuse, generate a third entity that references them, confirm a "Used: …" line lists exactly those entities that influenced the result; then generate with no marked context and confirm no provenance UI appears.

**Acceptance Scenarios**:

1. **Given** a generation that used one or more marked session entities, **When** the result is shown, **Then** a per-result provenance display lists the specific session entities that were used.
2. **Given** a generation that used no session entities, **When** the result is shown, **Then** no provenance line or empty "Used:" UI is displayed.
3. **Given** a provenance display referencing a session entity, **When** the visitor selects that referenced entity, **Then** they can open/review it from the session hub.
4. **Given** a session entity was offered as context but the result demonstrably did not incorporate it, **When** provenance is shown, **Then** provenance reflects what was actually used rather than merely what was offered (see Assumptions for the detection approach).

---

### User Story 4 - Save one, some, or all session entities into a vault (Priority: P2)

The session hub presents an obvious path to save/import generated entities into a Codex Cryptica vault. The visitor can save a single entity, a selected subset, or the entire session hub, and the hub frames the vault as the natural next step for continued worldbuilding.

**Why this priority**: This is the conversion bridge from the lightweight standalone experience to the full product. It is P2 because the standalone hub delivers standalone value without it, but it is essential to the issue's "natural next step" goal and to not stranding the visitor's work.

**Independent Test**: Generate several session entities, choose to save one, then a selected subset, then all remaining, and confirm each path completes and that the saved entities (and their session relationships, where applicable) are represented in the destination vault.

**Acceptance Scenarios**:

1. **Given** a session with at least one generated entity, **When** the visitor chooses to save, **Then** they can save a single entity, a selected subset, or the whole session hub.
2. **Given** the visitor saves multiple related session entities, **When** the save completes, **Then** the relationships that existed between those session entities (i.e. which used which as context) are preserved as far as the destination supports.
3. **Given** a visitor with no vault/account, **When** they choose to save, **Then** the flow guides them toward creating/opening a vault without forcing them to understand vaults before they decided to save.
4. **Given** the session hub, **When** the visitor has generated at least one entity, **Then** the vault is presented as the natural next step using inviting language (e.g. "Save this session to your vault so future generators can keep building on it").

---

### Edge Cases

- **Empty session**: No generations yet → no hub/provenance UI clutter; generator remains fast and simple.
- **Single entity, no context**: First-ever generation has nothing to reference → no provenance line, reuse toggle still available for the next round.
- **Large session**: Many generated entities accumulate → the session list and the set of "available" context must remain usable and must not silently degrade generation quality or exceed practical context limits (see FR-011).
- **Conflicting / duplicate names**: Two session entities share a name → references and provenance must remain unambiguous to the visitor.
- **Page reload / navigation away**: The visitor refreshes or navigates between standalone generator pages → session persistence behavior must be defined (see FR-012 and Assumptions).
- **Cross-type references**: An NPC references both a settlement and a faction generated earlier → provenance lists all used entities regardless of type.
- **Unmarking after use**: An entity used in a past result is later unmarked → past provenance remains accurate (it records what happened), but the entity is excluded from future generations.
- **Generation failure**: A generation that was supposed to use context fails or returns partial output → the session list and prior entities are not corrupted, and the visitor can retry.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Standalone generators MUST work cleanly and deliver a result without any persistent vault, account, or saved-entity context.
- **FR-002**: The system MUST store each standalone generation result as a temporary session entity associated with the current generator session.
- **FR-003**: The system MUST present generated session entities in a compact session list using temporary-session language (e.g. "This session" / "Generated so far"), visually distinguishable by entity type.
- **FR-004**: Users MUST be able to open and review any previously generated session entity without losing their current generator input or most recent result.
- **FR-005**: Users MUST be able to mark/unmark each session entity as available for use as context in subsequent generations, via a lightweight control.
- **FR-006**: Subsequent standalone generations MUST be able to use the currently-marked session entities as context such that results can reference them.
- **FR-007**: The system MUST exclude unmarked session entities from being used as context in subsequent generations.
- **FR-008**: The system MUST display, per generated result, which earlier session entities were actually used as context for that result.
- **FR-009**: Newly generated session entities MUST adopt a single, clearly communicated default reuse state, and that state MUST be visible and immediately changeable by the user. _(Default choice recorded in Assumptions.)_
- **FR-010**: The provenance/"Used:" display MUST appear only when meaningful session context was actually used, and MUST NOT render an empty or confusing state when no context was used.
- **FR-011**: The system MUST keep the session list and context-selection usable as the number of generated entities grows, and MUST handle the case where marked context is too large to use in full without silently producing a degraded or failed generation. _(Handling strategy recorded in Assumptions.)_
- **FR-012**: The system MUST define and apply a clear session lifetime/persistence behavior for page reloads and navigation between standalone generator pages. _(Behavior recorded in Assumptions.)_
- **FR-013**: The UI MUST visually distinguish temporary session context from persistent vault context so users never confuse a session entity with a saved vault entity.
- **FR-014**: Users MUST be able to save/import a single session entity, a selected subset, or the entire session hub into a Codex Cryptica vault.
- **FR-015**: When saving multiple related session entities, the system MUST preserve the context relationships that existed between them (which entity used which) to the extent the destination vault supports relationships.
- **FR-016**: The session hub MUST present the vault as an inviting, optional next step without requiring first-time users to understand vaults, entity graphs, or permanent world structure to obtain first value.
- **FR-017**: Provenance records MUST remain accurate for past results even after an entity's reuse marking changes or the entity is otherwise modified later in the session.
- **FR-018**: Provenance entries MUST be selectable to open/review the referenced session entity from the hub.

### Key Entities

- **Generator Session**: The temporary, vault-free container scoped to a visitor's current standalone usage. Holds the ordered collection of session entities and tracks which are marked for reuse. Has a defined lifetime (see FR-012).
- **Session Entity**: A single generated result (NPC, settlement, faction, quest, etc.) held in the session. Attributes include its type, its generated content, a reuse/"available as context" flag, and its creation order. Distinct from a persistent vault entity.
- **Context Selection**: The set of session entities currently marked as available to influence future generations. Derived from the reuse flags across session entities.
- **Provenance Record**: The per-result association between a generated session entity and the specific earlier session entities that were actually used to produce it. Immutable with respect to later marking changes.
- **Save/Import Target (Vault)**: The persistent Codex Cryptica destination into which one, some, or all session entities (and their inter-relationships) can be promoted. Treated as an external boundary by this feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time visitor with no vault or account can generate an entity and see it appear in the session list on their first attempt, with no setup step required beforehand.
- **SC-002**: After generating two or more entities and marking at least one for reuse, a visitor can produce a subsequent generation that references the marked entity in at least 9 of 10 attempts where the entity is relevant.
- **SC-003**: For every generation that used session context, the result shows a provenance line naming exactly the entities used; for every generation that used none, no provenance UI appears (100% correct presence/absence across a representative test set).
- **SC-004**: A visitor can open and review any prior session entity and return to an unchanged active generator state in under 5 seconds and without re-entering input.
- **SC-005**: A visitor can save a single entity, a selected subset, and the whole session — each path completes successfully and the saved entities (and their relationships) are present in the destination vault.
- **SC-006**: In usability checks, first-time users describe the standalone experience as simple/fast (not as a "database" or "campaign manager") while still being able to articulate that earlier results influenced later ones.
- **SC-007**: Visitors never mistake a temporary session entity for a saved vault entity in usability checks (0 misidentifications attributable to UI ambiguity).

## Assumptions

- **Default reuse state (FR-009)**: Newly generated entities default to **marked-for-reuse (included by default), but visibly so**, with an obvious per-entity control to opt out. This matches the issue's "generous but visible" guidance and keeps the connected-world flow frictionless. (Open to revisiting in clarify if opt-in is preferred.)
- **Provenance accuracy (US3 / FR-008)**: "Actually used" provenance is based on what the generation step incorporated, not merely what was offered. The exact detection mechanism (e.g. the generator reporting which supplied entities it referenced) is an implementation concern deferred to planning; the spec requires the displayed provenance to reflect real usage, not the full offered set.
- **Session persistence (FR-012)**: The default assumption is that a session persists across navigation between standalone generator pages within the same browsing session and survives reloads for the duration of that browsing session, but is not a permanent/account-bound store. Exact retention boundary to be confirmed in clarify if it affects scope.
- **Large-context handling (FR-011)**: When marked context exceeds what a single generation can practically use, the system selects/prioritizes a usable subset and communicates this rather than failing silently. Prioritization strategy deferred to planning.
- **Save destination (FR-014/FR-015)**: Saving into a vault reuses the product's existing import/entity-creation pathways; this spec defines the user-facing capability and relationship-preservation requirement, not the import mechanism.
- The feature applies to the existing standalone/public generator surfaces (the public generator and tool pages) and does not, by itself, change in-vault generator behavior — that is sibling #1525.

## Out of Scope

- In-vault generator context, "do not reuse yet"/paused persistent entities, and provenance over persistent vault entities — covered by sibling #1525 (this spec defines the reusable model but does not implement the vault-side behavior).
- Cross-device or account-bound persistence of standalone sessions beyond a single browsing session.
- Collaboration/sharing of a live session hub between multiple users.
- Changes to the underlying generation quality, prompts, or entity schemas beyond what is needed to pass and report context.

## Dependencies

- Existing standalone/public generator pages and their per-type generation flows.
- Existing vault save/import (entity creation) pathway used by FR-014/FR-015.
- Shared session-context and provenance model is intended to be reused by sibling #1525.
