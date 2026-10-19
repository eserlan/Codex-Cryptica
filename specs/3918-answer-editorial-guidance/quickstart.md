# Validation guide

## Prerequisites

Use the feature branch with Bun dependencies installed. Read spec.md, plan.md and the constitution. Implementation must add tests before changing enforced policy.

## Targeted checks after implementation

```sh
bun run lint:changed
bun run test:changed
cd apps/web
bunx vitest run src/lib/content/answers/schema.test.ts src/lib/content/answers/registry.test.ts
bunx svelte-check --tsconfig ./tsconfig.json --threshold error
```

Use the actual schema-test filename if an existing file is reused. Do not run repository-wide test/lint/type-check scripts. If published Answer files change, also run their editorial checks, Answer mesh and `bun scripts/discovery-audit.mjs` from the repository root.

## Expected evidence

- Valid concise definition succeeds with optional teaching/product blocks omitted; empty or malformed input fails.
- Current published Answers retain structural validity and article-specific factual checks.
- Compare skill mirrors with `cmp`; verify reconciled art guidance and categories were retained.
- Read the benchmark as a beginner and execute its arithmetic; inspect the two other examples for a real decision or action rather than checklist presence.
- For each concrete rules or product claim, record the authoritative source and edition/capability verified. Editorial relevance and factual correctness cannot be inferred from green tests.

Before later commit/PR: run specialist codex-review, `bunx fallow audit --format json --quiet --explain --gate-marker agent` and the repository's base-relative audit. No commit, push or PR is required for planning.
