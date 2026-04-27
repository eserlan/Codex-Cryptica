# Implementation Plan: Approve / Reject Draft Entities

**Branch**: `092-approve-draft-entities` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/092-approve-draft-entities/spec.md`

## Summary

Add UI controls to approve or reject AI-generated draft entities across three surfaces: the Entity Explorer Review tab, the Entity Detail Panel, and the Zen Mode Header. Approving updates the status to "active", while rejecting deletes the entity immediately.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)  
**Primary Dependencies**: SvelteKit, Tailwind 4  
**Storage**: IndexedDB/OPFS (via `vault` store)  
**Testing**: Vitest, Playwright  
**Target Platform**: Web app  
**Project Type**: Web application  
**Performance Goals**: UI updates < 16ms, actions complete < 3s  
**Constraints**: Client-side logic, no confirmation dialogs on reject  
**Scale/Scope**: Add UI elements to 3 existing components

## Constitution Check

- **Library-First**: N/A (UI-only feature)
- **Test-Driven Development (TDD)**: Must add tests for the new UI components and conditional rendering.
- **Simplicity & YAGNI**: No new libraries needed. Using existing `vault` actions.
- **AI-First Extraction**: N/A
- **Privacy & Client-Side Processing**: Operates entirely on the local `vault` store.
- **Clean Implementation**: Must use Iconify `icon-[lucide--...]` instead of `lucide-svelte` components. Must use `npm test` and `npm run lint`.
- **User Documentation**: Will add a feature hint if necessary, but UI should be self-explanatory.
- **Dependency Injection (DI)**: N/A (using existing stores)
- **Natural Language**: "Approve" and "Reject" are clear.

## Project Structure

### Documentation (this feature)

```text
specs/092-approve-draft-entities/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── explorer/
│   │   │   │   └── EntityList.svelte
│   │   │   ├── entity-detail/
│   │   │   │   └── DetailHeader.svelte
│   │   │   └── zen/
│   │   │       └── ZenHeader.svelte
```

**Structure Decision**: Modifying existing Svelte components in the web application.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       |            |                                      |
