# Feature Specification: Faction Turn — Influence Vertical Slice

**Feature Branch**: `161-faction-turn-influence`
**Created**: 2026-08-21
**Status**: Draft
**Input**: GitHub issue #2396 — "Feature: Faction Turn System for Living Campaign Worlds", scoped down to a single end-to-end vertical slice agreed in discussion.

## Overview

Campaign worlds in Codex Cryptica are static between sessions. Factions exist as entities with relationships, but nothing about them changes unless the GM edits them by hand. This feature gives a faction the ability to **take a turn**: pursue an intent against another entity in the world, have the outcome resolved by a repeatable mechanism rather than pure GM fiat, and have that outcome recorded as durable, inspectable history.

This slice deliberately implements **one complete path** rather than a broad subsystem. It proves the full pipeline — opt-in, stats, eligibility, action, resolution, narration, preview, commit, history — using a single action type. The remaining action catalogue, campaign-wide World Turn resolution, faction assets and goals, AI-suggested actions and simulated turns, and Oracle context integration are explicitly out of scope and are expected to follow as separate features once this pipeline is validated.

### Scope Boundary

**In scope**: opting a faction into the turn layer; mapping its stats; determining whether it may act; taking a single **Influence** action against a target entity; AI selecting the outcome within mechanically set bounds and narrating it, with a mechanical fallback; previewing the outcome; committing or discarding it; undoing a committed turn; viewing turn history.

**Out of scope for this slice**: any action other than Influence; resolving several factions in one pass; a campaign-level World Turn screen; faction assets; faction goals as structured records; AI-suggested actions; automatic turn simulation; exposing faction state to Oracle, AI GM, or Adventure Mode; automatic advancement of the world clock.

## Clarifications

### Session 2026-08-21

- Q: Which roles does the system define, and how many must be mapped before a faction can act? → A: Four roles are defined (power, influence, resources, stability); only the roles an action actually uses must be mapped, so Influence requires two.
- Q: What does an Influence attempt roll against? → A: The acting faction's influence role opposes the target's stability when the target is a turn-enabled faction; otherwise the opposition is derived from how strongly other factions already hold the target, falling back to a vault-wide baseline when no such hold exists.
- Q: What does a resolved Influence outcome write to the world? → A: It shifts the strength of the relationship between the acting faction and the target by an amount set by the outcome band, and adjusts the acting faction's influence stat. Relationship type is never changed automatically; the preview may suggest a type change that the GM opts into.
- Q: How many outcome bands does Influence resolve into? → A: Five — decisive success, success, mixed, failure, backfire.
- Q: What do we call a faction's numbers in user-facing language? → A: "Stats", matching issue #2396 and the vault's existing stat sheet vocabulary. "Capabilities" is not used. For the same reason, the vault's plain term "event" is used throughout rather than "world event".
- Q: Which edge or edges does a turn write, given that relationships are directed and source-owned? → A: A single directed edge from the acting faction to the target, whose strength means "how firmly this faction holds this target". No reciprocal edge is written or maintained.
- Q: Does an uncommitted preview survive leaving the screen? → A: No. The preview is transient, living only in the open view, and is never persisted or synced. Leaving or reloading discards it and the GM re-resolves.
- Q: Is turn history bounded? → A: No. History is never pruned or trimmed, and every entry keeps its full resolution detail permanently. The expected magnitude is order-of-hundreds of records per faction over a campaign's life.
- Q: How is the outcome sentence produced, and who decides the outcome band? → A: Mechanics always compute a band and a permitted range around it. When AI is enabled and available it selects the final band from within that range, giving a reason, and narrates the result from the full resolution detail and situational context. When AI is off, unavailable, or returns something invalid, the mechanically computed band stands and narration falls back to a local template. This overrules the earlier assumption that no external generation service was involved. AI never sets magnitudes or writes any stored value beyond choosing within range and supplying text.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Give a faction a mechanical layer (Priority: P1)

A GM has a faction in their vault — the Black Eagles — that currently exists as a description and a handful of relationships. They want it to become something the world can simulate, without that changing how any of their other factions behave.

