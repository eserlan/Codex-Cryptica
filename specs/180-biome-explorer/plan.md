# Implementation Plan: Biome Explorer

**Branch**: `180-biome-explorer` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/180-biome-explorer/spec.md` · **Issue**: #4289 (follow-up #4290)

## Summary

A standalone **Biome Explorer** at `/biomes`. It holds a curated, bundled catalogue of real-world biomes, each with a reviewed AI-generated illustration (plus licensed photographs where available), ranged conditions, pattern/simplification/exception labels and cited sources. Users search, filter and compare biomes, then start a **custom biome** from a reference or from blank. A custom biome keeps reference values and the user's inventions in separate parts, and records fictional alterations with cause-and-effect notes. It is saved as an ordinary Note entity (`kind: "biome"`) carrying a new optional structured `biome` field, so it is listed, searched, synced, backed up and exported like other vault content. Profiles can be copied or exported as Markdown, and can yield an optional illustration prompt that starts "fantasy, illustration of". A user can attach an image through the existing entity image path, plus reference links.

Everything works offline and without AI. One clearly optional AI action ("Suggest effects") helps with fictional alterations. It is off when AI is disabled and never writes anything without the user accepting it.

**Technical approach (from [research.md](./research.md)):**

- A new framework-free package `packages/biome-engine` holds the catalogue (data modules, one per biome), the zod schemas, search and filter, the comparison matrix, profile creation and departure diffing, validation, Markdown rendering, the prompt builder, and the (injected) AI suggestion service.
- Surface: A public marketing route `(marketing)/biomes`, prerendered with dedicated SEO metadata and OpenGraph tags, linked via `/explore` and `/tools`.
- Client workbench with instant Markdown copy and download export, with no vault required.
- Library images are mostly AI illustrations the team generates before release (labelled, reviewed, with recorded provenance), plus optional licensed photographs; they are hosted on R2 (`assets.codexcryptica.com/biomes/…`), never committed. Text is bundled, so it works offline. Missing images fall back to a labelled placeholder.
- Maps, hex crawl and generators are not touched (FR-031).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**:

- `schema` (zod): one optional field, `biome`, on `EntitySchema`.
- `vault-engine` / the existing `vault` store: `createEntity` and `updateEntity` for saving.
- `ClipboardService`: copy as Markdown.
- Existing entity `image` path (`DetailImage`, `image-processing`, OPFS): user-attached image.
- `@codex/ai-engine` (`aiClientManager`) and the discovery-policy "AI disabled" gate: the optional suggestion action.
- Floating UI (already a dependency), `zod`, Tailwind 4 semantic tokens, Iconify Lucide classes.
- New internal package `packages/biome-engine`. **No new third-party dependency.**

**Storage**: Profiles are vault entities (OPFS Markdown + frontmatter, IndexedDB-indexed through the existing vault store). The additive `biome` frontmatter field is optional, so older vaults and older app versions still open them (unknown fields are tolerated like other additive fields). The catalogue is static bundled data. Device-local UI state only: last view (library/compare/my biomes) in `localStorage`. No IndexedDB schema, OPFS layout or migration change.
**Testing**: `bun test` in `packages/biome-engine` (catalogue integrity, search, compare, diff, Markdown, prompt, AI service with a fake runner). Vitest + jsdom for stores and components. One Playwright path (browse → customise → save → reload → export). Axe-style a11y checks as used elsewhere. Impacted-only runs per AGENTS.md.
**Target Platform**: Modern evergreen browsers on desktop, tablet and phone. Offline-capable PWA.
**Project Type**: Monorepo web application (SvelteKit app plus framework-free workspace packages).
**Performance Goals**: Library renders and filters in under 100 ms for the MVP catalogue (≤ 12 biomes). Comparison renders in under 100 ms. Profile save under 500 ms. Images lazy-loaded.
**Constraints**:

- Local-first. No tracking, and in particular nothing inside the authenticated vault app (see memory: vault privacy boundary).
- Works with AI disabled and with no network (images excepted).
- Keyboard-operable and screen-reader friendly.
- No horizontal page scroll at phone width.
- The Markdown export must keep reference, invented and fictional content in separate headings.

**Scale/Scope**: About 8–12 catalogue biomes (content sized in research.md), 1–2 images each (one generated main image, an optional photo). Seven user stories and 33 functional requirements. About 1 new package, about 12 new web modules/components, and about 5 small touch points in existing files.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status | How the plan meets it                                                                                                                                                                                                                                                   |
| --------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First            | PASS   | All logic is in `packages/biome-engine`; the web app is a thin UI layer.                                                                                                                                                                                                |
| II. TDD                     | PASS   | Tasks are test-first per package module and per store/component.                                                                                                                                                                                                        |
| III. Simplicity & YAGNI     | PASS   | No new dependency. Reuses `ClipboardService`, the entity image path, `createEntity`/`updateEntity`. No map, hex or generator coupling. One AI action only. Reuse check: no existing biome/terrain catalogue fits (hex terrain is a flat tile list, see research R7).    |
| IV. AI-First Extraction     | PASS   | Not an extraction feature. The one AI action returns structured suggestions that are validated with zod; the user accepts each.                                                                                                                                         |
| V. Privacy & Client-Side    | PASS   | Catalogue bundled; profiles stay in the vault. The only network use is loading catalogue images from the public asset host, and the optional AI action sends only the profile text the user is editing. No remote storage. The remote-storage exception is not invoked. |
| VI. Clean Implementation    | PASS   | Style guide, Runes, Tailwind semantic tokens, Iconify classes, impacted-only validation.                                                                                                                                                                                |
| VII. User Documentation     | PASS   | New Help article `biome-explorer` plus `FEATURE_HELP_ARTICLES` entry and a `FeatureHint` (see User Help Check).                                                                                                                                                         |
| VIII. Dependency Injection  | PASS   | Store and services take injected vault gateway, clipboard, AI runner and storage; class + singleton exported.                                                                                                                                                           |
| IX. Natural Language        | PASS   | Plain labels: "Biome Explorer", "Make my own", "Fictional change", "Why it works".                                                                                                                                                                                      |
| X. Quality & Coverage       | PASS   | New package targets ≥ 70% coverage on introduction; stores ≥ 50%.                                                                                                                                                                                                       |
| XI. Karpathy Rules          | PASS   | Surgical edits to existing files; explicit verification list in quickstart.                                                                                                                                                                                             |
| XII. Labels over Tags       | PASS   | Profiles carry **Labels** (`biome`, and the reference biome's name); the UI never says "tags". Catalogue filter chips are called "Filters".                                                                                                                             |
| XIII. Discovery Intent      | N/A    | `/biomes` is an authenticated app route (not in `governed-routes.ts`), not a public indexable page. If a public SEO page is wanted later it needs a registry entry first.                                                                                               |
| XIV. Bounded Responsibility | PASS   | See check below.                                                                                                                                                                                                                                                        |

**Memory-derived constraints applied**: never instrument anything inside the authenticated vault (no analytics events in the explorer), and make AI visible in new tools but with GM-authorship guardrails and an offline fallback (the "Suggest effects" action).

### Discovery Intent Check

N/A. The Explorer is an in-app tool route; no public discovery page is added or repositioned.

### Bounded Responsibility Check

Existing files this feature touches, with lines at planning time:

| File                                                   | Lines | Change                                                                                                          | Verdict                                                                                                  |
| ------------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/config/help-content.ts`              | 880   | one `FEATURE_HELP_ARTICLES` entry, one hint entry, one `HINT_KEYS` entry                                        | Over 500 but this is a **data-only** config registry (exempt, rule 4). Additions are registry rows only. |
| `apps/web/src/lib/stores/vault.svelte.ts`              | 981   | **not touched**: saving goes through the existing public `createEntity`/`updateEntity` via the injected gateway | Avoided on purpose.                                                                                      |
| `apps/web/src/lib/components/EntityDetailPanel.svelte` | 605   | **not touched**                                                                                                 | Avoided. Biome editing lives in the Explorer workspace.                                                  |
| `packages/schema/src/entity.ts`                        | 280   | one optional field + import                                                                                     | Under 500.                                                                                               |
| `apps/web/src/lib/components/layout/nav-items.ts`      | 307   | one nav entry                                                                                                   | Under 500.                                                                                               |
| `apps/web/src/lib/config/feature-groups.ts`            | 237   | add one hint id                                                                                                 | Under 500.                                                                                               |

