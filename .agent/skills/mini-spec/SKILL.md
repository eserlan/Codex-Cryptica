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

## Output Format & Structure

Every mini-spec must be generated as a single consolidated document following this structure:

````markdown
# [Feature / Fix Title] Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

[Concise summary of the user problem, bug, or product requirement in plain British English.]

### Scope & Boundaries

- **In Scope**:
  - [Exact boundary item 1]
  - [Exact boundary item 2]
- **Out of Scope**:
  - [Deliberate omission 1 to prevent scope creep]
  - [Deliberate omission 2]

### Acceptance Criteria

- [ ] Criterion 1 (user or system observable behavior)
- [ ] Criterion 2
- [ ] Criterion 3

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `path/to/file.ts`: [Specific responsibility]
  - `path/to/Component.svelte`: [Specific UI changes]
- **Data Contracts & State Flow**:
  - [State management: Svelte 5 Runes ($state, $derived), store managers, or schemas]
  - [Persistence: IndexedDB, OPFS, or transient state if applicable]
- **UI & Design Tokens** (if frontend):
  - [Tailwind 4 semantic tokens (e.g. text-theme-primary, bg-theme-surface)]
  - [Iconify syntax: `class="icon-[lucide--icon-name] h-4 w-4"`. NEVER use `lucide-svelte`.]

### Key Technical Decisions & Tradeoffs

- [Decision 1 and why it was chosen over alternatives]
- [Decision 2: e.g. constructor DI, reuse of existing engine package]

### Failure, Edge & Cancellation Paths (Constitution V)

- **Positive / Expected Path**: [Happy path handling]
- **Negative / Error Path**: [Meaningful failure handling, invalid inputs, network/worker down]
- **Cancellation / Edge Case**: [User cancel, aborted request, or empty data state]

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add failing unit tests covering happy path and at least one negative/failure path.
- [ ] **Task 2: Core Logic / Engine** — Implement business logic, state mutations, or store handlers.
- [ ] **Task 3: UI Integration** — Wire into Svelte 5 components with semantic tokens and Iconify icons.
- [ ] **Task 4: Edge Cases & Polish** — Handle empty states, loading indicators, or error states.
- [ ] **Task 5: Verification Gate** — Execute repository quality checks.

---

## 4. Verification Gate

Run only impacted validation commands:

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig ./tsconfig.json --threshold error # (run inside affected app/package if applicable)
```
````

```

---

## Codex-Cryptica Quality Guardrails (Mandatory)

1. **Constitution V (Test Completeness)**: Every behavioral change MUST include unit tests covering both the expected success path and at least one meaningful failure, cancellation, or error path.
2. **Impacted-Only Validation**: Never suggest or run whole-repo suites (`bun run test` / `bun run lint`). Always specify `bun run test:changed` and `bun run lint:changed`.
3. **UI Patterns**:
   - Always Svelte 5 Runes (`$state`, `$derived`, `$effect`).
   - Use Tailwind 4 semantic tokens (`bg-theme-surface`, `text-theme-primary`, etc.).
   - Icons MUST use Iconify utility classes: `class="icon-[lucide--name] h-4 w-4"`. NEVER import from `lucide-svelte`.
4. **Dependency Injection**: Use constructor-based DI for services and stores.
5. **Language & Prose**: British English spelling (`behaviour`, `colour`, `organise`). Keep prose clear, direct, and free of AI marketing fluff.
```