The GM opens the faction, turns on the faction turn layer, and defines the stats that matter in their setting. Because settings differ, the GM names these stats themselves: a fantasy vault may use Power, Influence, Resources and Stability; a sci-fi vault may use Fleet Strength, Political Reach, Industry and Morale. The GM then tells the system which of their stats plays each role, so the system knows what to use when resolving actions without dictating vocabulary.

**Why this priority**: Nothing else in the feature can happen until a faction has an opted-in, role-mapped stat set. It is also the point where the system-neutrality principle is either honoured or lost.

**Independent Test**: Enable the layer on one faction, name and score its stats, map the roles, reload the vault, and confirm the configuration persisted — while a second faction in the same vault remains a plain faction with no turn affordances anywhere in the interface.

**Acceptance Scenarios**:

1. **Given** a faction with the turn layer off, **When** the GM views it, **Then** no turn controls, stats or history are shown and the faction behaves exactly as it does today.
2. **Given** a faction, **When** the GM enables the turn layer, **Then** a stat set is created that the GM can rename and score freely.
3. **Given** a faction with renamed stats, **When** the GM maps each role to one of them, **Then** the mapping is saved and is what the system uses to resolve later actions.
4. **Given** a faction with the turn layer enabled but a role the chosen action requires left unmapped, **When** the GM attempts to take that turn, **Then** the system names the missing role and does not offer to resolve the action.
   4a. **Given** a faction that has mapped every role the chosen action requires but left other roles unmapped, **When** the GM takes that turn, **Then** it resolves normally and the unmapped roles are never referenced.
5. **Given** a faction with the turn layer enabled, **When** the GM disables it, **Then** turn controls disappear, and previously recorded history is retained rather than deleted.

---

### User Story 2 — Know whether a faction may act yet (Priority: P1)

The GM's campaign has a current point in world time. Faction turns should be paced by that clock: a faction that acted recently should not be able to act again immediately, and time should only move when the GM decides it moves. The GM never wants the system to advance their campaign's date on its own.

The GM sets the campaign's current world date, and sets how much world time must pass between one faction's turns. When they open a faction, the system tells them plainly whether that faction may act — and if not, when it next can.

**Why this priority**: Without pacing, turn history is meaningless and a GM can trivially grind a faction's stats upward. This is also where the feature's promise not to touch the GM's campaign clock is kept.

**Independent Test**: Set a current world date and a turn interval, have a faction act, confirm it becomes ineligible with a clear explanation, advance the world date past the interval, and confirm it becomes eligible again — verifying at every step that the world date only ever changed because the GM changed it.

**Acceptance Scenarios**:

1. **Given** a faction that has never taken a turn, **When** the GM opens it, **Then** it is eligible to act regardless of the current world date.
2. **Given** a faction that acted at a world date less than one interval ago, **When** the GM opens it, **Then** it is shown as not yet eligible, together with the date of its last turn and the world date at which it next becomes eligible.
3. **Given** a faction that acted at least one interval ago, **When** the GM opens it, **Then** it is eligible to act.
4. **Given** an ineligible faction, **When** the GM chooses to act anyway, **Then** the turn proceeds and the resulting history entry is marked as having overridden the pacing rule.
5. **Given** any completed or abandoned turn, **When** the GM inspects the campaign's current world date, **Then** it is unchanged from whatever they last set it to.
6. **Given** the GM moves the current world date backwards past a faction's last turn, **When** they open that faction, **Then** it is reported as not yet eligible and no error or repair prompt is raised.
7. **Given** a vault where no current world date has ever been set, **When** the GM opens a turn-enabled faction, **Then** the system explains that a current world date is required and offers to set one, and does not substitute the real-world date (FR-008a).
8. **Given** a vault whose only current date comes from the real-world clock, **When** the GM opens a turn-enabled faction, **Then** no faction is reported as eligible and the pacing override is not offered.

---

### User Story 3 — Take an Influence action and see why it turned out that way (Priority: P1)

The Black Eagles want to extend their reach over a settlement. The GM picks the Influence action, chooses the settlement as the target, and resolves it. The system produces an outcome — from a decisive success through to a backfire — and, crucially, shows the GM exactly how it got there: which stat was used, what opposed it, what was rolled, and which outcome band the result fell into.

