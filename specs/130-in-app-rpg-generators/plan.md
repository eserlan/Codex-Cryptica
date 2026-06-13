# Implementation Plan: In-App RPG Generators

**Branch**: `130-in-app-rpg-generators` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/130-in-app-rpg-generators/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a native campaign-side generator workflow for NPC, Faction, Settlement, and Magic Item drafts. The workflow will expose a typed campaign generator registry, render a Svelte 5 configuration/review modal, generate drafts through existing RPG generator services with non-AI fallback, save approved drafts directly into the active vault, optionally create a relationship to a source entity, and add user-facing help. The public SEO generator pages remain separate surfaces that share generator logic but are not embedded in the campaign app.

## Technical Context

**Language/Version**: TypeScript 6.0.3 + Svelte 5 runes  
**Primary Dependencies**: SvelteKit, Tailwind 4 semantic tokens, new `packages/generator-engine` workspace package over existing public generator logic, `@google/generative-ai` via existing `aiClientManager`, existing vault/theme/modal/help stores  
**Storage**: OPFS and IndexedDB through existing vault stores; generated drafts remain transient until explicit save  
**Testing**: Vitest, Svelte Testing Library, `bun run --filter generator-engine test`, existing `bun run --filter '*' lint:types`, `bun run --filter '*' lint`, `bun run --filter '*' test -- --changed`  
**Target Platform**: Browser, local-first Codex Cryptica campaign app  
**Project Type**: SvelteKit web app as a thin UI layer over reusable workspace packages  
**Performance Goals**: Open generator modal under 100ms after lazy component load; non-AI draft generation under 500ms for supported generators; direct save uses existing vault write path without extra import roundtrip  
**Constraints**: Must work without AI; must not send full vault contents to AI by default; must respect guest/read-only/AI-disabled states; must use labels rather than tags; must use Svelte 5 runes, Iconify utility classes, and Tailwind 4 semantic tokens  
**Scale/Scope**: Initial support for 4 generators, one active draft at a time, optional source-entity context, no new persistence format

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: PASS. The plan adds `packages/generator-engine` for generator contracts, registry, theme defaults, draft mapping, AI policy, and save orchestration. The web app stays a thin Svelte UI layer that injects vault, AI, theme, and modal dependencies.
2. **TDD**: PASS. Phase 1 tasks must add failing tests for generator registry lookup, output mapping, invalid generator handling, save success, save failure, guest/read-only blocking, and theme defaults before implementation.
3. **Simplicity & YAGNI**: PASS. The plan reuses current generator functions and vault APIs, does not embed SEO pages, and limits the new package to the core logic required by this major feature.
4. **AI-First Extraction**: PASS. AI-backed generation uses existing AI client plumbing and structured generator outputs; non-AI fallback remains mandatory.
5. **Privacy & Client-Side Processing**: PASS. Drafts are transient client state, saving uses local vault persistence, and AI context is explicit/minimal.
6. **Clean Implementation**: PASS. UI must follow `docs/STYLE_GUIDE.md`, Svelte 5 runes, Tailwind 4 tokens, and Iconify utility icons. Validation commands are defined.
7. **User Documentation**: PASS. Help content and, if needed, a `FeatureHint` are included in the plan.
8. **Dependency Injection**: PASS. New service classes must use constructor injection with sensible defaults and exported singleton instances.
9. **Natural Language**: PASS. User-facing text must use plain terms like "Generate", "Draft", "Save", "Labels", and avoid jargon.
10. **Coverage Enforcement**: PASS. New logic tests must maintain or improve affected coverage floors.
11. **Agent Protocol**: PASS. Plan defines scope, assumptions, and verification before implementation.
12. **Labels Over Tags**: PASS. All generated metadata is labels; no new user-facing "tag" language.

## Project Structure

### Documentation (this feature)

