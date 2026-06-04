# Tasks: SEO Landing Page and Generator System

**Input**: Design documents from `/specs/129-seo-landing-pages/`
**Prerequisites**: plan.md (required), spec.md (required)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initial folder structures and shared configurations

- [ ] T001 Create folder structures for solutions, vs, and generators under `apps/web/src/routes/(marketing)/`
- [ ] T002 Set up config directory `apps/web/src/lib/config/` for seo configurations
- [ ] T003 Set up services directory `apps/web/src/lib/services/seo/` for generators and importer logic

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities, schemas, and configurations that block user stories

**⚠️ CRITICAL**: Setup sitemap entries and copy schemas before writing page components

- [ ] T004 Define `SEOPageData` and `SEOComparisonPageData` TypeScript schemas in `apps/web/src/lib/config/seo-pages.ts`
- [ ] T005 Update `svelte.config.js` to ensure the dynamic `/sitemap.xml` and other marketing routes are included in the prerender entries

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - SEO Pages Discovery & Indexing (Priority: P1) 🎯 MVP

**Goal**: Solutions and comparison pages are pre-rendered statically with structured JSON-LD schemas and SEO metadata.

**Independent Test**: Navigate to `/solutions/campaign-manager` and `/vs/obsidian` on a local static build and verify title, description, canonical link, and schema script tags.

### Implementation for User Story 1

- [ ] T006 [P] [US1] Write copy parameters for campaign-manager, worldbuilding-tool, ai-gm-assistant, and local-first-rpg solutions in `apps/web/src/lib/config/seo-pages.ts`
- [ ] T007 [P] [US1] Write copy parameters for obsidian, world-anvil, and legendkeeper comparisons in `apps/web/src/lib/config/seo-pages.ts`
- [ ] T008 [US1] Create the reusable SEO layout component `apps/web/src/lib/components/seo/SEOPageLayout.svelte` implementing Alegreya fonts and Tailwind 4 tokens
- [ ] T009 [P] [US1] Implement SvelteKit load and entry parameters for solutions in `apps/web/src/routes/(marketing)/solutions/[slug]/+page.ts`
- [ ] T010 [US1] Create the solutions Svelte page `apps/web/src/routes/(marketing)/solutions/[slug]/+page.svelte` using the layout wrapper
- [ ] T011 [P] [US1] Implement SvelteKit load and entry parameters for comparisons in `apps/web/src/routes/(marketing)/vs/[slug]/+page.ts`
- [ ] T012 [US1] Create the comparison Svelte page `apps/web/src/routes/(marketing)/vs/[slug]/+page.svelte` using standard, semantic HTML `<table>` layouts for feature matrices
- [ ] T013 [US1] Write unit tests verifying SEO page loaders and metadata extraction in `apps/web/src/routes/(marketing)/solutions/[slug]/solutions.test.ts`
- [ ] T029 [P] [US1] Inject `<link rel="help" href="/llms.txt">` into the head layout of all pre-rendered marketing templates
- [ ] T030 [P] [US1] Update `apps/web/static/llms.txt` to include index paths to new solutions and generator routes

**Checkpoint**: User Story 1 is fully functional and statically crawlable.

---

## Phase 4: User Story 2 - Interactive Client-Side Generators (Priority: P1)

**Goal**: Users customize parameters and procedurally generate names, NPCs, cities, and items using local name tables or the shared system proxy.

**Independent Test**: Load `/generators/npc` and click generate to verify that details are populated using fallback tables when offline, or the system proxy AI when online.

### Implementation for User Story 2

- [ ] T014 [P] [US2] Implement deterministic name tables and random list generator logic in `apps/web/src/lib/services/seo/generator-engine.ts`
- [ ] T015 [US2] Create the reusable generator UI template `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte` containing controls, generated card, and Save button
- [ ] T016 [P] [US2] Implement SvelteKit load and entry parameters for generators in `apps/web/src/routes/(marketing)/generators/[slug]/+page.ts`
- [ ] T017 [US2] Create Svelte page `/generators/[slug]/+page.svelte` incorporating options and the layout components
- [ ] T018 [US2] Write unit tests for procedural generator logic in `apps/web/src/lib/services/seo/generator-engine.test.ts`

**Checkpoint**: Generators are fully operational and visually polished.

---

## Phase 5: User Story 3 - Save Draft to App Funnel (Priority: P1)

**Goal**: Seamlessly transition draft data to the app shell via `localStorage` and auto-initialize a workspace vault to display the entity.

**Independent Test**: Generate an NPC, click "Save to Codex Cryptica", verify redirection, and check if the NPC has been successfully added to the active vault.

### Implementation for User Story 3

- [ ] T019 [P] [US3] Create `SeoImportService` in `apps/web/src/lib/services/seo/import-handler.ts` handling vault detection, auto-creation, and entity saving
- [ ] T020 [US3] Integrate `localStorage` serializer in `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte` on clicking "Save to Codex Cryptica"
- [ ] T021 [US3] Integrate `SeoImportService` in the main application shell `apps/web/src/routes/(app)/+page.svelte` inside the `onMount` block
- [ ] T022 [US3] Write unit tests verifying that draft import payloads are correctly parsed, validated, and added to the vault repository in `apps/web/src/lib/services/seo/import-handler.test.ts`

**Checkpoint**: The onboarding funnel successfully links generated entities to the app workspace.

---

## Phase 6: User Story 4 - Dynamic Sitemap Generation (Priority: P2)

**Goal**: Auto-generate sitemap.xml listing all static, blog, and SEO landing page URLs during compile time.

**Independent Test**: Run a production build and verify the sitemap XML structure.

### Implementation for User Story 4

- [ ] T023 [US4] Implement dynamic GET endpoint in `apps/web/src/routes/sitemap.xml/+server.ts` compiling solutions, vs, generators, and blog paths
- [ ] T024 [US4] Remove the static `apps/web/static/sitemap.xml` file to prevent build conflicts with the dynamic route
- [ ] T025 [US4] Write sitemap endpoint tests verifying valid XML tags and dynamic route inclusions in `apps/web/src/routes/sitemap.xml/sitemap.test.ts`

**Checkpoint**: The sitemap route compiles successfully.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance checks, build validations, and E2E test verification

- [ ] T026 Add Playwright E2E tests for the generator-to-app conversion funnel in `apps/web/src/routes/page.route.test.ts` using `--reporter=list`
- [ ] T027 Run build verification: `bun run build`
- [ ] T028 Run formatting and linter validation: `bun run lint` and verify all tests pass: `bun run test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. Blocks all subsequent User Story phases.
- **User Stories (Phases 3-5)**: Can proceed in parallel after Phase 2 is complete.
- **Sitemap (Phase 6)**: Depends on Phase 3 and Phase 4.
- **Polish (Phase 7)**: Depends on all previous phases.

---

## Parallel Opportunities

- Solutions (`T006`) and comparison (`T007`) copy data definition can be done in parallel.
- Solutions loader (`T009`) and comparison loader (`T011`) routes can be implemented in parallel.
- The procedural generator engine (`T014`) and sitemap compiler (`T023`) are independent files and can be written in parallel.