Some GMs do not want randomness in their world simulation at all. The same action must be resolvable without dice, comparing the relevant stats directly, and the explanation must be equally legible in that mode.

**Why this priority**: This is the mechanical heart of the feature. An unexplainable outcome is worse than no outcome, because the GM cannot decide whether to trust or overrule it.

**Independent Test**: Resolve an Influence action against a target and confirm the outcome, the numbers behind it, and the resulting world change are all displayed together and are consistent with one another.

**Acceptance Scenarios**:

1. **Given** an eligible faction, **When** the GM chooses Influence, **Then** they are asked to select a target entity from their vault.
2. **Given** a selected target, **When** the action is resolved, **Then** the system produces exactly one outcome from the five bands: decisive success, success, mixed, failure, or backfire.
3. **Given** a resolved action, **When** the GM inspects it, **Then** they can see which stat the acting faction used, what opposed it, any modifiers applied, the random result if any, and the band the total fell into.
4. **Given** the vault is set to resolve without randomness and without AI band selection, **When** an action is resolved, **Then** no random element is used, the outcome follows only from the compared values and modifiers, and the same action against the same unchanged state produces the same outcome every time.
   4a. **Given** AI band selection is enabled and available, **When** an action is resolved, **Then** the final band is one the mechanics permitted, and the GM can see the mechanical band, the band used, and the reason for any difference.
   4b. **Given** AI is enabled but unreachable, **When** an action is resolved, **Then** the mechanical band stands, the account falls back to a local template, the preview says the mechanical result was used, and the turn commits normally.
   4c. **Given** AI returns a band the mechanics did not permit, **When** the result is applied, **Then** it is rejected, the mechanical band stands, and the turn still resolves.
5. **Given** an action targeting an entity with no faction stats of its own, **When** it is resolved, **Then** the opposition is derived from how strongly other factions already hold that target, or from the vault baseline if none do, and the breakdown states which of the two was used.
6. **Given** two otherwise identical targets, one already firmly held by a rival faction and one held by nobody, **When** each is influenced, **Then** the firmly held target presents the higher opposition.
7. **Given** a faction attempting to target itself, **When** the GM selects it, **Then** the system refuses the target with an explanation.

---

### User Story 4 — Review before anything changes, and undo afterwards (Priority: P1)

Before a single thing in the vault changes, the GM sees a summary of what the turn will do: the narrative outcome, the stat changes, and the relationship change to the target. They can commit it or throw it away. If they commit and later regret it, they can undo that turn and have the world put back.

**Why this priority**: The feature writes to entities and relationships the GM has authored by hand. Without review and reversal, a GM cannot safely try it even once.

**Independent Test**: Resolve a turn, discard it, and confirm nothing in the vault changed; resolve another, commit it, verify the changes landed, then undo it and verify the vault matches its pre-turn state.

**Acceptance Scenarios**:

1. **Given** a resolved action, **When** the preview is shown, **Then** nothing in the vault has yet been modified.
2. **Given** a preview, **When** the GM discards it, **Then** no stat, relationship, entity, or history record is created or changed.
3. **Given** a preview, **When** the GM commits it, **Then** the stat changes and the relationship strength shift are applied and a history entry is recorded.
   3a. **Given** a preview whose outcome suggests a relationship type change, **When** the GM commits without opting into it, **Then** the relationship keeps the type the GM authored and only its strength moves.
4. **Given** a committed turn that is the faction's most recent, **When** the GM undoes it, **Then** the stat values and the target relationship return to their pre-turn state and the history entry is marked as undone rather than erased.
5. **Given** a preview built against state that has since been edited elsewhere, **When** the GM commits it, **Then** the system detects the staleness, refuses to overwrite the newer state blindly, and offers to re-resolve against current state.
   5a. **Given** a commit that fails partway through, **When** the failure occurs, **Then** every write that already succeeded is rolled back, the vault matches its pre-commit state, and the GM is told the turn was not applied (FR-025a).