```text
specs/130-in-app-rpg-generators/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/src/lib/
├── components/
│   ├── generators/
│   │   ├── CampaignGeneratorModal.svelte
│   │   ├── GeneratorConfigForm.svelte
│   │   ├── GeneratorDraftReview.svelte
│   │   └── *.test.ts
│   └── modals/
│       └── GlobalModalProvider.svelte
├── services/
│   └── seo/
│       ├── generator-engine.ts
│       └── generator-engine.test.ts
├── stores/
│   └── ui/
│       ├── modal-ui.svelte.ts
│       └── modal-ui.svelte.test.ts
└── config/
    └── help-content.ts

apps/web/src/lib/content/help/
└── in-app-generators.md

packages/generator-engine/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts
    ├── campaign-generator-types.ts
    ├── campaign-generator-registry.ts
    ├── campaign-generator-registry.test.ts
    ├── campaign-generator-service.ts
    ├── campaign-generator-service.test.ts
    ├── campaign-generator-theme.ts
    └── campaign-generator-theme.test.ts
```

**Structure Decision**: Implement the feature as a campaign-app UI flow over `packages/generator-engine`. Existing public generator code may be adapted or wrapped by the package, but campaign generator contracts, mapping, validation, AI policy, theme defaults, and save orchestration must live in the package. The modal stays lazy-loaded through `GlobalModalProvider`; modal state lives in `modal-ui.svelte.ts`; Svelte components only render and pass injected dependencies into package services.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations.

## Phase Plan

### Phase 1: Generator Contracts And Campaign Registry

- Create `packages/generator-engine` with package metadata, TypeScript config, Vitest config, and public exports.
- Define supported generator ids: `npc`, `faction`, `settlement`, `magic-item`.
- Define a typed registry with option metadata, defaults, theme hook, generator invoker, and output mapper.
- Define transient `GeneratedDraft` and save request shapes.
- Add tests for successful registry lookup, invalid generator id, output-to-draft mapping, label preservation, and package exports.

### Phase 2: Native In-App Generator Hub

- Add modal UI state and lazy-load `CampaignGeneratorModal` through `GlobalModalProvider`.
- Add campaign workspace entry point near existing create actions.
- Build semantic forms with visible labels, fieldsets for option groups, native submit handling, clear validation, and accessible loading/error states.
- Use platform dismiss behavior already present in modal patterns; avoid custom non-semantic controls.
- Add Svelte component tests for selection, form rendering, draft generation success, and cancellation/no-save behavior.

### Phase 3: Direct Vault Import And Review

- Add review step for title, type, content/summary, lore/details, and labels.
- Save approved drafts through existing `vault.createEntity(...)`.
- Preserve unsaved draft on save failure and block guest/read-only/unavailable campaign saves with plain language.
- Add tests for save success, save failure preserving draft, guest blocked save, read-only blocked save, unavailable campaign blocked save, and no `localStorage` transfer.

### Phase 4: Contextual Launch And Theme-Aware Defaults

- Map `themeStore.worldThemeId`/active theme to generator defaults without hiding user overrides.
- Support optional source entity context when launched from an entity.
- Save optional relationship through `vault.addConnection(...)`.
- Keep AI context explicit and minimal; do not send full vault contents.
- Add tests for theme mapping, neutral fallback, relationship creation, AI-disabled/local fallback behavior, and AI context minimization.

### Phase 5: Documentation, Release Polish, And Alignment

- Add help article and optional `FeatureHint`.
- Verify public generator pages still load and primary generation behavior remains aligned.
- Verify existing `Generate Related Entity` behavior remains intact.
- Add user-facing changelog only when the actual user-visible workflow ships.
- Validate modal-open and non-AI generation timing against the performance goals or record a justified deviation.

## Verification Plan

- `bun run --filter generator-engine test`
- `bun run --filter web test -- src/lib/components/generators`
- `bun run --filter web test -- src/lib/stores/ui/modal-ui.svelte.test.ts`
- `bun run --filter web test -- src/lib/services/seo/generator-engine.test.ts`
- `bun run --filter '*' lint:types`
- `bun run --filter '*' lint`
- `bun run --filter '*' test -- --changed`
