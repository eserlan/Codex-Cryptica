# Contract: Cif Contextual Tips

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

This feature exposes no network API. The contracts are the engine API, the storage keys and the user interface.

## 1. Engine API (`onboarding-journey-engine`)

```ts
export const TIP_CATALOGUE: readonly Tip[];
export function emptyTipsRecord(): TipsRecord;
export function parseTipsRecord(raw: string | null): TipsRecord; // never throws
export function serializeTipsRecord(record: TipsRecord): string;
export function decideTip(input: TipDecisionInput): TipDecision; // pure
export function dismissTip(record: TipsRecord, tip: Tip): TipsRecord;
export function actOnTip(record: TipsRecord, tip: Tip): TipsRecord;
export function setTipsEnabled(record: TipsRecord, on: boolean): TipsRecord; // off→on clears silenced state
export function markOptInAsked(record: TipsRecord): TipsRecord;
```

Guarantees: no function reads the clock, storage, the DOM or the network. `decideTip` returns the same result for the same input.

## 2. Storage

| Key                      | Store            | Value               | Written when                                    |
| ------------------------ | ---------------- | ------------------- | ----------------------------------------------- |
| `codex-cif-tips`         | `localStorage`   | `TipsRecord` JSON   | Any change to the record.                       |
| `codex-cif-tips-session` | `sessionStorage` | `"1"`               | A tip is shown.                                 |
| `codex-cif-tips-probe`   | `localStorage`   | `"1"`, then removed | Just before a tip shows, to confirm saves land. |

Neither key is part of a vault, exported, synced or sent anywhere.

## 3. User interface

### Settings switch (`CifTipsSetting`)

- Placed in the AI tab of Settings, after the existing AI controls.
- A labelled switch: **Show tips from Cif**. Help text: "Cif can suggest one thing to try next, once per visit, based on the goal you chose. It never sends anything until you tap it, and never reads your vault."
- Hidden (not disabled) when `isHelpAssistantAvailable()` is false.
- Keyboard: a native checkbox switch, reachable in normal order; state announced as on or off.

### Tip chip (`CifTipChip`)

- A compact button reading the tip's `label`, with a "Cif has a tip" prefix for screen readers, and a separate dismiss button labelled "Dismiss tip".
- Anchored beside the Cif button with Floating UI (to its right on wide screens, above it on phones). Falls back to a fixed corner, above the footer, when the button is missing or clipped out of view (`hide` middleware).
- Never covers another control; a browser test checks that no visible button, link or field sits under it.
- Announced once through a polite live region; never moves focus (FR-026).
- Tap target at least 44px; dismiss by click, tap or Escape while focus is inside it.
- No motion under `prefers-reduced-motion`; a simple fade otherwise.
- Not rendered when any blocker is active, when the setting is off, or when AI is unavailable.

### One-time question (`TipsOptIn`)

- A small non-modal card in the same dock position as the journey card, text: "Want occasional tips from Cif?" with **Yes** and **No** buttons and a close button.
- Shown once (see research D6); never takes focus from a text field (announces instead, as `GoalInvitation` does).
- Makes no request. Any answer or close sets `optInAsked`.

## 4. Behavioural invariants (each has a test)

1. With `enabled = false`, no chip, no question after `optInAsked`, and no tip text anywhere.
2. Showing a tip performs zero `fetch` calls and zero `helpAssistant.ask` calls.
3. Tapping a tip calls the same open-and-ask path the journey card uses, with the catalogue's exact `prompt`.
4. In every blocked state, no chip renders.
5. After one tip is shown in a session, no second tip renders until a new session.
6. Disabling AI removes a visible chip, hides the switch and stores the setting as off; re-enabling AI does not turn it back on.
7. Unreadable storage behaves as tips off; unreadable session storage shows no tip.
8. A tip whose feature is unavailable in the current context (for example generators in a guest vault) is never shown.
