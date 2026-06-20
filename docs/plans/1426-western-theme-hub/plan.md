# Plan: Western Theme Hub + Generator Expansion

## Overview

This plan outlines the steps needed to implement the requested "Western" theme hub (Issue #1426) and properly scope the implicitly required new UI theme to support it.

The implementation touches both the `web` application (routing, UI theming) and the `generator-engine` package (domain logic and vocabularies). The work has been split into phases, where Phase 1 and Phase 2 can be executed in parallel.

---

## Phase 1: Generator Engine Expansions (Domain Logic)

_Can be done in parallel with Phase 2. This is purely data/vocabulary work._

The `settlement` generator already includes Western vocabulary pools (scale, environment, tone, tension, etc.). We need to replicate this `byGenre` pattern for the remaining public generators in `packages/generator-engine/src/`.

- [ ] **Task 1.1:** Add Western entries to `public-npc.ts` (ancestries, roles, moralities, and names).
- [ ] **Task 1.2:** Add Western entries to `public-faction.ts` (faction types, scopes, and alignments).
- [ ] **Task 1.3:** Add Western entries to `public-quest.ts` (genres, tones, threats, twists, and locations).
- [ ] **Task 1.4:** Add Western entries to `public-social-hub.ts` (venue types, clientele, and atmosphere).
- [ ] **Task 1.5:** Add Western entries to `public-nation.ts` (polity types).

---

## Phase 2: Theme Setup (UI & Schema)

_Can be done in parallel with Phase 1. This establishes the visual identity of the hub._

- [ ] **Task 2.1:** **Theme Registration:** Add `'western'` to the list of valid themes wherever the schema or store validates themes (e.g., `packages/schema` or `theme` stores).
- [ ] **Task 2.2:** **`apps/web/src/app.css` Base Theme:** Add a new `[data-theme="western"]` block with a dusty, frontier-inspired palette (sepia backgrounds, leather-brown primary accents, faded red/rust warnings).
- [ ] **Task 2.3:** **`apps/web/src/app.css` Dark Theme:** Add a `[data-theme="western_dark"]` block for dark mode support (darker umber backgrounds with high-contrast tan text).
- [ ] **Task 2.4:** **CSS Fixes:** Add the `western` theme name to any combined CSS selectors (like focus states, borders) already managing existing themes in `app.css`.

---

## Phase 3: Hub Setup & Routing (Frontend)

_Depends on Phase 1 & Phase 2 being complete._

- [ ] **Task 3.1:** **Routing Constants:** Wire up `western` -> `"Western"` in the `HUB_THEME_TO_GENERATOR_GENRE` mapping (likely in `apps/web/src/lib/constants/generator-theme.ts` or equivalent).
- [ ] **Task 3.2:** **Generators Index Page:** Add a new Hub card component/link for the Western genre on the main `/generators` index route.
- [ ] **Task 3.3:** **Western Hub Route:** Create the route/page component for `/generators/western`.
  - Ensure this page wraps its child generators with the appropriate context or theme setter.
  - Implement `socialHubGenreToTheme` in this `+page.svelte` to ensure social hubs generated inside this hub inherit the `western` theme visually.

---

## Phase 4: Validation

_Depends on Phase 3._

- [ ] **Task 4.1:** **Visual Check:** Boot up the web client and navigate to the Western hub. Verify the `western` CSS theme applies cleanly (readability, contrast).
- [ ] **Task 4.2:** **Generator Check:** Test each public generator inside the hub to ensure the new Western vocab pools are firing (e.g., generating a Quest returns western-themed threats and twists).
