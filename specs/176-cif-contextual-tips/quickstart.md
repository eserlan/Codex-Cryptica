# Quickstart: Cif Contextual Tips

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/tips-contract.md](./contracts/tips-contract.md)

## Prerequisites

- `bun install`
- Cif enabled in the dev build (`VITE_HELP_ASSISTANT=true`) and AI not disabled in Settings.
- A clean browser profile (or clear `codex-cif-tips`, `codex-cif-tips-session`, `codex_goal_invitation`, `codex_chosen_goal`).

## Automated checks (impacted only)

```bash
bun scripts/test-changed.mjs
bun scripts/lint-changed.mjs
# type-check the affected workspaces
bun scripts/affected-workspaces.mjs
(cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
(cd packages/onboarding-journey-engine && bunx tsc --noEmit)
```

Expected: engine tests cover the decision matrix, quiet rules, one-per-session, dismissal and silencing, and catalogue integrity; web tests cover the store, chip, question and setting.

## Manual scenarios

1. **Off by default (US1)**: fresh profile → open Settings → AI. The **Show tips from Cif** switch is off. Use the app for a while: no chip anywhere.
2. **One-time question (US1, FR-006)**: choose "Build a world", finish or exit the guided setup. A small card asks "Want occasional tips from Cif?". Choose Yes; reload; the switch in Settings is on and the question does not return.
3. **A relevant tip (US2)**: with tips on and a goal chosen, open the map or generators. One chip appears beside the Cif button. In DevTools Network, confirm no request was made. Tap the chip: Cif opens with the matching question already asked.
4. **One per session (Q1)**: after a chip has shown, open another screen: no second chip. Close the tab, reopen: a tip may show again.
5. **Quiet rules (US3)**: repeat step 3 while typing in a field, with a dialog open, during the tour, during a journey, and with the Cif panel or pop-out open. No chip. Stop typing on the same screen: the chip may appear.
6. **Dismissal (US4)**: dismiss a chip; it does not return after a reload. Dismiss tips twice on one screen; that screen stays silent. Turn the switch off and on: silenced screens can show tips again.
7. **No goal (US5)**: fresh profile → "Explore on my own" → turn the switch on in Settings. No goal-based chip appears.
8. **AI disabled (FR-002)**: disable AI in Settings. The switch is hidden and a visible chip disappears. Re-enable AI: tips are only on if you had turned them on yourself.
9. **Accessibility (US3)**: with a screen reader, the chip is announced once, politely, and focus does not move. With reduced motion on, the chip appears without movement. At a 375px width the chip does not cover the controls in use and its tap target is at least 44px.
10. **Broken storage (FR-031)**: block site storage; the app works and no tips appear.
