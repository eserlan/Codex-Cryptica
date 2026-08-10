# Feature Specification: Genre and System Landing Pages (/for/[slug])

**Feature Branch**: `binder/landing-page-shell` (or as created by hook)
**Created**: 2026-08-10
**Status**: Draft
**Input**: Parent Issue #2157 (Add genre- and system-specific welcome/intro pages) & Issue #2158 (Data-driven `/for/...` shell)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Discovering Codex Cryptica for a Specific RPG System (Priority: P1)

As a Game Master looking for software to organize a specific game system (e.g., _Vampire: The Masquerade_ or _Call of Cthulhu_), I want a dedicated landing page that speaks directly in the terminology of my game, so I understand how Codex Cryptica solves my specific campaign management problems without replacing my rulebooks.

**Why this priority**: Users search for tools using game-specific queries (e.g., "how to organise a VtM chronicle") rather than generic terms. This directly addresses organic search discovery and community landing destinations.

**Independent Test**: Can be tested by navigating to `/for/vampire-the-masquerade` and verifying that the language, use cases, relationship graph preview (`Prince → Sheriff → Primogen`), and disclaimer accurately reflect VtM campaign prep.

**Acceptance Scenarios**:

1. **Given** a GM lands on `/for/vampire-the-masquerade`, **When** the page renders, **Then** they see a hero section addressing VtM prep friction, 3–5 specific VtM use cases (coteries, Elysiums, clan politics, secrets), a visual graph example, relevant generators (e.g., Vampire Clan generator), a tailored CTA ("Start your chronicle"), and a prominent non-affiliation disclaimer.
2. **Given** the page renders, **When** inspecting the document `<head>`, **Then** the title and description are tailored for VtM chronicle management SEO.

---

### User Story 2 - Discovering Codex Cryptica for a Broad Genre (Priority: P1)

As a worldbuilder or GM creating a campaign in a specific genre (e.g., Fantasy Worldbuilding or Sci-Fi/Space Opera), I want a landing page tailored to that genre's information needs, so I can see how Codex Cryptica helps me structure pantheons, factions, and maps.

**Why this priority**: Genre pages capture broad search volume (e.g., "tools for fantasy worldbuilding") and serve as cross-system entry points.

**Independent Test**: Can be tested by navigating to `/for/fantasy-worldbuilding` and verifying genre-specific use cases, generator links, and CTA without system non-affiliation disclaimers.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/for/fantasy-worldbuilding`, **When** the page loads, **Then** they see fantasy-focused use cases (factions, magic systems, pantheons, timelines), fantasy generator links, and a CTA ("Build your fantasy world").
2. **Given** the genre page renders, **When** inspecting the layout, **Then** it does not render a non-affiliation disclaimer.

---

### User Story 3 - Adding New System or Genre Pages via Config (Priority: P2)

As a maintainer/developer, I want to add new system or genre landing pages (e.g., Cyberpunk RED, Call of Cthulhu, Space Opera) by creating pure data configuration entries without writing new UI page components.

**Why this priority**: Prevents code duplication and UI bloat across 15+ future landing pages while keeping content human-curated and high quality.

**Independent Test**: Can be tested by adding a new configuration entry to the registry and confirming that `/for/[slug]` renders the complete page automatically.

**Acceptance Scenarios**:

1. **Given** a new configuration entry in the registry, **When** navigating to its slug, **Then** the dynamic `/for/[slug]` shell renders all sections automatically.
2. **Given** a configuration entry with optional sections omitted (e.g., no `exampleGraph`), **When** the page renders, **Then** the shell collapses that section cleanly without blank gaps or layout errors.

### Edge Cases

- **Non-existent slug**: Navigating to `/for/unknown-slug` must return a 404 Not Found response.
- **System affiliation clarity**: System-specific pages must clearly position Codex Cryptica as system-agnostic campaign management and include non-affiliation disclaimers to avoid trademark confusion.
- **Prerendering & Sitemap**: All registered `/for/[slug]` pages must be automatically exported during static site generation and included in `sitemap.xml`.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a unified dynamic route at `/for/[slug]` that acts as the single reusable shell for all genre and system landing pages.
- **FR-002**: The page content MUST be driven by a structured data model containing:
  - `slug`: unique URL identifier
  - `kind`: `'system'` | `'genre'` | `'use-case'`
  - `hero`: headline, tagline, and genre/system-specific problem statement
  - `useCases`: 3–5 tailored use case blocks (title, description, optional icon)
  - `exampleGraph`: optional visual/textual campaign structure preview (e.g., entity nodes & connections)
  - `recommendedTools`: list of relevant Codex Cryptica tools/generators with direct links
  - `cta`: tailored action text (e.g., "Start your chronicle") and link target
  - `seo`: page title, meta description, and canonical URL metadata
  - `disclaimer`: optional legal non-affiliation statement for trademarked game systems
- **FR-003**: The shell MUST render 5 standard sections in sequence:
  1. Hero & Problem Statement
  2. How Codex Cryptica Helps (Tailored Use Cases)
  3. Example Campaign / World Structure (Graph Preview)
  4. Useful Tools & Generators
  5. Call to Action (CTA)
- **FR-004**: System MUST support system-specific pages (e.g., _Vampire: The Masquerade_) with non-affiliation disclaimers while keeping system-agnostic campaign positioning.
- **FR-005**: System MUST support genre-specific pages (e.g., _Fantasy Worldbuilding_) without requiring disclaimers.
- **FR-006**: System MUST automatically include all valid `/for/[slug]` pages in static build prerendering and `sitemap.xml`.
- **FR-007**: System MUST include initial content packs for validation:
  - `/for/vampire-the-masquerade` (System page prototype)
  - `/for/fantasy-worldbuilding` (Genre page prototype)

### Key Entities

- **LandingPageConfig**: Schema defining the content, metadata, use cases, graph examples, and disclaimers for a single `/for/[slug]` destination.
- **LandingPageRegistry**: Central data collection of all registered `LandingPageConfig` objects.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Initial launch ships both a system page (`/for/vampire-the-masquerade`) and a genre page (`/for/fantasy-worldbuilding`) powered by 100% shared UI shell components.
- **SC-002**: Adding a future landing page (e.g., `call-of-cthulhu` or `cyberpunk`) requires 0 new `.svelte` UI files.
- **SC-003**: 100% of registered `/for/...` pages pass static prerendering and appear in `sitemap.xml`.
- **SC-004**: System pages pass trademark compliance review by presenting non-affiliation disclaimers and positioning as system-agnostic campaign management tools.