New behaviour has a home in new files only: the engine package, one store, one service, one route and its components. Each new file holds one responsibility (see the structure below). No decomposition of existing files is needed.

### User Help Check

- [x] Help article `biome-explorer.md` is planned under `apps/web/src/lib/content/help/`.
- [x] It explains what users can do, where to find the Explorer, and the limits (not a climate simulator; real-world references versus fictional alterations; library images vs. your own).
- [x] A `FeatureHint` (`biome-explorer`) introduces the "Make my own" flow and is added to the "Get unstuck" group in `feature-groups.ts`.

**Post-design re-check**: still PASS. Design adds no new dependency, no storage migration and no existing-file growth beyond registry rows. The one open risk, content licensing, is handled as an explicit content-gate task (research R3), not a code risk.

## Project Structure

### Documentation (this feature)

```text
specs/180-biome-explorer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── biome-engine-api.md   # Public package API
│   └── ui-contract.md        # Route, components, a11y and persistence contract
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/biome-engine/                      # NEW, framework-free
├── package.json  tsconfig.json  bunfig.toml
├── src/
│   ├── index.ts                            # public exports
│   ├── model.ts                            # zod: ReferenceBiome, BiomeProfile, Alteration, Source, ImageRef (generated | licensed)
│   ├── catalogue/
│   │   ├── index.ts                        # BIOME_CATALOGUE (array), BIOME_SOURCES
│   │   ├── sources.ts                      # shared citation records (data only)
│   │   ├── images.ts                       # BIOME_ILLUSTRATION_STYLE + buildBiomeImagePrompt (maintainer-only, not imported by the app)
│   │   └── <one data module per biome>.ts  # e.g. boreal-forest.ts, hot-desert.ts
│   ├── search.ts                           # text search + filter facets
│   ├── compare.ts                          # comparison matrix builder
│   ├── profile.ts                          # create from reference/blank, edit ops, departure diff
│   ├── validate.ts                         # save-time checks and warnings
│   ├── markdown.ts                         # profile → Markdown (separate headings)
│   ├── prompt.ts                           # illustration prompt builder
│   └── suggest.ts                          # optional AI "Suggest effects" with injected runner
└── tests/                                  # *.test.ts per module + catalogue-integrity.test.ts

packages/schema/src/
├── entity.ts                               # + optional `biome` field (BiomeProfileSchema re-use)
└── biome.ts                                # NEW: BiomeProfileSchema lives here (schema owns persisted shape)

apps/web/src/
├── routes/(app)/biomes/
│   ├── +page.svelte                        # workspace shell: Library | Compare | My biomes
│   └── +page.ts
├── lib/stores/biome-explorer.svelte.ts     # UI state + profile persistence via injected gateway
├── lib/services/biome/
│   ├── biome-vault-gateway.ts              # maps profile ⇄ Note entity (kind "biome")
│   └── biome-suggest-runner.ts             # adapts aiClientManager to the engine's runner type
├── lib/components/biomes/
│   ├── BiomeLibrary.svelte                 # search, filters, card grid
│   ├── BiomeCard.svelte                    # concise illustrated card
│   ├── BiomeDetail.svelte                  # on-demand ecology/climate details, sources
│   ├── BiomeImage.svelte                   # image + attribution + placeholder fallback
│   ├── BiomeStatement.svelte               # statement text + basis badge + source markers
│   ├── (smaller parts split out to stay under the complexity gate: BiomeDisclosure, BiomeConditions,
│   │    BiomeStatementList, BiomeSourceList, BiomeDetailActions, BiomeCompareTable/Cell, BiomeClimateFields,
│   │    BiomeTextFields, BiomeEditorActions, BiomeDiscardDialog, BiomeAlterationCard, BiomeSuggestions,
│   │    BiomeAttachments, BiomeNav, BiomeNotice, BiomeEditorView, BiomeMineView, BiomeCopyFallback)
│   ├── BiomeCompare.svelte                 # aligned comparison, stacks on phones
│   ├── BiomeProfileEditor.svelte           # reference vs. my changes, alterations
│   ├── BiomeAlterationList.svelte          # fictional alterations + cause-and-effect notes
│   └── BiomeProfileList.svelte             # My biomes: open, duplicate, delete, export
├── lib/components/layout/nav-items.ts      # + "Biomes" entry (overflow placement)
├── lib/config/help-content.ts              # + article id, hint, HINT_KEYS row
├── lib/config/feature-groups.ts            # + hint id in "Get unstuck"
└── lib/content/help/biome-explorer.md      # NEW Help article

# Image assets: uploaded to R2 (codex-cryptica-statics → https://assets.codexcryptica.com/biomes/…).
# No image files are committed to the repository.
```

**Structure Decision**: Option "Web application + library package", matching `hex-crawl-engine` and `entity-template-engine`. The persisted shape lives in `schema` (it owns every vault record shape), while behaviour lives in `biome-engine`. The Explorer is a route of its own (not a sidebar panel, an entity-detail tab, or a generator) because the issue asks for an obvious worldbuilding entry point that is not a random generator, and because that keeps `EntityDetailPanel` and `vault.svelte.ts` untouched.

## Complexity Tracking

No constitution violations. One note for reviewers: `help-content.ts` is over 500 lines, but only registry rows are added, which Principle XIV rule 4 exempts.
