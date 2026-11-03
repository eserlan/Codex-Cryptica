---
name: mini-spec
description: Produce a fast, lightweight, all-in-one specification, architectural plan, and task checklist for focused features, bug fixes, or refactors without the full Spec Kit ceremony.
metadata:
  type: workflow
---

# Mini-Spec Skill (`mini-spec`)

Produce an all-in-one, consolidated **Spec + Plan + Tasks** document for focused features, bug fixes, refactors, or design spikes without the heavy multi-file ceremony of full Spec Kit.

## When to Use

- **Use `mini-spec` when**: Working on single-feature slices, UI additions, isolated refactors, bug fixes, or changes that touch 1–5 files and do not require full `.specify/` multi-document scaffolding.
- **Use full Spec Kit when**: Building massive multi-package epic features that require separate `research.md`, formal `contracts/`, multi-phase milestones, and full issue-tracking decomposition.

---

## Workflow Steps

1. **Analyze Request & Scope**: Clarify the user's intent. Identify what is strictly in-scope and explicitly establish out-of-scope boundaries to avoid scope creep.
2. **Read Template**: Read the canonical template at `.agent/skills/mini-spec/template.md`.
3. **Populate the 3 Pillars**:
   - **Spec**: Problem statement, explicit boundaries (In/Out), and measurable acceptance criteria.
   - **Plan & Tech**: Affected files, data flow (Runes/DI), UI tokens, technical decisions, and negative/cancellation paths.
   - **Tasks**: TDD-first sequence with bite-sized tasks and the impacted-only verification gate.
4. **Present Output**: Output the filled mini-spec directly in chat (or as an artifact if requested).

---

## Codex-Cryptica Quality Guardrails (Mandatory)

1. **Constitution II (Test-Driven Development)**: Every behavioral change MUST include unit tests covering both the expected success path and at least one meaningful failure, cancellation, or error path.
2. **Impacted-Only Validation**: Never suggest or run repository-wide test/lint suites (`bun run test` / `bun run lint`). Always specify `bun run test:changed` and `bun run lint:changed`.
3. **UI Patterns**:
   - Always Svelte 5 Runes (`$state`, `$derived`, `$effect`).
   - Use Tailwind 4 semantic tokens (`bg-theme-surface`, `text-theme-primary`, etc.).
   - Icons MUST use Iconify utility classes: `class="icon-[lucide--name] h-4 w-4"`. NEVER import from `lucide-svelte`.
4. **Dependency Injection**: Use constructor-based DI for services and stores.
5. **Language & Prose**: British English spelling (`behaviour`, `colour`, `organise`). Keep prose clear, direct, and free of AI marketing fluff.
6. **Bounded Responsibility (Constitution XIV)**: Maintain bounded file sizes. Avoid expanding files beyond 500 lines; decompose when approaching review triggers.
