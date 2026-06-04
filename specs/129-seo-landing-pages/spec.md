# Feature Specification: SEO Landing Page and Generator System

**Feature Branch**: `129-seo-landing-pages`  
**Created**: 2026-06-02  
**Status**: Draft  
**Input**: Build a crawler-friendly SEO landing page system targeting RPG campaigns, worldbuilding, comparisons (Obsidian/World Anvil), and client-side generators (NPCs, Names, Settlements, Magic Items) with a seamless onboarding funnel to the app.

---

## Clarifications

### Session 2026-06-02

- **Q**: AI Integration on Public Generator Pages: Should the public generator landing pages allow users to toggle an AI Mode by providing their own Gemini API key, or should they be strictly powered by client-side random/deterministic generators?
- **A**: The generator pages should run using Codex Cryptica's default shared system proxy (`oracle-proxy.espen-erlandsen.workers.dev`) under the hood to generate high-quality AI results for public visitors immediately without requiring them to supply an API key.
- **Q**: Modern LLM / AI Search Engine Optimization (GEO): How should we optimize the landing page system for modern LLMs and search engines (like SearchGPT, Perplexity)?
- **A**: We will link to the `llms.txt` file in all marketing routes, and structure comparison pages using standard semantic HTML `<table>` elements so AI search crawlers can parse feature matrices directly.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - SEO Pages Discovery & Indexing (Priority: P1)

As a search engine user, I want to find Codex Cryptica through searches like "best campaign manager" or "Codex Cryptica vs Obsidian", landing on a fast, pre-rendered page that clearly explains the app's value.

**Why this priority**: Crucial for organic discovery and initial funnel entry.
**Independent Test**: Build and verify the page structure, meta tags, and schema payloads using local static build checks without requiring JavaScript execution.
**Acceptance Scenarios**:

1. **Given** a search crawler visits `/solutions/campaign-manager` or `/vs/obsidian`, **When** the page is requested, **Then** it receives a fully static pre-rendered HTML document with a valid title, description, canonical URL, and JSON-LD schema (FAQPage or SoftwareApplication).
2. **Given** a user loads the static solutions page, **When** they look at the UI, **Then** they see clear comparisons, features, and a primary CTA button to enter the main app.

---

### User Story 2 - Interactive Client-Side Generators (Priority: P1)

As an RPG game master, I want to use high-quality interactive generators (NPC, Name, Settlement, Magic Item) directly on the marketing landing pages without signing up or waiting for server round-trips.

**Why this priority**: Drives engagement and demonstrates immediate product utility.
**Independent Test**: Open `/generators/npc` offline, select options, click "Generate", and verify a fully detailed RPG entity is instantly procedurally built.
**Acceptance Scenarios**:

1. **Given** a user is on the NPC generator page, **When** they select options (e.g. race, role, alignment) and click "Generate", **Then** the page uses deterministic local tables to procedurally generate a name, character attributes, chronicle description, and GM-facing lore.
2. **Given** a generated entity, **When** the user edits its name or regenerates, **Then** the UI updates instantly with smooth micro-animations (transitions).

---

### User Story 3 - Save Draft to App Funnel (Priority: P1)

As a user who generated an entity, I want to click a single button to import it directly into a new or existing Codex Cryptica vault so I can start editing my lore immediately.

**Why this priority**: Bridges the gap between passive visitors and active, onboarded users.
**Independent Test**: Generate an NPC, click "Save to Codex Cryptica", verify it serializes to `localStorage` under `__codex_pending_import`, redirects to `/`, and imports into a vault.
**Acceptance Scenarios**:

1. **Given** a user has generated a settlement on the landing page, **When** they click "Save into Codex Cryptica", **Then** the entity is serialized into `localStorage` and the browser is redirected to the app root (`/`).
2. **Given** the app shell mounts with a pending draft in `localStorage`, **When** the vault initializes (auto-creating a default vault if none exists), **Then** the draft is added as a new entity, selected in the sidebar explorer, and shown in the knowledge graph.

---

### User Story 4 - Dynamic Sitemap Generation (Priority: P2)

As a search engine crawler, I want to retrieve an up-to-date sitemap listing all blog posts, solutions, comparison pages, and generators so I can discover and index all public routes.

**Why this priority**: Ensures search engine bots can crawl the entire public site without missing new pages.
**Independent Test**: Load `/sitemap.xml` and verify it contains all solutions, comparisons, generators, and blog articles dynamically gathered from the code repository.
**Acceptance Scenarios**:

1. **Given** the static site is built, **When** SvelteKit runs the pre-render process, **Then** it generates a valid `/sitemap.xml` containing all static routes, blog posts, solutions, comparisons, and generators.

---

## Edge Cases

- **No Existing Vault**: If a user saves a draft but has never initialized a vault before, the app must auto-generate a default local vault (e.g., "My Codex Vault") so they are not blocked by the onboarding welcome screen.
- **Duplicate Entity Name**: If a user imports a generated entity whose name already exists in their active vault, the app must automatically append a suffix (e.g., `Thorgar Ironfoot (Imported)`) to prevent unintended file overwrites.
- **LocalStorage Unavailable**: If `localStorage` is disabled or blocked by strict browser security settings, the landing page must present a secondary "Copy Markdown" button as a fallback so the user can manually paste it in the editor.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: SvelteKit marketing pages under `(marketing)` MUST be statically pre-rendered (`prerender = true`, `ssr = true`).
- **FR-002**: Every landing page MUST inject unique page title, meta description, canonical URL, and Open Graph tags.
- **FR-003**: Comparison and solutions pages MUST include JSON-LD structured schemas (`SoftwareApplication` / `FAQPage`).
- **FR-004**: Generator pages MUST default to AI-powered generation under the hood using Codex Cryptica's shared system proxy, falling back gracefully to client-side deterministic/random tables if proxy limits are reached or the client is offline.
- **FR-005**: Generators MUST support exporting/saving the entity via `localStorage` payload transfer to `/` for instant onboarding.
- **FR-006**: The app shell MUST intercept `__codex_pending_import` from `localStorage` on mount, initialize a vault if none exists, write the markdown file, and select the newly created entity.
- **FR-007**: A dynamic `/sitemap.xml` route MUST gather all public URLs and compile them into XML format during SvelteKit build.
- **FR-008**: Comparison tables on the comparison routes MUST use standard, semantic HTML `<table>` elements to ensure AI search bots (e.g. SearchGPT, Perplexity) can parse them cleanly.
- **FR-009**: All marketing templates MUST include a `<link rel="help" href="/llms.txt">` header link tag referencing the project's LLM-friendly documentation.

### Key Entities

- **SEOPagedata**: Holds parameters for solutions and comparison copy (meta data, headings, lists, comparisons).
- **GeneratorConfig**: Holds the tables and lists (prefixes, traits, secrets, rules) used by the client-side generator logic.
- **ImportDraft**: The schema representing the generated entity to be passed to the app shell (title, type, content, labels).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of marketing and generator pages are indexable by crawlers with valid canonical links and metadata visible in raw HTML source.
- **SC-002**: Page load speed for static marketing routes remains under 500ms on standard network profiles.
- **SC-003**: The client-side generators construct and display a fully-fleshed NPC, town, item, or name in under 100ms.
- **SC-004**: Redirecting and saving a draft into a new vault takes fewer than 3 clicks from initial generator run to final app workspace display.