6. **Given** a committed turn whose affected entity has since been changed by hand, **When** the GM undoes it, **Then** the system warns that the reversal may not fully restore the entity and lets the GM proceed or cancel.
7. **Given** a committed turn that is not the faction's most recent, **When** the GM attempts to undo it, **Then** the system explains that only the most recent turn can be undone.

---

### User Story 5 — Look back at what a faction has done (Priority: P2)

Over several sessions the GM wants to see how the Black Eagles got where they are: a dated, chronological list of what they attempted, against whom, and how it went.

Separately, some of those moments matter enough to become part of the campaign's actual chronicle. The GM can promote any turn into an event so it appears alongside their hand-authored history. This never happens automatically — a faction's routine manoeuvring should not flood the GM's timeline.

**Why this priority**: History is what makes the world feel like it has been moving. It is P2 only because a single turn delivers value before the history view exists, but the feature is not complete without it.

**Independent Test**: Take several turns across different world dates, open the history view, and confirm each turn appears with its date, action, target and outcome in chronological order — and that the campaign timeline stays untouched until the GM promotes something.

**Acceptance Scenarios**:

1. **Given** a faction with committed turns, **When** the GM opens its history, **Then** each turn is listed with the world date it occurred, the action, the target, and the outcome.
2. **Given** turns taken at different world dates, **When** the history is displayed, **Then** entries appear in chronological order.
3. **Given** a committed turn, **When** the GM has taken no promotion action, **Then** no event exists for it and the campaign timeline is unchanged.
4. **Given** a turn in the history, **When** the GM promotes it, **Then** an event is created carrying that turn's date, outcome and participants, and it becomes visible wherever the campaign's chronology is displayed.
5. **Given** a turn already promoted, **When** the GM views it, **Then** it is shown as promoted and cannot be promoted a second time.
6. **Given** a promoted turn, **When** that turn is undone, **Then** the GM is told an event exists for it and can choose whether to remove it.
7. **Given** a faction with no committed turns, **When** the GM opens its history, **Then** an explanation of what history will contain is shown rather than an empty area.

---

### Edge Cases

- The target entity is deleted between preview and commit — the commit is refused with an explanation rather than creating a dangling relationship.
- The target entity is deleted after a turn was committed — the history entry survives and displays the target by its recorded name.
- The acting faction's stat set is edited between preview and commit — treated as stale state, as in User Story 4.
- A role is remapped to a different stat after turns have been taken — past history keeps the values recorded at the time and is not retroactively reinterpreted.
- A stat change would take a value below its minimum or above its maximum — the value is clamped and the history entry records the clamping so the GM can see the effect was capped.
- The acting faction and target already have a relationship — the action modifies the existing relationship rather than creating a duplicate.
- The GM has authored a relationship pointing from the target back to the faction — it is left untouched, and it does not count as the faction holding the target.
- A faction's hold on a target is already at its maximum and the outcome would raise it further — the strength is clamped, and the turn still records the stat change and history entry so the attempt is visible.
- The GM changes the vault's turn interval after turns have been taken — eligibility is recomputed against the new interval; existing history is unaffected.
- The vault's calendar is reconfigured such that a recorded turn date is no longer valid — the history entry still displays, labelled as having an unresolvable date, consistent with how the vault already handles undated history.
- The GM takes a turn, undoes it, and takes another — eligibility is based on the most recent turn that has not been undone.
- Two browser tabs are open on the same vault, each holding its own preview for the same faction — the first commits normally and the second is caught by staleness detection rather than silently overwriting it.
- The GM reloads the page with a preview open — the preview is gone on return, with nothing committed and nothing left behind to clean up.
- AI is unreachable or rate-limited when a turn is resolved — the mechanical band stands, narration falls back to a template, the preview says so, and the turn commits normally.
- AI returns a band outside the permitted range, or text that cannot be parsed — the mechanical band stands and the turn resolves without surfacing an error the GM must act on.
- AI is enabled but the vault has no working provider configured — the GM is told once, and turns continue to resolve mechanically rather than prompting on every turn.
- The GM edits the narrative account, then re-resolves — the edited text belongs to the discarded preview and is not carried onto the new result.
- A commit fails partway through, after the stats were written but before the relationship or history entry landed — the successful writes are rolled back, the vault matches its pre-commit state, and the GM is told the turn was not applied.
- A vault has no GM-set current date at all, so the only date available is the real-world clock — the faction reports no current world date, offers to set one, and does not fall back to the present-day year.

