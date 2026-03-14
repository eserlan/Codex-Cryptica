# `+layout.svelte` Refactor Proposal

## Context

`apps/web/src/routes/+layout.svelte` has grown into a high-responsibility orchestration file. It currently mixes:

- app bootstrapping and environment checks,
- global keyboard shortcuts,
- shell layout concerns,
- modal mounting and visibility branching,
- cross-feature state wiring.

This proposal defines a safe, incremental refactor plan that reduces risk while preserving behavior.

---

## Goals

1. Reduce `+layout.svelte` size and cognitive load.
2. Isolate initialization side effects from UI composition.
3. Centralize global shortcut registration/cleanup.
4. Move modal branching into a dedicated provider.
5. Keep all existing UX behavior identical during migration.

---

## Non-Goals

- No feature redesign.
- No visual style overhaul.
- No route architecture changes.
- No storage/sync protocol changes.

---

## Proposed Target Architecture

### 1) App initialization module

Create a module such as:

- `apps/web/src/lib/app/init/app-init.ts`

Responsibilities:

- OPFS/runtime capability checks,
- one-time startup migrations,
- startup token/config validation,
- returning a typed startup result and status.

`+layout.svelte` should only call one `initializeApp()` entrypoint from `onMount` and react to result flags.

### 2) Global modal provider

Create a component:

- `apps/web/src/lib/components/modals/GlobalModalProvider.svelte`

Responsibilities:

- own all global modal conditional rendering,
- map modal store flags to concrete modal components,
- standardize modal event forwarding/close handlers.

`+layout.svelte` should render one provider node instead of many modal `if` blocks.

### 3) Shortcut manager (action or service)

Create one of:

- `apps/web/src/lib/actions/useGlobalShortcuts.ts` (preferred for attach/detach lifecycle), or
- `apps/web/src/lib/services/ShortcutManager.ts`.

Responsibilities:

- register all global keybindings,
- normalize shortcut handling and guard conditions,
- ensure teardown on destroy.

`+layout.svelte` should declare shortcut bindings declaratively and avoid inline keydown branches.

### 4) Shell composition split

Extract pure visual shell scaffolding into components, e.g.:

- `apps/web/src/lib/components/layout/AppShell.svelte`
- `apps/web/src/lib/components/layout/SidebarRegion.svelte`
- `apps/web/src/lib/components/layout/MainWorkspaceRegion.svelte`

Focus: separate structural markup from app lifecycle logic.

---

## Migration Plan (Incremental)

### Phase 1 — Establish seams (low risk)

- Add `app-init.ts` and call it from current `onMount`.
- Keep existing state variables and behavior unchanged.
- Add typed result interfaces to avoid `any` or implicit state mutation.

### Phase 2 — Modal extraction

- Move global modal blocks into `GlobalModalProvider.svelte`.
- Pass only required props/events.
- Validate open/close and focus behavior parity.

### Phase 3 — Shortcut extraction

- Move window keyboard listeners into `useGlobalShortcuts` (or service).
- Preserve existing guard logic (inputs/contenteditable/modal-open states).
- Add unit tests for shortcut guard matrix.

### Phase 4 — Shell decomposition

- Extract structural layout subcomponents.
- Keep data dependencies explicit via props/stores.
- Ensure no regressions to responsive behavior.

### Phase 5 — Cleanup & hardening

- Remove dead layout helpers.
- Add a brief architecture note linking ownership of init/modals/shortcuts.
- Re-check file sizes and complexity metrics.

---

## Testing Strategy

### Unit tests

- `app-init.ts`: environment branch coverage and failure paths.
- shortcut module: command dispatch with guarded contexts.

### Component/integration tests

- global modals render when corresponding UI store flags are true.
- modal close actions update store and unmount components.
- shell still mounts main regions correctly for standard app states.

### Manual smoke checklist

- app startup still succeeds on normal browser path,
- keyboard shortcuts still function and are suppressed in text inputs,
- each global modal opens/closes correctly,
- sidebar + main workspace interactions unchanged.

---

## Acceptance Criteria

- `+layout.svelte` becomes primarily orchestration + composition (minimal business logic).
- Global modals are rendered through a single provider component.
- Global shortcuts are managed outside layout markup logic.
- Startup initialization is delegated to `app-init.ts`.
- No user-visible regressions in startup, modals, or shortcuts.

---

## Suggested Task Breakdown

1. Create `app-init.ts` and integrate call site.
2. Create `GlobalModalProvider.svelte` and migrate all modal branches.
3. Create shortcut module and migrate keyboard logic.
4. Extract shell layout subcomponents.
5. Add/adjust tests and finalize cleanup.
