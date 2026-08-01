---
name: codex-review
description: Specialist code review for Codex-Cryptica. Use for branch and diff reviews covering Svelte 5, TypeScript, worker safety, AI parsing, privacy, accessibility, and project-specific anti-patterns.
---

# Codex Review

Review changes as a principal engineer. Read the repository constitution,
`docs/STYLE_GUIDE.md`, relevant plans/specs, and the complete diff before
reporting findings. The canonical extended reference is
`.agent/skills/codex-review/`; consult its `SKILL.md` and
`references/patterns.md` when the review touches those areas.

## Required checks

1. Audit Svelte 5 Runes usage. State initialized from props must be an
   intentional local snapshot or use `$derived` when it must stay synchronized.
   Runes must not enter plain `.ts` modules or worker bundles transitively.
2. Check async handlers for duplicate-submit/loading guards, cancellation, and
   stale-response races.
3. Check Oracle/AI deterministic parsing for anchored patterns (`\\s*$`) and
   verify new worker-proxy methods are exposed and bound end to end.
4. Check privacy and security boundaries: credentials, owner tokens, entity
   values, vault identifiers, asset paths, validation, authorization, and
   public response projections.
5. Check accessibility and project UI rules: Iconify utility classes instead of
   `lucide-svelte`, semantic Tailwind tokens, labels, keyboard behavior,
   transition visibility, and explicit `type="button"`.
6. Check performance: bounded batches and searches, no redundant persistence on
   selection, no accidental duplicate counting, and appropriate cache behavior.
7. Check nullish numeric fallbacks (`??`), pointer-drag thresholds, lifecycle
   unsubscribe cleanup, and test/environment detection without user-agent
   sniffing.
8. Verify changed behavior has tests, including a meaningful failure,
   cancellation, or negative path, and that documentation/spec artifacts stay
   synchronized.

## Output contract

Report only actionable findings. Do not include compliments, filler, or a list
of things that are already correct. Every finding must include:

- severity (`CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`);
- exact file and line or symbol;
- concrete impact;
- an exact remediation proposal, preferably a diff or replacement.

If no actionable findings exist, say so in one sentence after the verification
summary.