## Requirements _(mandatory)_

### Functional Requirements

**Opt-in and stats**

- **FR-001**: A faction MUST be able to opt into the faction turn layer, and MUST be able to opt out again without losing recorded history.
- **FR-002**: Factions that have not opted in MUST behave exactly as they do today, with no turn-related interface elements presented anywhere.
- **FR-003**: A turn-enabled faction MUST have a set of named, numeric stats that the GM can rename, score, and bound with minimum and maximum values.
- **FR-004**: The system MUST define exactly four roles — power, influence, resources, and stability — as the vocabulary actions use to refer to stats.
- **FR-004a**: The GM MUST be able to declare which of their stats fulfils each role, so that stat naming remains free of any particular genre's vocabulary. Roles that no available action uses MAY be left unmapped.
- **FR-005**: The system MUST refuse to resolve an action when a role that action requires is unmapped, and MUST state which role is missing. It MUST NOT require roles unrelated to the action being taken.

**World clock and eligibility**

- **FR-006**: The system MUST NOT modify the campaign's current world date under any circumstance.
- **FR-007**: The campaign MUST have a current world date that the GM sets, expressible at a finer granularity than year alone.
- **FR-008**: Existing vaults that have only ever set a current year MUST continue to work, with that year treated as the current world date.
- **FR-008a**: When the only available "current date" derives from the real-world clock rather than from anything the GM set, the system MUST treat the campaign as having **no** current world date. It MUST NOT compute eligibility from it, MUST NOT stamp history with it, and MUST NOT offer the pacing override — because a real-world year is not campaign time and would silently make every faction eligible forever.
- **FR-009**: A vault MUST have a configurable minimum amount of world time between one faction's turns.
- **FR-010**: The system MUST determine a faction's eligibility by comparing the current world date against the date of that faction's most recent turn that has not been undone.
- **FR-011**: A faction that has never taken a turn MUST always be eligible.
- **FR-012**: When a faction is ineligible, the system MUST show the date of its last turn and the world date at which it next becomes eligible.
- **FR-013**: The GM MUST be able to override the pacing rule and act anyway; any turn taken this way MUST be recorded as an override.
- **FR-014**: A current world date earlier than a faction's last turn MUST result in ineligibility, not an error or a repair prompt.

**Action and resolution**

- **FR-015**: The system MUST provide the Influence action, in which a faction attempts to extend its sway over a target entity.
- **FR-016**: The GM MUST be able to select any entity in the vault as the target, except the acting faction itself.
- **FR-017**: Resolution MUST produce exactly one outcome from five ordered bands: **decisive success**, **success**, **mixed**, **failure**, **backfire**.
- **FR-017a**: The two success bands MUST shift relationship strength toward the acting faction, the two failure bands MUST shift it away, and the mixed band MUST produce the smallest movement of any band.
- **FR-017b**: The magnitude of change MUST be monotonic across the ordered bands, so that a decisive success never moves the world less than a success, and a backfire never moves it less than a failure.
- **FR-018**: Resolution MUST record, and the interface MUST display, every input that produced the outcome: the acting stat and its value, the opposing value and where it came from, each modifier applied, the random result if any, the final total, the band it fell into, and the permitted range around that band.
- **FR-019**: The system MUST offer a mode in which resolution uses no randomness. With randomness and AI band selection both switched off, identical inputs MUST always produce an identical band and identical changes.
- **FR-019a**: The Influence action MUST use the acting faction's **influence** role as its acting value. These are the only two roles Influence requires, the other being the opposing role in FR-020.
- **FR-020**: The opposing value for Influence MUST be determined as follows, and the interface MUST show which of the three applied:
  - **FR-020a**: When the target is a turn-enabled faction, the opposition is that faction's **stability**.
  - **FR-020b**: Otherwise, when other turn-enabled factions already hold the target — that is, they have a relationship directed at it — the opposition is derived from the strength of that existing hold, and MUST increase as that hold strengthens. Relationships directed the other way, from the target toward a faction, MUST NOT count as a hold.
  - **FR-020c**: Otherwise, the opposition is a vault-wide baseline value the GM can adjust. A target held by no faction MUST resist at **exactly** that baseline, so an unclaimed target is always the easiest to influence.
