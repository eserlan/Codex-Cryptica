---
name: codex-review
description: Specialist Codex-Cryptica review layered on the canonical general code-review skill.
---

# Codex Review

This skill provides a meticulous code review process tailored specifically for the Codex-Cryptica architecture. It focuses on defects that generic review can miss; it does not replace the general review pass.

## Review Workflow

Before the project-specific checklist, read and apply
[`../code-review/SKILL.md`](../code-review/SKILL.md). Keep its general findings distinct from the
project-specific findings below.

1. **Examine Reactivity, Worker Safety & Component Mount Boundaries**: Verify Svelte 5 Runes usage. Ensure props aren't used to initialize `$state` directly, that `$derived` is used for synchronized data, and that any module calling runes uses the `.svelte.ts` extension instead of plain `.ts`. **CRITICAL**: Never reference Svelte compiler keywords (like `$state` or `$state.snapshot`) in files bundled into Web Workers (e.g. `oracle.worker.ts`). When worker bundles change, run `bun run --cwd apps/web build`, which executes `apps/web/scripts/check-compiled-runes.js`. **Component Mount Hierarchy**: Audit where contexts, help surfaces, or listeners are mounted. Never register persistent view-level contexts inside child tabs or sub-components (such as `ZenContent.svelte` mounted only inside the Overview tab of `ZenView.svelte`) that unmount during tab navigation, as this tears down context while the view is active.
2. **Check for Race Conditions, Stale Async & Timers**: Audit all async event handlers in `.svelte` files (e.g., `handleCommit`, `handleSave`). Ensure `isCommitting` guards are present. For debounced rescaling or delay timers (`setTimeout`, e.g. `SHARPEN_DELAY_MS`), ensure timers are cancelled on unmount and covered by fake-timer unit tests.
3. **Verify AI Grounding, Parser Strictness & Untrusted Markdown Sanitization**: In `oracle-parser.ts`, ensure regex patterns for deterministic commands use `\s*$` to prevent matching when additional user descriptions are provided. **Untrusted Markdown & Privacy (Constitution IV)**: Model output, external imports, and guest data rendered via Markdown (`renderMarkdown`, DOMPurify) MUST explicitly forbid remote resource fetches (`<img>`, `<video>`, `<audio>`, `@import`, or arbitrary `https:`, `data:`, `blob:` image URLs) to prevent tracking pixels, SSRF, or IP leakage in this local-first application. Cross-check help guides and prompt instructions to ensure documented capabilities do not contradict code reality (e.g. claiming Demo mode is read-only).
4. **Audit Worker Proxies**: If a new AI method is added to `TextGenerationService`, verify it is correctly exposed in `oracle.worker.ts` and bound in `OracleStore`.
5. **Enforce Performance Heuristics, Frame Budgets & Premise Inversion**: Ensure synchronous AI processing in loops (like auto-archive) is bounded, and check that simple selection/click gestures do not trigger unconditional disk/database writes. **Canvas 2D / 60 FPS Render Budgets**: On hot paths (`requestAnimationFrame`, canvas panning/zooming, hull overlays), avoid `O(N)` full-canvas `clearRect` and `drawImage` passes. Composite directly onto the target canvas in a single pass. **Adversarial Premise Inversion**: When a change optimizes calculations under an assumption (e.g. "fit-bounds doesn't need labels because it's zoomed out"), test the inverse condition (sparse graphs with 2–3 nodes where zoom is high, e.g. `zoom >= 0.5`). Ensure labels and curved edges are not clipped.
6. **Check Accessibility & Multi-Theme Optical Contrast**: Ensure `Autocomplete` components have `ariaLabel`, action buttons have explicit `type="button"`, and icons follow the Iconify class pattern (`class="icon-[lucide--name] ..."`). Decorative icons must have `aria-hidden="true"`. Transition elements that fade out or hide must dynamically receive `aria-hidden` or `inert`. **Theme Tokens**: every new `theme-*` utility must exist as `--color-theme-*` in `apps/web/src/app.css` (there is no `theme-error`; use `theme-danger`). **Multi-Theme Contrast**: compute, do not estimate. Run the contrast check in [patterns.md](references/patterns.md#multi-theme-text-and-control-contrast) over every theme and light/dark variant: 4.5:1 for normal-size text (badges and `text-sm` button labels included), 3:1 for icons, control boundaries and large text. `bg-theme-primary text-theme-bg` fails in Horror; use `text-theme-on-primary`. Focus: dialogs move focus in and restore it for **every** opener path; reduced motion skips the movement, not only the transition.
7. **Verify HTML, Numeric Semantics & Pointer Displacement**: Ensure coordinate/number fallbacks use nullish coalescing (`??`) rather than logical OR to prevent falsy `0` bugs, avoid user-agent sniffing, and ensure highly-interactive canvas or map dragging interfaces use pointer displacement gates (e.g. 5px threshold) when a click could mutate coordinates.
8. **Run Constitution, Privacy, Test Completeness & Delivery Checks**: Audit the branch against `.specify/memory/constitution.md` and `docs/STYLE_GUIDE.md`. Check privacy and security boundaries, including credentials, owner tokens, entity values, vault identifiers, asset paths, validation, authorization, and public response projections. **Assertion Completeness (Not Just "Tests Pass")**: Verify that every newly added configuration key (e.g. in `localStorage` or IndexedDB), feature flag, or debounce timer has dedicated unit test assertions exercising its loading, saving, default fallback, and invalidation. Passing test counts do not prove new code paths are tested. Cover meaningful failure, cancellation, and negative paths, and keep documentation and spec artifacts synchronised.

## Sweeps Before Handoff

The PR reviewer (dev-agents "Luna") repeatedly finds the defects below after this review passes.
Run these sweeps on every review; they are where most second and third review rounds come from.

0. **Mechanical checks first**: Run `bun run lint:changed`. Besides ESLint and Prettier it runs
   `scripts/check-ui-patterns.mjs` on the changed lines (theme contrast, `renderMarkdown`
   without `allowImages: false`, responsive `order-*`, `setTimeout` without cleanup, root-path `goto`/`redirect` without
   `resolve()`), and the
   discovery audit when discovery content changes. `test:changed` covers the sitemap against the
   discovery registry. See [docs/local-pr-checks.md](../../../docs/local-pr-checks.md). Do not
   re-derive by hand what these already compute, but the UI pattern rules are regex heuristics:
   a pass is not proof. See
   [Regex Checks Over Source Code](references/patterns.md#regex-checks-over-source-code-local-lint-rules).
1. **Revert check (tests)**: For each changed hunk, name the test that fails if the hunk is
   reverted. No name means a missing or non-discriminating test. See
   [The Revert Check](references/patterns.md#the-revert-check-would-any-test-fail) for the recurring
   ways a green suite proves nothing.
2. **Sibling sweep**: When a defect or a fix applies to one instance, enumerate the siblings and
   check each: every button with the same contrast pair, every model field interpolated into the
   same Markdown, every AI entry point (retry, regenerate) behind the disclosure, every opener path
   that needs focus restore, every article repeating the same claim, every field holding a merged id.
   Fallback branches count as siblings: a fallback keeps the main path's filters and exclusions
   (the deploy-notice fallback dropped the back-merge filter, PR #4364; the concept fallback
   dropped `avoidIds`, PR #4365).
   For a new function or option, enumerate its input space (every culture, theme, mode, entity
   kind, empty and maximum case) and check the sibling functions that take the same input.
3. **Model-output guards**: Check each parse/validation guard in the diff against
   [Model-Output Shape Guards](references/patterns.md#model-output-shape-guards-that-let-junk-through)
   (`null`/array/`{}`, `NaN`, unescaped `RegExp`, duplicate ids, missing maximum, graph
   reachability, silent truncation). Every new validator, user-input or config parser included,
   gets a bad-input table in its test: repeats, a missing field, an unknown id, a duplicate id,
   empty input and the over-limit case, each with the expected outcome.
4. **Heuristic checks**: Any regex over generated prose needs a counterexample table in its test
   (flagged and not-flagged, with unrelated clauses, lists and punctuation). See
   [Heuristic Prose Checks](references/patterns.md#heuristic-prose-checks-regex-validators).
5. **Async and persistence**: For each await, ask what the user can change meanwhile (captured
   state written back, superseded request, double-click on a per-item button, map switch), what
   the real persistence adapter returns on failure (it may resolve `false`), and what earlier
   steps are left if a later step fails. For abortable work, follow the `AbortSignal` all the way
   to `fetch`, and check that `pointercancel` cancels rather than completes a gesture.
6. **Worst-case budgets**: Compute per-frame work from the supported extremes (minimum zoom,
   minimum cell size, large viewport), not a typical map; caps must not silently drop items.
7. **Claims**: Every capability, rule, number and privacy claim in changed content, help copy, or
   the PR description has a code path or a cited source. Evergreen blog posts go through the
   discovery registry. The PR description matches `git diff origin/staging...HEAD --stat`.
   A new user-facing workflow or control has a Help entry (`apps/web/src/lib/content/help`, and
   the `help-engine` feature registry when the in-app assistant should know it).
8. **Re-review the fix**: A fix is new code. Re-run the relevant sweep over the fix itself, and
   for heuristics, re-run the whole counterexample table. Most second-round findings are defects
   in the first round's fix. Automated fixer commits go through the same gates (sweep 0, tests,
   type-check) before they are pushed.

## Review Output Guidelines

When executing a code review under this skill, strictly follow these constraints for the output:

- **No Compliments or Filler**: Do not list things that are "correct," "good," or "well-done." Avoid general praise or introductory/concluding pleasantries.
- **Attention Items Only**: List _only_ specific defects, gaps, bugs, potential runtime failures, style-guide violations, or security/performance issues that need attention or fixing.
- **Concrete Code Proposals**: For every single issue identified, you must provide a concrete, exact code proposal (using diff blocks or clear replacements) that resolves the issue.

## Reference Patterns

For detailed examples of anti-patterns and the preferred implementations, refer to [patterns.md](references/patterns.md).

## Example Commands

- "Perform a /codex-review of these changes."
- "Review my Svelte 5 component for race conditions."
- "Check if my new AI command parser is robust."
- "Run the general code-review pass and then codex-review on my branch changes."

## Machine-readable Result

After the human-readable review and any fixes, print this exact block so the
automation can persist and summarize the result:

```text
DEV_AGENTS_REVIEW_REPORT_BEGIN
FINDINGS: <short human-readable summary, or none>
FIXES: <short human-readable summary, or none>
REPORT_JSON: {"verdict":"clean|findings","findings":[],"categories_checked":[],"validation":[],"fixes":[]}
DEV_AGENTS_REVIEW_REPORT_END
```

The JSON must be valid and contain the keys shown above. Each finding must
include string fields `severity`, `category`, `location`, `impact`, and
`remediation`; each fix must include string fields `location` and `summary`.
Use empty arrays when there are no findings or fixes. Do not include
credentials, tokens, private user data, or other secrets.
