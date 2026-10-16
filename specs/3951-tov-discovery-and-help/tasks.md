# Tasks: ToV Onboarding, Help and Discovery Pages Tied to Working Features

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Parent Epic**: #3941 | **Issue**: #3951  
**Date**: 2026-10-16  
**Status**: Ready

---

## Phase 1: Setup & Registries

**Purpose**: Discovery governance registrations and contracts.

- [x] T001 Register `/for/tales-of-the-valiant` in `apps/web/src/lib/content/discovery/entries/for.ts` under cluster `system-guides`
- [x] T002 Register `/answers/how-do-i-organise-a-tales-of-the-valiant-campaign` in `apps/web/src/lib/content/discovery/entries/answers.ts` under cluster `campaign-prep`
- [x] T003 Verify `bun scripts/discovery-audit.mjs` runs and validates registration entries

---

## Phase 2: User Story 1 - Public System Guide (/for/tales-of-the-valiant) (Priority: P1) 🎯 MVP

**Goal**: Deliver a comprehensive system guide landing pack for Tales of the Valiant GMs and players tied strictly to shipped CC capabilities and compliant with BFRD CC BY 4.0 attribution.

### Tests for User Story 1

- [x] T004 [P] [US1] Create unit tests in `apps/web/src/lib/content/for/packs/tales-of-the-valiant.test.ts` verifying slug, theme, use cases, example graph, and BFRD attribution notice

### Implementation for User Story 1

- [x] T005 [US1] Implement `talesOfTheValiant` in `apps/web/src/lib/content/for/packs/tales-of-the-valiant.ts` with authentic ToV workflows (Lineage/Heritage, Luck tracking, Doom adversary pools, BFRD stat blocks, character JSON interchange)
- [x] T006 [US1] Export `talesOfTheValiant` from `apps/web/src/lib/content/for/packs/index.ts` and ensure it is registered in `getAllLandingPages()`
- [x] T007 [US1] Run `bun test apps/web/src/lib/content/for/registry.test.ts` to confirm dynamic prerender routing loads `/for/tales-of-the-valiant`

---

## Phase 3: User Story 2 - Authoritative Reference Answer (Priority: P1)

**Goal**: Deliver an authoritative reference answer page on organizing a Tales of the Valiant campaign following British English, snippet-first, worked before/after example, and prep checklist.

### Tests for User Story 2

- [x] T008 [P] [US2] Create unit tests in `apps/web/src/lib/content/answers/pages/how-do-i-organise-a-tales-of-the-valiant-campaign.test.ts` verifying `shortAnswer` length ($\ge 140$), zero em/en dashes, zero emojis, British English spellings, and presence of worked example and checklist

### Implementation for User Story 2

- [x] T009 [US2] Implement `howDoIOrganiseATalesOfTheValiantCampaign` in `apps/web/src/lib/content/answers/pages/how-do-i-organise-a-tales-of-the-valiant-campaign.ts`
- [x] T010 [US2] Export from `apps/web/src/lib/content/answers/pages/index.ts` and register in `apps/web/src/lib/content/answers/registry.ts`
- [x] T011 [US2] Run `bun test apps/web/src/lib/content/answers/registry.test.ts apps/web/src/lib/content/answers/categories.test.ts`

---

## Phase 4: User Story 3 - In-Product Help & Cif AI Target (Priority: P2)

**Goal**: Deliver an in-app help article `tales-of-the-valiant.md` explaining how to configure and use the shipped ToV system profile, Luck and Doom trackers, stat sheets, and imports.

### Tests for User Story 3

- [x] T012 [P] [US3] Add test assertion in `apps/web/src/lib/content/help-registry.test.ts` verifying `tales-of-the-valiant.md` frontmatter, tags, and indexing

### Implementation for User Story 3

- [x] T013 [US3] Create `apps/web/src/lib/content/help/tales-of-the-valiant.md` with step-by-step guidance on vault profiles, Luck/Doom counters, TovChargen JSON interchange, and generators
- [x] T014 [US3] Cross-reference `tales-of-the-valiant.md` in `apps/web/src/lib/content/help/tales-of-the-valiant-generators.md`

---

## Phase 5: Polish & Quality Gates

**Purpose**: Verification and quality gate compliance.

- [x] T015 Run `bun scripts/discovery-audit.mjs`
- [x] T016 Run `bun run test:changed` across affected workspaces
- [x] T017 Run `bun run lint:changed` across all modified and new files
- [x] T018 Run scoped type check: `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web`
- [x] T019 Run `bunx fallow audit --format human --base origin/staging`
- [x] T020 Run `codex-review` specialist review