- **FR-021**: Randomness, when used, MUST come from the same mechanism the rest of the application uses for dice, so that results are consistent with the GM's expectations elsewhere.

**AI participation**

- **FR-021a**: Mechanics MUST always compute an outcome band from the resolution, together with a permitted range of bands around it. That range MUST extend no more than one band in either direction.
- **FR-021b**: When AI band selection is enabled and available, the AI MUST choose the final band from within the permitted range and MUST supply a reason for its choice, drawn from the situation rather than the dice.
- **FR-021c**: A band the AI returns that falls outside the permitted range, or that cannot be understood, MUST be rejected, and the mechanically computed band MUST stand. The turn MUST still resolve.
- **FR-021d**: When AI is switched off, unreachable, rate-limited, or slow enough to interrupt the GM, the mechanically computed band MUST stand and narration MUST fall back to a local template. A turn MUST never be blocked by AI being unavailable.
- **FR-021e**: AI MUST NOT determine the magnitude of any change, alter any stat, relationship, or history value, or affect eligibility. Its only effects are selecting a band within the permitted range and producing text.
- **FR-021f**: The GM MUST be able to switch AI band selection and AI narration off independently, for the whole vault.
- **FR-021g**: The preview MUST show the mechanically computed band, the band actually used, and — when the two differ — the reason the AI gave for moving it.
- **FR-021h**: The narrative account MUST be editable by the GM before committing, and the edited text MUST be what is stored and what any promoted event carries.

**Preview, commit, reverse**

- **FR-022**: Resolution MUST produce a preview that changes nothing in the vault.
- **FR-022a**: A preview MUST be transient. It MUST NOT be persisted, synced, or restored, and it exists only for as long as the view that created it. Leaving that view or reloading discards it.
- **FR-022b**: When the GM navigates away from an unreviewed preview within the application, the system MUST confirm before discarding it, so that a resolved turn is not lost by accident.
- **FR-023**: The preview MUST show the narrative outcome, every stat change with its before and after value, the relationship strength shift with its before and after value, and any relationship type change offered for the GM to opt into.
- **FR-024**: Discarding a preview MUST leave the vault entirely unmodified.
- **FR-025**: Committing MUST apply the previewed changes and record a history entry, as a single operation that either fully succeeds or leaves the vault unchanged.
- **FR-025a**: A commit writes to more than one place — the acting faction's stats, the relationship to the target, and the history entry. If any of those writes fails, the system MUST undo the writes that already succeeded, leaving the vault exactly as it was before the commit began, and MUST tell the GM the turn was not applied. A partially applied turn is never an acceptable end state, because the GM has no history entry to undo it with.
- **FR-026**: Committing MUST detect that the underlying state changed after the preview was built, and MUST offer to re-resolve rather than overwrite.
- **FR-027**: Each committed turn MUST retain enough information to reverse itself.
- **FR-028**: The GM MUST be able to undo a faction's most recent committed turn, restoring the affected stat values and target relationship.
- **FR-029**: An undone turn MUST remain visible in history, marked as undone, rather than being deleted.
- **FR-030**: When the entities affected by a turn have changed since it was committed, undo MUST warn that restoration may be incomplete and let the GM decide whether to continue.

**World changes**

