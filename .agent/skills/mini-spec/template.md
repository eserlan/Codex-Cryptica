# [Feature / Fix Title] Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

<!-- 2-3 sentences explaining the user problem, bug, or product requirement in plain British English. -->

### Scope & Boundaries

- **In Scope**:
  - <!-- Exact boundary item 1 -->
  - <!-- Exact boundary item 2 -->
- **Out of Scope**:
  - <!-- Deliberate omission 1 to prevent scope creep -->
  - <!-- Deliberate omission 2 -->

### Acceptance Criteria

- [ ] <!-- Criterion 1: Concrete, observable behaviour condition -->
- [ ] <!-- Criterion 2 -->
- [ ] <!-- Criterion 3 -->

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `path/to/file.ts`: <!-- Specific responsibility or changes -->
  - `path/to/Component.svelte`: <!-- UI changes -->
- **Data Contracts & State Flow**:
  - <!-- Svelte 5 Runes ($state, $derived), store managers, or schema types -->
  - <!-- Persistence: IndexedDB, OPFS, or transient session state -->
- **UI & Design Tokens** (if frontend):
  - <!-- Tailwind 4 semantic tokens (e.g. text-theme-primary, bg-theme-surface) -->
  - <!-- Iconify syntax: class="icon-[lucide--icon-name] h-4 w-4" (NEVER lucide-svelte) -->

### Key Technical Decisions & Tradeoffs

- <!-- Decision 1: Tradeoff chosen over alternatives (e.g. constructor DI, reuse existing engine) -->
- <!-- Decision 2 -->

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: <!-- Happy path behaviour -->
- **Negative / Error Path**: <!-- Meaningful failure handling, invalid inputs, network/worker down -->
- **Cancellation / Edge Case**: <!-- Aborted request, user cancellation, empty collection -->

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add failing unit tests covering happy path and at least one negative/failure path.
- [ ] **Task 2: Core Logic / Engine** — Implement business logic, state mutations, or store handlers.
- [ ] **Task 3: UI Integration** — Wire into Svelte 5 components with semantic tokens and Iconify icons.
- [ ] **Task 4: Edge Cases & Polish** — Handle empty states, loading indicators, or error states.
- [ ] **Task 5: Verification Gate** — Execute repository quality checks.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig ./tsconfig.json --threshold error # Scoped to affected workspace
```
