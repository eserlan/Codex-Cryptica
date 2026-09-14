---
name: codex-review
description: Specialist code review for Codex-Cryptica project. Use to identify race conditions, AI parsing issues, worker proxy mismatches, and project-specific anti-patterns in Svelte 5 and TypeScript. Always initiates and incorporates the general review processes defined in `code-review:code-review`.
---

# Codex Review

This skill provides a meticulous code review process tailored specifically for the Codex-Cryptica architecture. It focuses on catching subtle logic bugs that generic reviews often miss.

## Review Workflow

1. **Examine Reactivity & Worker Safety**: Verify Svelte 5 Runes usage. Ensure props aren't used to initialize `$state` directly, that `$derived` is used for synchronized data, and that any module calling runes uses the `.svelte.ts` extension instead of plain `.ts`. **CRITICAL**: Never reference Svelte compiler keywords (like `$state` or `$state.snapshot`) in files bundled into Web Workers (e.g. `oracle.worker.ts`). Svelte runes are not compiled or supported in worker threads and will cause fatal runtime ReferenceErrors. When worker bundles change, run `bun --cwd apps/web run build`, which executes `apps/web/scripts/check-compiled-runes.js`.
2. **Check for Race Conditions**: Audit all async event handlers in `.svelte` files (e.g., `handleCommit`, `handleSave`). Ensure `isCommitting` guards are present.
3. **Verify AI Grounding**: In `oracle-parser.ts`, ensure regex patterns for deterministic commands use `\s*$` to prevent matching when additional user descriptions are provided.
4. **Audit Worker Proxies**: If a new AI method is added to `TextGenerationService`, verify it is correctly exposed in `oracle.worker.ts` and bound in `OracleStore`.
5. **Enforce Performance Heuristics**: Ensure synchronous AI processing in loops (like auto-archive) is limited to small batches (< 5), and check that simple selection/click gestures do not trigger unconditional disk/database writes.
6. **Check Accessibility**: Ensure `Autocomplete` components have `ariaLabel`, icons follow the Iconify class pattern, and transition elements that fade out or hide are dynamically given `aria-hidden` attributes to keep the accessibility tree clean.
7. **Verify HTML & JS Semantics**: Ensure all action buttons have explicit `type="button"`, coordinate/number fallbacks use nullish coalescing (`??`) rather than logical OR to prevent falsy `0` bugs, avoid user-agent sniffing, and ensure highly-interactive canvas or map dragging interfaces use pointer displacement gates (e.g., 5px threshold) to prevent micro-movement drift on simple clicks.
8. **Run Constitution, Privacy & Delivery Checks**: Audit the branch against `.specify/memory/constitution.md` and `docs/STYLE_GUIDE.md`. Check privacy and security boundaries, including credentials, owner tokens, entity values, vault identifiers, asset paths, validation, authorization, and public response projections. Verify changed behaviour has tests with a meaningful failure, cancellation, or negative path, and that documentation and spec artifacts stay synchronised.
9. **Incorporate General Branch Review**: Initiate and perform the complete branch changes review defined in `code-review:code-review`, applying the comprehensive guidelines, reviewer persona, and critical constraints set by `code-review:code-review-commons` to audit code quality, style, and correctness.

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
- "Run codex-review and code-review:code-review on my branch changes."

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
