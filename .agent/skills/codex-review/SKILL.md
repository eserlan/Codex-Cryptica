---
name: codex-review
description: Specialist code review for Codex-Cryptica project. Use to identify race conditions, AI parsing issues, worker proxy mismatches, and project-specific anti-patterns in Svelte 5 and TypeScript.
---

# Codex Review

This skill provides a meticulous code review process tailored specifically for the Codex-Cryptica architecture. It focuses on catching subtle logic bugs that generic reviews often miss.

## Review Workflow

1. **Examine Reactivity**: Verify Svelte 5 Runes usage. Ensure props aren't used to initialize `$state` directly and that `$derived` is used for synchronized data.
2. **Check for Race Conditions**: Audit all async event handlers in `.svelte` files (e.g., `handleCommit`, `handleSave`). Ensure `isCommitting` guards are present.
3. **Verify AI Grounding**: In `oracle-parser.ts`, ensure regex patterns for deterministic commands use `\s*$` to prevent matching when additional user descriptions are provided.
4. **Audit Worker Proxies**: If a new AI method is added to `TextGenerationService`, verify it is correctly exposed in `oracle.worker.ts` and bound in `OracleStore`.
5. **Enforce Performance Heuristics**: Ensure synchronous AI processing in loops (like auto-archive) is limited to small batches (< 5).
6. **Check Accessibility**: Ensure `Autocomplete` components have `ariaLabel` and that icons follow the Iconify class pattern.

## Reference Patterns

For detailed examples of anti-patterns and the preferred implementations, refer to [patterns.md](references/patterns.md).

## Example Commands

- "Perform a /codex-review of these changes."
- "Review my Svelte 5 component for race conditions."
- "Check if my new AI command parser is robust."
