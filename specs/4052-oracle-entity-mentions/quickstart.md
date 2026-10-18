# Quickstart: validating Oracle @mentions

## Prerequisites

- Branch `4052-oracle-entity-mentions`, `bun install` done.
- A test Vault with: "Elara Voss" (alias "Archmage"), "Royal Academy of Pagen", two entities named "Elena", one entity labelled hidden (Shared/Guest mode on), and a second Vault with its own entity.

## Automated

```sh
bun run test:changed
bun run lint:changed
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
```

## Manual scenarios

1. **Pick and ask** (US1): open Oracle, type `@ela`, pick Elara Voss, send "Who is @Elara Voss?". The answer is grounded in her entry and the message shows a link.
2. **Two mentions** (US2): "How is @Elara Voss connected to @Royal Academy of Pagen?" Both are grounded.
3. **Unselected unique** (US3): type `@archmage` and send. It resolves to Elara Voss and shows as a link.
4. **Unselected ambiguous**: type `@elena` and send. You are asked to choose; nothing is attached before that.
5. **No match**: `@zzz` sends as plain text with a notice.
6. **Edit** (clarification Q3): pick Elara, then delete a letter of the token; it becomes plain text.
7. **Rename and delete** (US4): rename Elara, reload; the old message still links to her. Delete her; the mention shows as unavailable.
8. **Hidden and other Vault** (US6): hidden and other-Vault entities never appear in the list; a pasted mention for them sends as plain text.
9. **Keyboard and screen reader** (US5): Up/Down, Enter/Tab, Escape; the result count is announced.
10. **Mobile**: 360 px wide viewport with the soft keyboard open (Android Chrome or emulator): the list is visible, scrolls, and Send stays uncovered.
11. **Regression**: plain questions, `/draw`, `/connect` and Clear History behave as before.