- **FR-031**: Committing MUST adjust the acting faction's **influence** stat by an amount determined by the outcome band, so that a faction's standing grows on success and erodes on failure.
- **FR-032**: Committing MUST shift the **strength** of the single relationship directed from the acting faction to the target, using the vault's existing relationship model rather than a separate store of faction-only state. That strength means how firmly the acting faction holds the target: successful bands raise it, failing bands lower it.
- **FR-032c**: Committing MUST NOT create or modify any relationship directed from the target back to the acting faction. A relationship the GM authored in that direction MUST be left exactly as it is.
- **FR-032a**: The magnitude of both the stat change and the strength shift MUST be determined solely by the outcome band, so that the same band always produces the same magnitude.
- **FR-032b**: The system MUST NOT change a relationship's **type** automatically. Where an outcome suggests a type change is warranted, the preview MAY offer it as a change the GM explicitly opts into, and the GM's decision MUST be recorded with the turn.
- **FR-033**: When a relationship already runs from the acting faction to the target, it MUST be modified in place rather than duplicated. When none exists, committing MUST create one at neutral type. An existing relationship in the opposite direction MUST NOT be treated as the one to modify.
- **FR-034**: Stat changes MUST respect the minimum and maximum bounds the GM set, and relationship strength MUST respect the bounds of the vault's relationship model. Any clamping MUST be recorded and shown.
- **FR-034a**: A clamped change MUST still be reversible to the exact value held before the turn.

**History**

- **FR-035**: Every committed turn MUST be recorded with the world date it occurred, the action, the target, the outcome band, the full resolution detail, the resulting changes, and the narrative account as the GM left it.
- **FR-035a**: A turn record MUST state whether the band was the mechanical result or an AI selection, and when it was an AI selection MUST retain both the mechanical band and the reason given, so that the outcome stays explainable long after the fact.
- **FR-036**: A faction MUST present its turn history in chronological order.
- **FR-037**: History entries MUST NOT create events automatically.
- **FR-038**: The GM MUST be able to promote any history entry into an event carrying that turn's date, outcome and participants, and a given entry MUST be promotable only once.
- **FR-039**: A promoted turn MUST be linked to the event it produced, so that undoing the turn can tell the GM the event exists and offer to remove it.
- **FR-040**: A history entry MUST remain readable after its target entity has been deleted.
- **FR-041**: Turn history MUST NOT be pruned, capped, or trimmed by the system. Every entry MUST retain its full resolution detail indefinitely, so that any turn can still be explained and the oldest history of a long campaign is never lost.
- **FR-042**: The history view MUST remain responsive at the scale a long campaign produces, without the GM needing to manage or archive entries.

### Key Entities

- **Faction turn configuration**: Per faction. Whether the layer is on, which stat fulfils each of the four roles (power, influence, resources, stability — individually optional, required only when an action uses them), and the date of the most recent turn taken that has not been undone. Absent on factions that have not opted in.
- **Faction stats**: The named, bounded, numeric values describing what a faction can bring to bear. Authored and named by the GM.
- **Faction action**: A kind of thing a faction can attempt. This slice defines one: Influence. Each action declares which role it uses, what it opposes, and how outcomes translate into world changes.
- **Turn resolution**: The complete record of how one action was decided — inputs, modifiers, randomness, total, the mechanically computed band, the permitted range, the band finally used, and the reason if AI moved it. Retained so an outcome can always be explained after the fact.
- **Narrative account**: The prose describing what happened, written by AI or by local template, editable by the GM before commit, and stored with the turn.
- **Turn proposal**: The uncommitted result of a resolution: the outcome, the changes it would make, and a marker of the state it was built against. Transient and never persisted — discarded or committed, never partially applied.
- **Turn record**: A committed turn as it appears in history — date, action, target, outcome, resolution detail, the changes applied, the information needed to reverse them, whether it was an override, whether it has been undone, and any event promoted from it.
- **Campaign turn settings**: Per vault. The minimum world time between a faction's turns, whether resolution uses randomness, whether AI band selection and AI narration are each enabled, and the baseline opposition used when a target is held by no faction.
- **Current world date**: Per vault. The GM's declaration of when "now" is in their campaign. Read by this feature, never written by it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A GM can take a faction from never having used the feature to a committed, recorded turn in under three minutes without consulting documentation.
- **SC-002**: For every resolved action, the GM can state which stat was used, what opposed it, and why the outcome landed where it did, using only what the interface shows.
- **SC-003**: No sequence of actions available in this feature changes the campaign's current world date.
- **SC-004**: Discarding a preview leaves the vault in exactly its pre-resolution state, with no stat, relationship, entity or history change of any kind, verified across all five outcome bands.
- **SC-005**: Undoing the most recent committed turn restores the affected stat values and relationship strength to their pre-turn state, verified across all five outcome bands, including cases where the change was clamped at a bound.
- **SC-006**: With randomness and AI band selection both disabled, the same action resolved against the same unchanged state produces the same band and the same changes on every attempt.
- **SC-012**: Every turn resolves and commits with AI unreachable, and the GM can tell from the preview that the mechanical result was used.
- **SC-007**: Committing a turn built on stale state never silently overwrites the newer state.
- **SC-008**: A vault containing factions that have not opted in shows no behavioural or visual difference from before the feature existed.
- **SC-009**: No event is created anywhere in the vault except by explicit GM promotion.
- **SC-010**: A faction's history remains legible after its targets have been deleted and after the vault's calendar has been reconfigured.
- **SC-011**: A faction carrying 500 recorded turns opens its history in under 200 ms and takes a new turn with no added delay, and the oldest of those entries can still be explained in full.

