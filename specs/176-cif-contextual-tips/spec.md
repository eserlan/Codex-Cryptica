# Feature Specification: Cif Contextual Tips

**Feature Branch**: `4019-cif-contextual-tips`
**Created**: 2026-10-13
**Status**: Draft
**Input**: Cif onboarding P2 (#3998): goal-aware contextual feature discovery after first success. Parent epic #3994.

## Summary

After someone has finished, or deliberately left, the guided first-session setup, Cif can offer **one small, dismissible tip** about a capability that suits the goal they chose. It is the first time Cif speaks first, so it is strictly opt-in, free of any AI call until tapped, and driven only by what the person chose and what the app already knows locally. Nothing in the vault is read, and nothing is inferred from how someone types or clicks.

This builds the one "Show tips from Cif" setting that the deferred "Proactive help" design in `specs/3427-contextual-ai-help-assistant/spec.md` described. #3765 was closed as not planned, so no setting, chip or dismissal rule exists to reuse. They are designed once, here.

## Clarifications

### Session 2026-10-13

- Q: Does choosing a goal in the first-run invitation count as opting in to tips? → A: No. Choosing a goal never turns tips on. When the guided setup finishes or is left, Cif asks once, inline, whether the person wants occasional tips (Yes or No). Yes turns the setting on; No leaves it off. The question is never asked again, and the Settings switch stays the only place to change the answer.
- Q: How many tips can a person see in total, across all screens, before Cif goes quiet for the session? → A: At most one tip per session in total; the next tip waits for the next session.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Turn tips on or off (Priority: P1)

As a person who uses AI features, I can switch **Show tips from Cif** on or off in Settings, next to the AI controls. It is off unless I turn it on, either here or by answering Yes to the one-time question when my guided setup ends. If I disable AI, tips are off and the switch is hidden.

**Why this priority**: Every other story depends on consent. Without a clear, working off switch, no tip may ever appear.

**Independent Test**: Open Settings, find the switch, toggle it, reload, and check the choice stuck. Disable AI and check the switch disappears and no tip can show.

**Acceptance Scenarios**:

1. **Given** a fresh device, **When** I open Settings, **Then** the switch is off and no tip has ever appeared.
2. **Given** tips are on, **When** I disable AI, **Then** the switch is hidden, tips stop, and turning AI back on does not silently turn tips back on.
3. **Given** I turned tips on, **When** I reload or reopen the app on the same device, **Then** the choice is kept; it is never part of the vault and is not synced.
4. **Given** tips are off, **When** I use the app normally, **Then** nothing about tips is visible anywhere except the setting itself and the one-time question in scenario 5.
5. **Given** I chose a goal and my guided setup has just finished or been left, **When** the setup card closes, **Then** I am asked once, inline and without a dialog, "Want occasional tips from Cif?" with **Yes** and **No**; Yes turns the setting on, No leaves it off, and either answer means I am never asked again.
6. **Given** I never answered the question (closed it, or the setup card was dismissed), **When** I use the app, **Then** tips stay off and I am not asked again on this device.
7. **Given** AI is disabled or Cif is unavailable, **When** my setup ends, **Then** the question is not shown.

---

### User Story 2 - See one relevant next step (Priority: P1)

As someone who chose a goal (build a world, write a story or prepare an RPG campaign) and has finished or left the guided setup, I see at most one small "Cif has a tip" chip beside the Cif button, suggesting a feature that fits my goal and is actually available. Tapping it opens Cif with a matching question already asked, or opens the matching short guide when Cif cannot answer.

**Why this priority**: This is the whole point: a useful nudge after first success, without another tour.

**Independent Test**: Choose each goal, finish or leave setup, turn tips on, and check the chip names a feature for that goal. Check that merely showing the chip makes no AI request and that tapping it does what the label says.

**Acceptance Scenarios**:

1. **Given** tips are on, I chose "Build a world" and finished setup, **When** I am on a screen where a world-building suggestion applies, **Then** one chip suggests it (for example the generators or the map).
2. **Given** the same state with "Write a story" or "Prepare an RPG campaign", **When** a suitable screen is shown, **Then** the chip suggests something for that goal (organising or visualising notes for writers; the map, VTT or session tools for game masters).
3. **Given** a chip is showing, **When** I do nothing, **Then** no request is sent anywhere and nothing opens.
4. **Given** a chip is showing, **When** I tap it, **Then** Cif opens with a verified question for that screen already asked; or, if Cif or AI is unavailable, the matching static guide opens instead.
5. **Given** the suggested feature is not available (for example its control is not on this screen, or it is turned off), **When** the moment would otherwise show a chip, **Then** no chip is shown.

---

### User Story 3 - Quiet by design (Priority: P1)

As someone who is busy, I am never interrupted. A tip never appears while I am typing, while a dialog or guided tour or journey is open, or while the Cif conversation is open. It is announced politely once, never moves focus, and respects reduced motion.

**Why this priority**: A tip that interrupts work breaks the promise made in the epic ("a small, dismissible invitation, not modal spam").

**Independent Test**: Trigger each blocking situation in turn and confirm no chip appears; confirm focus stays where it was when a chip does appear.

**Acceptance Scenarios**:

1. **Given** I am typing in a field, **When** a tip would otherwise be due, **Then** it waits until I stop and the field is no longer focused.
2. **Given** a dialog, a tour, a guided journey or the Cif panel (docked or pop-out) is open, **When** a tip would otherwise be due, **Then** it does not appear.
3. **Given** a chip appears, **When** I use a screen reader, **Then** it is announced once, politely, and keyboard focus has not moved.
4. **Given** I prefer reduced motion, **When** a chip appears or goes away, **Then** it does so without movement.
5. **Given** a phone-sized screen, **When** a chip appears, **Then** it does not cover the controls I am using and its tap target is at least 44px.

---

### User Story 4 - Dismissals are respected (Priority: P2)

As someone who does not want a tip, I can dismiss it. A dismissed tip does not come back, and if I keep dismissing, tips go quiet for good until I turn the setting off and on again.

**Why this priority**: Without this the feature turns into nagging, but the core value is delivered by Stories 1 to 3.

**Independent Test**: Dismiss a chip and check it is gone and stays gone after a reload; dismiss twice on one screen and check that screen is silenced; turn the setting off and on and check tips can return.

**Acceptance Scenarios**:

1. **Given** a chip is showing, **When** I dismiss it, **Then** it disappears and that tip does not show again on this device.
2. **Given** I dismissed tips twice on one screen, **When** I return to that screen, **Then** no tip appears there.
3. **Given** tips were silenced, **When** I turn the setting off and on again, **Then** tips may appear again.
4. **Given** I tapped a tip and used it, **When** I return, **Then** that tip is treated as finished and is not offered again.

---

### User Story 5 - Nothing for people who did not pick a goal (Priority: P2)

As someone who chose "Explore on my own" or dismissed the invitation, I get no goal-based tips, because I never said what I want to do.

**Why this priority**: Guessing a goal would be profiling. It protects the privacy line and keeps unassisted users unassisted.

**Independent Test**: Choose "Explore on my own", turn tips on, and use the app: no goal-based chip appears.

**Acceptance Scenarios**:

1. **Given** I chose "Explore on my own", **When** tips are on, **Then** no goal-based tip appears.
2. **Given** I dismissed the invitation without choosing, **When** tips are on, **Then** no goal-based tip appears.
3. **Given** I change my goal later through Getting Started, **When** a tip is next due, **Then** it follows the new goal.

### Edge Cases

- A person finishes setup in one vault and opens another: the goal is a per-device choice, but "setup finished or left" is per vault, so a tip shows only where that vault's setup has finished or been left.
- A person who skipped setup but chose a goal: tips begin once the setup is left, not before.
- The tip's screen is reached while Cif is loading or unavailable: the static guide route is used, or no chip is shown when neither exists.
- A feature registered for a tip has been renamed or removed: its tip is dropped silently; there is no chip to nowhere.
- A goal has no available, unseen tip left: nothing is shown; tips do not repeat to fill the gap.
- Several rules apply at once (blocked by a dialog and silenced): the most restrictive wins; there is never a queue of tips waiting to appear when a block ends.
- AI is disabled mid-session while a chip is showing: the chip is removed.
- Two windows (the docked panel and the pop-out) are open: only one chip is ever shown.
- Storage is unavailable or cleared: tips behave as off and nothing breaks.

## Requirements _(mandatory)_

### Functional Requirements

**Setting and consent**

- **FR-001**: The system MUST provide exactly one setting, **Show tips from Cif**, off by default, placed in Settings beside the AI controls.
- **FR-002**: The setting MUST be forced off, and its switch hidden, whenever AI is disabled or Cif is unavailable.
- **FR-003**: The setting MUST be stored on the device like other interface preferences. It MUST NOT be part of the vault, synced, or sent anywhere.
- **FR-004**: Turning AI back on MUST NOT turn tips back on by itself.
- **FR-005**: No tip, chip or tip-related message of any kind MUST appear while the setting is off.
- **FR-006**: Choosing a goal MUST NOT turn the setting on. When the guided setup finishes or is consciously left, the system MUST ask once, inline and non-modally, whether the person wants occasional tips; Yes turns the setting on, No leaves it off. The question MUST NOT be shown again after any answer or dismissal, MUST NOT be shown when AI is disabled or Cif is unavailable, and MUST NOT make any AI request.

**What a tip is and when it may show**

- **FR-007**: A tip MUST be a compact "Cif has a tip" chip beside the Cif button. It MUST NOT be a modal, a pop-up over work, a banner, or an automatically opened panel or chat.
- **FR-008**: At most one tip MUST be shown per session in total, across all screens, and never more than one visible at any moment. A tip that is blocked or dismissed uses up nothing until it has actually been shown.
- **FR-009**: A tip MAY appear only after the first-session setup for the current vault is finished or has been consciously left.
- **FR-010**: The choice of tip MUST be decided only from: the goal the person selected, a fixed list of verified feature identifiers, the screen the person is on, and the existing local milestones.
- **FR-011**: The system MUST NOT read vault content (entry names, text, links, images) to choose, word or time a tip.
- **FR-012**: The system MUST NOT watch typing or clicking, measure idle time, or infer that someone is stuck or frustrated.
- **FR-013**: A tip MUST suggest a capability that fits the selected goal and is available on the current screen. If none qualifies, nothing is shown.
- **FR-014**: A tip MUST NOT appear while a dialog is open, a text field is focused, a tour or guided journey is running, or the Cif conversation is open in the panel or the pop-out.
- **FR-015**: A tip that is blocked MUST NOT be queued or shown later in a burst when the block ends.
- **FR-016**: Tip text MUST be fixed, plain-language copy written by us, never built from the vault.

**Using a tip**

- **FR-017**: Showing a tip MUST NOT make any AI request or send anything to any service.
- **FR-018**: Tapping a tip MUST open Cif with a verified, existing quick prompt for that screen already asked, or, when Cif or AI cannot answer, the matching static guide.
- **FR-019**: A tip MUST NOT run any action that changes the vault, and MUST NOT be a means to create, edit or delete content.
- **FR-020**: Every tip MUST map to a registered feature and a prompt or guide that is covered by tests; an unverified tip MUST NOT ship.

**Dismissal and quiet**

- **FR-021**: A chip MUST be dismissible by mouse, touch and keyboard, with no more than one action.
- **FR-022**: A dismissed tip MUST NOT return on this device. A tip the person acted on MUST NOT return either.
- **FR-023**: Dismissing tips twice on one screen MUST silence tips on that screen until the setting is turned off and on again.
- **FR-024**: People who chose "Explore on my own", or dismissed the invitation, MUST NOT receive goal-based tips.
- **FR-025**: Changing the goal later MUST change which tips are eligible from then on, without resetting what was already dismissed.

**Accessibility**

- **FR-026**: A chip MUST be announced once, politely, MUST NOT move keyboard focus, and MUST have an accessible name matching its visible label.
- **FR-027**: A chip MUST respect reduced motion, work on phone, tablet and desktop, have a tap target of at least 44px, and meet the text contrast used elsewhere in the app.
- **FR-028**: The setting and its explanation MUST be readable by a screen reader and operable by keyboard alone.

**Reuse and boundaries**

- **FR-029**: The feature MUST reuse the existing goal choice, per-vault journey progress, milestones, Cif quick prompts and guidance actions. It MUST NOT add a second tour, a second banner system, or a second progress record.
- **FR-030**: Cif MUST remain a guide to using Codex Cryptica; tips MUST NOT suggest in-world or campaign content (that belongs to the Oracle).
- **FR-031**: If storage is unavailable or its contents are unreadable, tips MUST behave as off and the app MUST continue normally.

### Key Entities

- **Tips preference**: a device-level on/off choice with a "silenced" state, plus a record that the one-time question was answered or dismissed. Not part of any vault.
- **Tip**: a fixed, tested suggestion tied to a goal, a screen, a registered feature, and a Cif question or static guide.
- **Tip history**: a small device-local record of which tips were shown, acted on or dismissed, and how many times a screen was dismissed. It holds identifiers only, never text or vault data.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: With the setting off, there are zero tips across every screen, goal and device size (verified by tests).
- **SC-002**: Showing a tip causes zero AI requests and zero network requests of any kind (verified by tests).
- **SC-003**: In every blocked situation (typing, dialog, tour, journey, open Cif panel or pop-out), zero chips appear (verified by tests).
- **SC-004**: A person sees no more than one tip per session in total, and never more than one chip at a time.
- **SC-005**: A dismissed tip never reappears on the same device, and a screen dismissed twice stays silent until the setting is cycled.
- **SC-006**: 100% of shipped tips map to a registered feature and a covered prompt or guide; removing a feature removes its tip with no broken chip.
- **SC-007**: A tip chip and its setting are fully usable by keyboard and screen reader, and pass the app's existing accessibility checks at phone, tablet and desktop widths.
- **SC-008**: No tip logic reads vault content, and no tip-related data leaves the device (verified by tests and review).

## Assumptions

- The first-run goal choice, per-vault journey progress and "finished or left" outcome from `175-cif-guided-onboarding` are the inputs; this feature does not change them.
- "Available" means the registered feature exists and its target can be reached from the current screen; it does not mean the person has permission to use it.
- Tip content is limited to a small, hand-written set (a few per goal). More are added later through the same registry and tests.
- "Setup finished or left" for tip purposes means the journey outcome is finished or exited, or the person chose a goal and then closed the card; skipping the invitation without a goal counts as "no goal".
- A "session" is one visit to the app, from opening it until the tab or window is closed; a reload within it is the same session.
- English only, British spelling, matching the rest of the app.
- Out of scope: resuming journeys on a later visit and gradually quieter guidance (#3999), measurement or analytics of tips, tips for people without a goal, tips driven by vault content or behaviour, and any tip that changes the vault.
