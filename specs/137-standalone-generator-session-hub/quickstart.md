# Developer Quickstart: Standalone Generator Session Hub

This guide details how to develop, run, and test the Standalone Generator Session Hub feature.

## 1. Local Development Setup

To begin development, ensure you are on the feature branch:

```bash
git checkout 137-standalone-generator-session-hub
```

Install workspace dependencies if needed:

```bash
bun install
```

## 2. Implementing the Package Helpers

Core logic resides in the `packages/generator-engine` package:

1. Implement the context budgeting and title-matching provenance logic in `packages/generator-engine/src/session-hub-helpers.ts`.
2. Export these functions from `packages/generator-engine/src/index.ts`.

### Running Package Tests

Run unit tests for the package helpers to verify correctness:

```bash
bun run test packages/generator-engine/src/session-hub-helpers.test.ts
```

---

## 3. Implementing the Svelte 5 Store

The reactive state store managing session-local drafts and active selection logic:

1. Create `apps/web/src/lib/stores/session-hub.svelte.ts`.
2. Wrap Svelte 5 runes (`$state`, `$derived`, `$effect`) around the session entities list.
3. Handle legacy `SessionDraft[]` migration on load.
4. Export the singleton instance `sessionHubStore` and implement dependency injection pattern.

### Testing the Store

Add a test file `apps/web/src/lib/stores/session-hub.svelte.test.ts` and verify with:

```bash
bun test apps/web/src/lib/stores/session-hub.svelte.test.ts
```

---

## 4. UI Components & Integration

### Update `SEOGeneratorLayout.svelte`

- Integrate `sessionHubStore` to replace the local `sessionDrafts` state array.
- Make generations accumulate automatically in `sessionHubStore` upon generation.
- Build a detail review modal or pane that opens any previous session entity from the list without losing the current input/generator state.
- Render the provenance list at the bottom of the generated content card using `ProvenanceBadge.svelte`.
- Render a warning notice if context budgeting trimmed some of the user's reuse-enabled drafts.

### Run Web Application

Start the local Vite development server:

```bash
bun run dev
```

Navigate to `http://localhost:5173/generators/npc` to inspect the standalone generators.

---

## 5. Verification Checklist

Before proposing code changes:

- [ ] `bun run test` passes with no failures.
- [ ] `bun run lint` passes with no errors.
- [ ] The Session Hub widget correctly reflects the entities generated so far.
- [ ] Deactivating an entity from reuse prevents it from appearing in subsequent generation contexts.
- [ ] Checking a generated NPC shows the correct provenance line listing the location it was generated from.
- [ ] Multi-selecting a subset of entities and saving to a Codex vault imports them successfully and establishes connections between them.