## Assumptions

- The GM is the only actor; this feature has no player-facing surface in this slice.
- A faction is an entity of the existing faction category; no new top-level concept is introduced for it.
- Faction relationships continue to use the vault's existing relationship model, extended in meaning rather than replaced.
- Stats reuse the vault's existing mechanism for structured numeric fields on an entity, so that GMs can rename and bound them with tools they already know.
- Turn history is stored with the faction. Events are produced only on promotion, keeping the campaign timeline authored rather than generated.
- Turn history grows without bound. The realistic magnitude is tens of records per faction per campaign year and order-of-hundreds over a campaign's life, which is the scale storage, synchronisation and rendering should be sized against. Vaults with thousands of records per faction are not an expected shape.
- "One interval of world time" is expressed in the units the vault's own calendar defines.
- Reversal is offered for the most recent turn only. Arbitrary rollback through history is not required at this stage.
- Multi-device synchronisation of turn state follows whatever the vault already does for entity data; this feature introduces no separate synchronisation path.
- The outcome ruleset — the five bands, their thresholds, and their magnitudes — is defined by the product in this slice, with values tunable during development. It is not GM-authored content yet.
- AI participates in resolution in two bounded ways: choosing the final outcome band from within a mechanically determined range, and writing the narrative account. The feature MUST remain fully usable without it — every step works offline, band selection falls back to the mechanical result, and narration falls back to a local template.

## Dependencies

- The vault's existing resolved current world date, which already provides day precision. No extension of the calendar is required.
- The vault's existing structured-numeric-field mechanism for entities, including its minimum, maximum and bounding behaviour.
- The vault's existing relationship model between entities.
- The vault's existing randomness mechanism for dice results.
- The vault's existing event and chronology display, used only when the GM promotes a turn.
- The vault's existing AI provider routing, for band selection and narration. This dependency is optional at run time: every part of the feature works without it.

## Out of Scope

The following are recognised parts of issue #2396 and are deliberately deferred until this slice has proven the pipeline:

- Any action beyond Influence — Attack, Expand, Scheme, Acquire, Fortify, Recover, Negotiate, Pursue Goal.
- Faction assets as structured, targetable things.
- Faction goals as structured records linked to entities.
- Resolving several factions in one pass, and any campaign-level World Turn screen or digest.
- AI **proposing which action to take or which target to choose**, and fully simulated turns. AI's role in this slice is limited to selecting the outcome band within mechanical bounds and narrating it, once the GM has already chosen the action and target.
- Exposing faction state and history as context to Oracle, AI GM, or Adventure Mode.
- Generating adventure hooks from turn outcomes.
- Any automatic advancement of the campaign's world clock.
- A **GM-authored outcome ruleset**. Expressing the bands, thresholds and magnitudes as an editable, shareable table — so a vault can define its own resolution rules the way it defines its own random tables — is a deliberate follow-up. Building the authoring format before a single action has been played would freeze a shape we cannot yet judge.
