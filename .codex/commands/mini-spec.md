---
description: Produce a fast, lightweight, all-in-one Spec + Plan + Tasks document for a scoped feature, fix, or refactor.
---

# Mini-Spec Generator

Activate the `mini-spec` skill and generate a consolidated mini-spec for the requested problem or feature.

The output must contain all 3 pillars in a single, coherent document:

1. **Spec**: Problem statement, In-scope, Out-of-scope, Acceptance criteria.
2. **Plan & Tech**: Architecture, affected files/packages, data flow/contracts, Svelte 5 Runes & Tailwind 4 tokens, Iconify syntax (`icon-[lucide--*]`), failure/cancellation paths (Constitution II), and key technical tradeoffs.
3. **Tasks**: Bite-sized, sequential checklist (TDD tests with happy & failure paths, core logic, UI integration) plus the impacted-only verification gate commands (`bun run test:changed`, `bun run lint:changed`).

## User Input

```text
$ARGUMENTS
```
