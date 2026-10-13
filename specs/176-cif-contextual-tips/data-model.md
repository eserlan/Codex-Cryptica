# Data Model: Cif Contextual Tips

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Types live in `packages/onboarding-journey-engine/src/tips.ts` unless marked **(app)**. No vault, IndexedDB or OPFS schema change, so no migration is needed. Nothing here holds names, text, entry ids or vault identifiers.

## Tip (static catalogue)

| Field       | Type                  | Rules                                                                          |
| ----------- | --------------------- | ------------------------------------------------------------------------------ |
| `id`        | kebab-case string     | Unique across the catalogue. Stored in history, so it is stable once shipped.  |
| `goal`      | `Goal`                | `world`, `story` or `campaign`. There is no tip for "explore" (FR-024).        |
| `area`      | `HelpArea`            | The screen the tip appears on. Must have a quick-prompt set.                   |
| `featureId` | string                | Must be an id in `FEATURE_REGISTRY` (FR-020).                                  |
| `label`     | string, 60 characters | Chip text, plain language, fixed copy (FR-016).                                |
| `prompt`    | string                | Must be exactly a prompt in the quick-prompt set for `area`. Sent only on tap. |

Catalogue integrity is a test, not a runtime check: a tip that fails it cannot merge (SC-006).

## TipsRecord (app, persisted, device-wide)

Key: `codex-cif-tips` in `localStorage`, JSON. Defined by the engine, written by `TipsStore`.

| Field           | Type                       | Notes                                                                                     |
| --------------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| `schema`        | `1`                        | Record format version. Unknown value: discard and use defaults.                           |
| `enabled`       | boolean                    | The "Show tips from Cif" setting. Default `false`.                                        |
| `optInAsked`    | boolean                    | The one-time question was answered or dismissed. Default `false`.                         |
| `dismissed`     | `TipId[]`                  | Set semantics. A tip here is never offered again (FR-022).                                |
| `acted`         | `TipId[]`                  | Set semantics. Tips the person tapped. Never offered again (FR-022).                      |
| `dismissCounts` | `Record<HelpArea, number>` | Only areas with a count above zero are stored.                                            |
| `silencedAreas` | `HelpArea[]`               | An area reaches here at a count of 2 (FR-023). Cleared when the setting goes off then on. |

**Validation on load**: malformed JSON, wrong types or unknown `schema` → defaults (tips off). Unknown tip ids are dropped. Unknown areas are dropped. Never throws (FR-031).

## Session marker (app)

Key: `codex-cif-tips-session` in `sessionStorage`. Value: `"1"`. Written when a tip is shown. Its presence is the session limit (FR-008).

## Saving and storage failure (app)

The browser wrapper (`browserStorage`) swallows storage errors, so every save is confirmed by reading the value back. Before a tip shows, the store writes `"1"` to `codex-cif-tips-probe`, reads it back and removes it, because re-saving an unchanged record cannot reveal a dropped write. Any failed save (record, probe or session marker) turns tips off for the rest of the visit: no tip, no one-time question, and the switch reads off (FR-031, review finding on #4056). A tip therefore only shows when its dismissal can be saved.

## TipDecisionInput

```ts
interface TipDecisionInput {
  record: TipsRecord;
  aiAvailable: boolean; // isHelpAssistantAvailable()
  goal: Goal | null; // chosen goal; null for explore or none
  goalInvitation: "goal" | "explore" | "dismissed" | null;
  setupEnded: boolean; // active vault's journey outcome is finished or exited
  area: HelpArea; // current screen
  unavailableAreas: readonly HelpArea[]; // areas whose feature is not offered here (e.g. generators in a guest vault)
  shownThisSession: boolean; // session marker present
  blockers: {
    typing: boolean;
    dialogOpen: boolean;
    tourActive: boolean;
    journeyOrInvitationActive: boolean;
    cifOpen: boolean; // docked panel or pop-out
    firstRunPage: boolean; // the vault's front page covers the graph
  };
}

type TipDecision =
  { kind: "show"; tip: Tip } | { kind: "none"; reason: NoTipReason };

type NoTipReason =
  | "disabled"
  | "ai-unavailable"
  | "no-goal"
  | "setup-not-ended"
  | "session-limit"
  | "blocked"
  | "area-silenced"
  | "feature-unavailable"
  | "no-eligible-tip";
```

`decideTip` is pure and deterministic: it reads nothing else, checks reasons in the order above, and picks the first catalogue tip for `(goal, area)` not in `dismissed` or `acted`.

## State transitions

```text
off ──switch on / Yes──► on ──switch off / AI disabled──► off
                          │ (turning on again clears silencedAreas and dismissCounts)
on ──show tip──► session marker set ──dismiss──► tip in dismissed, area count +1 (at 2: area silenced)
                         └─tap─────► tip in acted, Cif opened with the prompt
```

- `optInAsked` flips to `true` on Yes, No, or closing the question, and never flips back.
- When AI becomes unavailable, the store writes `enabled = false` (FR-002, FR-004). Turning AI back on therefore leaves tips off until the person turns them on again. The derived `enabled && aiAvailable` is still used as a read-time guard, but the stored value is what makes FR-004 true.
- If `sessionStorage` cannot be read or written, the session marker is treated as present: no tip is shown (FR-031).
- Turning the setting on while on a screen re-evaluates that screen once, because the person is already there.
