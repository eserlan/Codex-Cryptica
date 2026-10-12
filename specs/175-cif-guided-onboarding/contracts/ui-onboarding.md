# Contract: onboarding UI (invitation, journey card, Getting Started)

All components use Svelte 5 runes, Tailwind 4 semantic tokens and Iconify classes (`icon-[lucide--…]`), per `docs/STYLE_GUIDE.md`. User-facing text is plain language (Constitution IX), and Cif is described as the guide to using the app, never as a content source.

## `GoalInvitation.svelte`

- A non-modal card: no backdrop and no focus trap. Placement: bottom-centre on desktop and tablet, a bottom sheet on phone. Labelled region: `role="dialog"`, `aria-modal="false"`, `aria-labelledby` the heading.
- Heading: "What would you like to do first?" One line: "Cif shows you how Codex Cryptica works. The Oracle helps with ideas for your world."
- Four buttons in this order: Build a world · Write a story · Prepare an RPG campaign · Explore on my own. Plus a close button labelled "Close".
- When it appears, focus moves to the heading only if no editable element has focus (FR-027). Otherwise it is announced politely through a live region.
- Escape and Close → `goalInvitation = "dismissed"`. Focus returns to the element that had it before the invitation, or to the main content. Explore → `"explore"`, then the card swaps to a short confirmation offering "Take the short tour" (starts `initial-onboarding`) and "No thanks", and noting that guided setup is in Help → Getting Started. A goal → `"goal"`, `chosenGoal`, and the journey starts.
- `data-testid`s: `goal-invitation`, `goal-invitation-world|story|campaign|explore`, `goal-invitation-close`, `goal-invitation-tour`.
- Sends no network request (checked by an E2E network assertion).

## `JourneyCard.svelte`

- Docked bottom-right on desktop and tablet (max width 22rem). On phone, a short bottom sheet above the activity bar. It must not cover the control the current step highlights: when a highlight rect overlaps the card, the card moves to the opposite corner or edge.
- Never dims or blocks the page. Never opens the Cif panel. Rendered in the main window only.
- Content: journey title, "Step n of N", the current step's instruction (or `anyEntryCopy`), the step's done or skipped state, and these buttons:
  - **Show me** (only when the step has `showMe`). On `false`, the fallback text replaces the instruction and is announced.
  - **Ask Cif** (only when the step has `quickPrompt` and Cif is available with AI enabled). Opens Cif and asks that prompt straight away, the same as tapping a quick prompt (#3616). This tap is the user's explicit request, and it is the only path in this feature that can send an AI request (FR-017).
  - **Back** (disabled on the first step in journey order), **Skip** (hidden when the step on screen is already done), and **Exit** (labelled "Stop guided setup").
  - **Back to current step** (only while Back has moved away from the first step not yet done). It clears `viewing`.
- **Escape** with focus inside the card collapses it to the pill and moves focus to the pill. It never exits the journey. Escape with focus elsewhere is ignored by the card, so open dialogs keep their own Escape.
- Finish state: a message naming what the user did, an optional single `next` button, and **Done**.
- A collapse toggle minimises the card to a small pill ("Guided setup · 2/4") that stays keyboard-reachable. Expanding restores it. Collapse state is kept for the session only.
- Live region (`aria-live="polite"`): announces step changes and completions ("Step done: Add a place"). Never moves focus on completion.
- Every interactive target is at least 44×44 px.
- `data-testid`s: `journey-card`, `journey-step-instruction`, `journey-show-me`, `journey-ask-cif`, `journey-back`, `journey-skip`, `journey-exit`, `journey-finish`, `journey-next`, `journey-done`, `journey-collapse`, `journey-return-current`.

## `GettingStartedChecklist.svelte` additions

- A new "Guided setup" group above the existing checklist items: three buttons ("Build a world", "Write a story", "Prepare an RPG campaign"). For the active vault's journey, it also offers **Continue** (when exited and unfinished) and **Start over**.
- Starting a journey closes Help so the card and highlights are visible.
- Hidden in the standalone `/help` window (no app shell), the same rule `HelpHeader` uses for the tour replay.
- `data-testid`s: `guided-setup`, `guided-setup-world|story|campaign`, `guided-setup-continue`, `guided-setup-start-over`.
- Reachable in 2 taps or fewer from opening Help (SC-007).

## `OnboardingHost.svelte`

- Holds the first-run decision effect that currently lives in `(app)/+layout.svelte`, moved here unchanged except for the new action kind. It mounts `GoalInvitation` and `JourneyCard` and wires the journey store to the milestone adapter. The layout replaces its effect with `<OnboardingHost />`.
