# Codex Cryptica — UI/UX and “AI-Made” Perception Assessment

**Date:** 2026-08-07

**Surface reviewed:** Production at `https://codexcryptica.com/`

**Viewports:** Desktop Chrome at 1440 × 1000; mobile Chrome at 390 × 844

**Method:** Browser-driven heuristic review using Playwright, accessibility snapshots, interaction walkthroughs, and visual screenshot review. This is not a moderated usability study, so perception findings should be validated with real users.

## Executive summary

The criticism is **partly fair, but it is aimed at the wrong layer**.

Codex Cryptica's core workspace does not look like a generic AI-generated product. The parchment system, spatial graph, node shields, local-first model, table view, and mobile entity reader have a recognizable point of view. The product itself has more visual personality than most campaign tools.

The “obviously made by AI” impression is created mainly by the surrounding marketing and content system:

- a familiar AI-template hero formula: eyebrow → welcome line → oversized headline → secondary headline → broad explanatory paragraph;
- repeated all-caps, heavily letter-spaced labels on nearly every surface;
- large grids of equally weighted rounded cards;
- polished but generic phrases such as “campaign-ready,” “in seconds,” “unique, rich lore,” and “next generation”;
- a feature page that reads like an automatically dumped changelog rather than an edited product story;
- three near-duplicate NPC generator entries in the tools directory;
- a blog index with many similarly structured AI articles published on the same day;
- visual shells that change noticeably between the workspace, tools directory, public generator, feature page, and blog.

In short: **the product looks authored; the presentation layer often looks generated.** The best response is not a broad redesign. It is tighter editing, a more consistent global shell, less cardification, more real product evidence, and immediate fixes to several responsive workspace defects.

## Overall assessment

| Area                      | Assessment | Why                                                                                                                |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Core visual identity      | Strong     | Parchment, graph shields, restrained amber/brown palette, and spatial model are distinctive.                       |
| Marketing distinctiveness | Weak–mixed | The welcome hierarchy and card grids use common AI/SaaS composition patterns.                                      |
| Product clarity           | Mixed      | Local-first is clear, but too many terms and controls compete at once.                                             |
| Content design            | Weak       | Features and blog content are insufficiently curated and look programmatically accumulated.                        |
| Desktop workspace         | Mixed      | Powerful and expressive, but cramped, clipped, and over-controlled in Full Toolbox mode.                           |
| Mobile experience         | Mixed–good | Entity reading is strong; graph discovery and initial legibility are weak.                                         |
| Accessibility foundation  | Promising  | Dialog, tab, status, navigation, and control semantics are generally strong; graph-node access needs verification. |
| Human trust signals       | Weak       | Very little creator voice, user evidence, real-world screenshots, or authored explanation balances the AI framing. |

## What is already good

### 1. The core product has a real visual thesis

The default parchment workspace is not another purple-gradient dashboard. The node shields, dotted drafting surface, editorial serif type, compact metadata, and physical-workbench feeling support the worldbuilding use case. The graph and table feel like two views of the same archive rather than unrelated features.

![Desktop table view](ux-assessment/screenshots/desktop-table.png)

The table view is especially effective:

- hierarchy is immediate;
- type colors add meaning without dominating;
- summaries are dense but scannable;
- filter chips and search sit where users expect them;
- the screen feels like a working tool, not a marketing mockup.

### 2. “Local-first, no account” is a meaningful differentiator

The product repeatedly communicates that a user can begin without registration and keep notes locally. That is concrete, relevant, and increasingly rare. It should remain the center of the brand, but expressed with fewer repeated synonyms.

### 3. The public generator has a strong genre-specific atmosphere

The generator is one of the most convincing surfaces. The parchment, narrow input rail, generated dossier, contextual summary, and themed loading copy create an actual workbench.

![Desktop public generator result](ux-assessment/screenshots/desktop-generator-result.png)

The flow also behaves well:

- `Surprise Me` changes inputs and starts generation;
- the loading state clearly masks stale output;
- save and copy actions are prominent;
- generated drafts enter a session hub instead of disappearing;
- mobile reorders the interface into a sensible form → action → output sequence.

### 4. Mobile entity reading is visually strong

The full-screen mobile entity view has a clear title, readable image treatment, obvious section tabs, and large primary actions. It feels closer to a campaign field guide than a compressed desktop panel.

![Mobile entity detail](ux-assessment/screenshots/mobile-entity-detail.png)

### 5. Interaction semantics are better than the visuals sometimes imply

The browser accessibility snapshots exposed meaningful dialogs, tablists, tabs, status messages, navigation landmarks, switches, and descriptive control labels. The mobile menu correctly behaves as a dialog, and the entity screen exposes its sections as tabs. This is solid foundational work.

## Why parts of the product look “AI-made”

### 1. The welcome page uses the default AI/SaaS hero recipe

The first viewport stacks five layers before the product preview:

1. a pill-shaped local-first eyebrow;
2. “Welcome to Codex Cryptica”;
3. “Private RPG Lore Vault”;
4. “RPG Campaign Manager & Worldbuilding Tool”;
5. a broad feature-list paragraph.

![Desktop welcome](ux-assessment/screenshots/desktop-welcome.png)

This is grammatically correct but editorially timid. Each line restates the one above it. The primary actions sit below a large graph preview, so the page spends more above-the-fold space naming the product than helping the user choose what to do.

**Change:** reduce the hero to one opinionated headline, one proof sentence, and two actions. For example:

> **Keep your campaign connected—and on your device.**
>
> Write characters, places, secrets, and timelines in one local archive. No account required.

Primary action: **Explore a sample world**

Secondary action: **Start my own**

Keep the graph preview, but place it after the decision point on mobile and beside the copy on wide desktop screens.

### 2. The same typographic device is used everywhere

Uppercase labels with wide tracking appear in eyebrows, headings, buttons, tabs, metadata, status banners, footers, and navigation. Because the pattern is repeated regardless of importance, it stops feeling like a deliberate archival motif and starts feeling like a generated design token applied globally.

**Change:** reserve uppercase mono/letterspaced text for true metadata: dates, entity types, breadcrumb context, and small status labels. Use sentence case for buttons, section titles, navigation, and instructional text. A motif feels authored when it is selective.

### 3. Everything becomes a card

The feature page is the clearest example: every item receives the same rounded rectangle, icon tile, heading, and paragraph. A two-sentence touch hint receives the same weight as Oracle memory, family trees, VTT voice chat, import formats, and presentation templates.

![Desktop feature grid](ux-assessment/screenshots/desktop-features.png)

The page continues for dozens of cards. Some entries are implementation details rather than customer features, including “SEO Prerendering” and “P2P Connection Manager.” Several paragraphs are long enough to become miniature documentation pages inside cards.

This creates three AI-content signals:

- no visible editorial selection;
- no distinction between flagship capability, supporting feature, and technical note;
- no visual evidence that any feature exists in the real product.

**Change:** replace the flat feature wall with 4–6 user journeys:

1. **Capture the world** — entities, nested notes, templates, imports;
2. **See what connects** — graph, family tree, timeline, maps;
3. **Run the session** — VTT, dice, player view, voice;
4. **Expand with control** — generators, drafts, Oracle, review;
5. **Keep ownership** — local storage, folders, exports, publishing boundaries.

Each journey should use one real screenshot, a short outcome, and links to focused documentation. Put the exhaustive list behind searchable documentation or release notes.

### 4. The site looks like several adjacent templates

The global presentation changes between surfaces:

- welcome: neutral white, modern sans, full application header and persistent footer;
- features: centered SaaS hero and soft white card grid;
- tools directory: editorial serif and three-column cards;
- generator: full parchment workbench;
- blog: sparse archival list without the same global navigation;
- mobile generator logo: “Codex”; desktop generator logo: “CODEXCRYPTICA”; workspace: “Codex Cryptica.”

Theme variation is a product strength, but the global brand shell should not feel variable. Inconsistent naming, navigation, type hierarchy, and spacing make the site feel assembled from independently generated pages.

**Change:** define one cross-surface shell: consistent wordmark, navigation vocabulary, footer behavior, content width, heading rhythm, and action style. Let themes alter the work area, not the basic product identity.

### 5. Marketing content is optimized before it is edited

The tools directory presents **D&D NPC Generator**, **RPG NPC Generator**, and **Procedural NPC Generator** next to each other, with descriptions that imply substantial overlap. Even if the routes exist for valid technical or search reasons, the user sees duplication.

The blog compounds the effect. A seven-part responsible-AI series appears as many similarly formatted entries, several sharing the same publication date and closely related titles. Combined with phrases such as “ultimate guide,” “supercharged discovery,” “complete guide,” and “next generation,” the index resembles an SEO content program more than a person’s archive.

![Blog index](ux-assessment/screenshots/blog-index.png)

**Change:**

- expose one canonical NPC generator and treat genre/system variations as presets;
- group the responsible-AI series into one editorial collection card;
- add author/byline, a short creator note, and real screenshots or diagrams;
- feature fewer articles at once and provide topic filters/search for the archive;
- prefer concrete titles over superlatives.

### 6. AI imagery becomes the product’s first proof

The demo graph uses many rendered character/location images. They are attractive, but their compositions and rendering styles vary, making the graph read as a set of AI images before it reads as a knowledge tool. For a visitor already suspicious of AI-built products, this confirms the suspicion immediately.

**Change:** curate one fixed demo asset set with a single art direction. Consider a deliberately graphic style—ink portraits, cartographic stamps, woodcuts, or iconographic silhouettes—so the graph demonstrates relationships first. User-generated AI art can remain a feature without being the entire first impression.

## Must change: usability defects and trust risks

### M1. Fix desktop detail-panel overflow and clipping

At 1440px, opening an entity while Full Toolbox mode is active clips the title, action row, tab row, Generate Related action, and body text inside the right panel. Content extends beyond the viewport rather than reflowing inside the available panel width.

![Desktop graph with clipped detail panel](ux-assessment/screenshots/desktop-graph-detail.png)

This is not cosmetic. It makes actions unreadable and content inaccessible at a standard desktop width.

**Required outcome:**

- panel contents wrap or adapt at every supported width;
- tabs become scrollable or collapse into a “More” menu;
- the entity action row has an overflow strategy;
- body text never creates horizontal overflow;
- the main graph and panel negotiate width instead of independently assuming space.

### M2. Fix graph-label readability

The demo’s connection labels overlap node names, run underneath panels, rotate into each other, and become low-contrast against the parchment. The selected-node popover also obscures nearby labels. Because the graph is the hero feature, this defect damages the product claim more than a minor screen elsewhere would.

**Required outcome:**

- edge labels avoid node bounding boxes and selected popovers;
- labels use readable contrast and a compact background/halo;
- long labels truncate or reveal on hover/focus;
- default layout leaves more breathing room around high-degree nodes;
- fit-to-screen considers label bounds, not only node bounds.

### M3. Do not fit the entire mobile graph into an unreadable thumbnail

After dismissing mobile coaching, the graph defaults to a full-world fit. Nodes are tiny, labels are effectively unreadable, and the primary interaction becomes guessing where to tap.

![Mobile graph default view](ux-assessment/screenshots/mobile-graph.png)

**Required outcome:** open mobile graph at a useful reading zoom, centered on one important/recent node, with a visible “Show whole world” action. The first mobile viewport should support selection, not prove that every node technically fits.

### M4. Verify keyboard and assistive access to graph nodes

In the Playwright accessibility snapshot, toolbar controls were exposed, but individual graph nodes were not available as interactive element references. Selecting Eldrin required a coordinate click. The semantic Table view is an excellent fallback, but the graph does not clearly present it as such.

**Required outcome:** verify real keyboard and screen-reader navigation for nodes. If the canvas cannot expose a robust node interaction model, add an explicit, nearby **Browse graph as list/table** action and maintain focus synchronization between the list and canvas.

### M5. Remove marketing footer chrome from the working application

The persistent site footer consumes vertical workspace on the desktop graph while displaying Patreon, Blog, Privacy, and other marketing links. Those links are useful on public pages, but in the application they reduce the graph’s usable area and make the product feel like a website embedded around a tool.

**Required outcome:** move these links into Help, Settings, or the mobile/application menu. Let graph, map, canvas, table, and entity views use the full application viewport.

### M6. Clarify Quick Start’s “Theme” decision

The Quick Start dialog asks for a **Theme**, but its options mix visual skins and genre concepts: Ancient Parchment, Clean Modern, Workspace Light, Sci-Fi Terminal, Blood & Noir, LCARS Interface, and others. The placeholder premise mentions a corporation hijacking a net grid while Ancient Parchment is selected.

![Quick Start dialog](ux-assessment/screenshots/quick-start-dialog.png)

It is unclear whether this choice controls interface appearance, generated-world genre, or both. That ambiguity is especially risky because the next action generates a whole starter world.

**Required outcome:** separate **World genre** from **Workspace appearance**, or explicitly explain the combined effect with a small preview and example premise that updates with the selection.

### M7. Correct stale AI-provider language

The live Features page still describes direct Google Gemini access and chat data stored on Google’s servers, while the current product direction uses OpenAI/Luna. Provider and retention language is trust-critical, especially for a product leading with privacy.

**Required outcome:** audit all public feature, privacy, help, and generator copy against the current provider architecture before further visual polish.

## Should change: high-value improvements

### S1. Reduce Full Toolbox header density

At 1440px the header contains the logo, dice, search, Create, mode toggle, demo status, conversion, exit, vault selector, entity count, import/save/generate/share/public-world/settings controls, plus the activity rail. Most controls receive similar visual weight.

Group actions by intent:

- **Create** remains primary;
- vault identity and save state remain persistent;
- import/export/share move into a Vault menu;
- demo conversion stays in a focused demo banner;
- secondary tools remain in the activity rail or command palette.

### S2. Make generated output scannable by default

The public generator’s three-column desktop layout is distinctive, but long AI results become a wall of equally weighted sections. Preserve the detailed dossier while adding a default table-facing summary:

- identity and one-line concept;
- three memorable traits;
- immediate hook;
- secret;
- relationships;
- expandable “Full lore.”

This would make the output feel edited rather than merely emitted.

### S3. Simplify mobile entity actions

The mobile entity header shows many icon-only actions, including destructive delete, in one row. Accessible names are present, but the visual hierarchy is weak and accidental activation risk is higher.

Keep Back, Edit, and one context action visible. Move copy, sound bite, graph location, open-in-new-tab, and delete into a labeled overflow sheet. Keep delete separated and confirmed.

### S4. Improve mobile tab discoverability

The entity tab row clips “Timeline” at the right edge. If horizontal scrolling is intentional, add an edge fade or partial next tab with sufficient spacing; otherwise collapse lower-priority sections into More. The user should not have to infer that the tab bar scrolls.

### S5. Add human proof to the welcome experience

The welcome screen explains the product but does not show who made it, how it is used at a table, or what a real vault looks like after weeks of play.

Add one or two of the following:

- a short creator note signed by the maker;
- a real campaign screenshot with an annotated workflow;
- a user quote tied to a concrete use case;
- a “built in public” release cadence or changelog excerpt;
- a brief privacy architecture diagram.

Human evidence is a stronger antidote to “AI-made” perception than ornamental imperfection.

## A tighter design direction

### Keep

- parchment and genre themes;
- amber/brown brand color;
- graph shields and spatial metaphor;
- local-first/no-account positioning;
- compact table view;
- archival language used selectively;
- generator loading personality;
- semantic dialogs, tabs, and labeled controls.

### Reduce

- all-caps UI text;
- universal rounded cards and soft shadows;
- repeated explanatory subheadings;
- generic superlatives and “in seconds” claims;
- icon-only action rows;
- simultaneous header controls;
- AI art as the dominant demonstration asset;
- exhaustive feature lists on marketing pages.

### Add

- real product screenshots on feature pages;
- editorial grouping and navigation;
- one consistent global brand shell;
- creator voice and provenance;
- responsive overflow rules for panels and tabs;
- compact generated-output summaries;
- a legible mobile graph starting state;
- clear alternative navigation for non-canvas users.

## Implementation chunks

These are implementation-sized workstreams, not GitHub issues. Each chunk should
normally fit in one focused pull request, though the graph work may need a short
technical spike before its implementation pull request. Product changes include
tests for both the expected path and a meaningful failure, fallback, or narrow-
viewport path.

### Constitution alignment

The chunks preserve the constitution's local-first privacy, plain-language, TDD,
reuse-before-extraction, DI, documentation, and coverage requirements. Each code
chunk must run the repository lint and test suites in addition to the focused
validation named below.

One source-of-truth mismatch must be resolved before chunk 1 is complete: Principle
IV still names Gemini as the Oracle provider, while the deployed product direction
is OpenAI/Luna. Update that principle through the constitution workflow to describe
the intended provider or a provider-neutral Oracle contract, then synchronize public
copy against the amended wording. This is a planning prerequisite, not a GitHub issue.

### Sequence and dependencies

| Chunk | Workstream                          | Size | Depends on | Covers          |
| ----- | ----------------------------------- | ---- | ---------- | --------------- |
| 1     | Provider and privacy copy audit     | S    | —          | M7              |
| 2     | Responsive entity-detail contract   | M    | —          | M1              |
| 3     | Application shell reclamation       | M    | —          | M5              |
| 4     | Full Toolbox action hierarchy       | M    | 3          | S1              |
| 5     | Desktop graph-label legibility      | L    | —          | M2              |
| 6     | Useful mobile graph entry state     | M    | —          | M3              |
| 7     | Accessible graph navigation         | L    | —          | M4              |
| 8     | Quick Start decision model          | M    | —          | M6              |
| 9     | Shared brand and layout grammar     | L    | —          | AI sameness     |
| 10    | Decision-first welcome experience   | M    | 9          | AI sameness, S5 |
| 11    | Workflow-led Features page          | L    | 1, 9       | AI sameness     |
| 12    | Canonical public generator model    | L    | 9          | AI sameness     |
| 13    | Editorial blog structure            | M    | 9          | AI sameness     |
| 14    | Coherent demonstration assets       | M    | 9          | AI sameness     |
| 15    | Generator output information design | M    | —          | S2              |
| 16    | Mobile entity actions and tabs      | M    | 2          | S3–S4           |
| 17    | Cross-surface validation and tuning | M    | 2–16       | All             |

Chunks 1–3, 5–9, and 15 can begin independently. Chunk 4 follows the shell work;
chunks 10–14 share the design grammar from chunk 9. Chunk 17 is the release gate,
but its automated viewport checks should be added incrementally by each earlier
chunk rather than deferred to the end.

### Chunk 1 — Provider and privacy copy audit

**Outcome:** Public explanations match the current OpenAI/Luna-backed product and
do not make stale Gemini, retention, or provider claims.

**Scope:** Inventory provider and privacy language across the welcome, Features,
Privacy, Help, public generators, settings, and generator states. Establish one
canonical wording source where practical, then update every surfaced reference.
This is a copy and content-source change; it does not change the generation API.

**Acceptance criteria:** No user-facing page contradicts the deployed provider or
data flow; privacy claims distinguish browser-local vault data from generation
requests; the provider name does not appear where it is irrelevant to the user's
decision. A repository search and route-level content tests cover stale terms.

### Chunk 2 — Responsive entity-detail contract

**Outcome:** The entity detail panel remains usable without clipping or horizontal
page overflow at supported desktop widths.

**Scope:** Define panel min/max widths, title and metadata wrapping, action overflow,
tab overflow, and independent panel scrolling. Verify the Full Toolbox layout at
1280, 1440, and 1600px and with unusually long entity names and labels.

**Acceptance criteria:** All primary actions remain reachable; content and tabs do
not render outside the panel; the document itself does not gain horizontal scroll;
focus remains visible while keyboarding through the panel. Add responsive component
tests and viewport screenshots for ordinary and stress-test content.

### Chunk 3 — Application shell reclamation

**Outcome:** Workspace routes feel like focused tools, not marketing pages wrapped
around an application.

**Scope:** Remove the marketing footer from graph, map, canvas, table, editor, and
other workspace routes. Let each workspace occupy the available viewport. Keep the
footer on public marketing/content routes and relocate essential support, legal,
and privacy links to Help, Settings, or the application menu.

**Acceptance criteria:** No application canvas is shortened by marketing chrome;
all legally or operationally necessary links remain reachable; route transitions
do not briefly flash the wrong shell. Cover representative public and application
routes in layout tests.

### Chunk 4 — Full Toolbox action hierarchy

**Outcome:** The desktop header presents a small set of frequent actions and keeps
infrequent vault operations discoverable without showing all controls at once.

**Scope:** Rank current actions by frequency and consequence. Keep Create plus clear
vault/save state visible; group import, export, sharing, and infrequent management
actions under a labeled menu. Define collapse behavior at narrower widths and retain
tooltips, keyboard access, and destructive-action separation.

**Acceptance criteria:** Frequent creation and navigation require no extra step;
every displaced action remains findable by label; the header fits without collision
at supported widths; menu focus and Escape behavior are covered by interaction tests.

### Chunk 5 — Desktop graph-label legibility

**Outcome:** Relationship labels communicate the graph instead of obscuring it.

**Scope:** Prototype and select a collision strategy for dense edge labels. Options
may include layout-aware offsetting, truncation with reveal, selective labels by zoom
or importance, and stronger text backplates. Include label bounds in fit calculations
and prevent collision with open detail panels where feasible.

**Acceptance criteria:** Labels are readable at default zoom in the demo world;
crossing or nearby edges do not create stacked illegible text; a user can reveal any
suppressed full label; node and edge selection still works at every zoom. Validate
against small, medium, and deliberately dense graph fixtures before implementation
is accepted.

### Chunk 6 — Useful mobile graph entry state

**Outcome:** Opening a graph on a phone immediately shows something understandable.

**Scope:** Replace the initial “fit the entire world” behavior with a useful zoom
centered on an important, recent, or explicitly selected node. Add a clearly labeled
“Show whole world” action and a brief gesture hint. Preserve user-controlled zoom
during the session and avoid resetting it after unrelated state changes.

**Acceptance criteria:** The initial node and at least its immediate relationships
are legible at 390×844; the whole graph remains one action away; returning from an
entity preserves the user's prior camera where appropriate; empty and one-node
graphs have intentional states. Cover camera persistence and fallback selection in
tests.

### Chunk 7 — Accessible graph navigation

**Outcome:** The graph's information and navigation are available without precise
pointer or canvas interaction.

**Scope:** Audit the rendered graph with keyboard and screen-reader tooling. Either
make nodes operable through a synchronized accessible structure or present a clearly
labeled Browse as table/list path next to the graph controls. Synchronize selection
and focus where that improves orientation, and document the chosen accessibility
contract.

**Acceptance criteria:** A keyboard-only user can find and open every entity and can
understand the selected entity; the alternative is visible rather than buried in
Help; focus is not lost when switching views; automated accessibility checks and a
manual screen-reader pass cover the primary journey.

### Chunk 8 — Quick Start decision model

**Outcome:** “Theme” no longer ambiguously combines world genre and interface
appearance.

**Scope:** Decide whether genre and visual appearance are separate choices. If they
remain coupled, rename the choice and show exactly what it changes. Add short examples
or previews, preserve sensible defaults, and verify behavior when optional generation
is unavailable or declined.

**Acceptance criteria:** Test participants can predict what their selection changes;
the flow works without AI; back navigation retains choices; the resulting workspace
matches the preview or explanation. Update onboarding copy and tests together.

### Chunk 9 — Shared brand and layout grammar

**Outcome:** Public pages look like one authored product instead of a collection of
independently generated landing-page patterns.

**Scope:** Define and implement the shared public wordmark, navigation, footer,
content widths, primary/secondary action hierarchy, typography roles, and spacing.
Document when cards, uppercase labels, shadows, gradients, and genre ornament are
appropriate. Apply the grammar to reusable shell components first, without replacing
the workspace's user-selected themes.

**Acceptance criteria:** Welcome, Features, Tools, Blog, Privacy, and generator pages
share recognizable structure and controls; card and all-caps use is purposeful rather
than default; responsive shell behavior is consistent. Add visual fixtures for the
shared components before page-specific redesigns begin.

### Chunk 10 — Decision-first welcome experience

**Outcome:** A first-time visitor understands the product and chooses a next step
before encountering decorative complexity.

**Scope:** Reduce the opening to one concrete value proposition, one proof point,
and two differentiated actions: explore a sample or start a world. Reposition the
graph preview so it supports that decision, particularly on mobile. Add one compact
human-proof module such as a signed creator note, real campaign workflow, or specific
user story, while preserving existing analytics signals.

**Acceptance criteria:** Both actions appear before or immediately adjacent to the
primary demonstration on desktop and before a large graph on mobile; copy contains no
generic unsupported superlatives; all existing destination flows and action tracking
still work. Validate comprehension with the first suggested question below.

### Chunk 11 — Workflow-led Features page

**Outcome:** The page teaches a handful of real campaign workflows instead of
presenting an exhaustive feature-card wall.

**Scope:** Group capabilities into four to six jobs such as prepare, connect, run,
improvise, and keep data private. Lead each group with a real product screenshot and
a short outcome. Move exhaustive or technical details to searchable documentation,
Help, or the changelog, and remove implementation details such as SEO prerendering
from the product pitch.

**Acceptance criteria:** Every section maps to a user goal and a visible product
surface; the page has a meaningful content hierarchy when skimmed; provider/privacy
language uses chunk 1's canonical wording; mobile does not become another long stack
of identical cards.

### Chunk 12 — Canonical public generator model

**Outcome:** Public generator entries feel like intentional presets of one product,
not duplicated microsites competing with one another.

**Scope:** Define one canonical generator interaction and content structure. Treat
NPC, character, faction, location, and similar pages as clearly named presets or
aliases where their behavior is the same. Preserve valuable inbound routes with
canonical metadata or redirects, and explain genuine differences where consolidation
would be misleading.

**Acceptance criteria:** Equivalent tools share interaction, state handling, actions,
and analytics; users can understand why separate entries exist; existing public URLs
continue to resolve safely; Save to Codex, Copy, Open Codex, Surprise Me, started, and
completed signals remain correctly differentiated and tested.

### Chunk 13 — Editorial blog structure

**Outcome:** The blog reads as an authored publication with a point of view.

**Scope:** Group the responsible-AI series under a single landing or collection,
surface author and provenance, feature a smaller number of current articles, and add
topic navigation or filtering. Reduce repetitive same-date cards and distinguish
product updates, practical GM guidance, and policy/editorial writing.

**Acceptance criteria:** Readers can identify who wrote an article, when it changed,
and what series or topic it belongs to; the index no longer presents near-identical
articles as equal standalone promotions; feeds, metadata, and existing article URLs
remain valid.

### Chunk 14 — Coherent demonstration assets

**Outcome:** Product demonstrations resemble one lived-in campaign rather than a set
of unrelated generated samples.

**Scope:** Establish a small canonical demo world with a consistent art direction,
entity naming voice, maps, portraits, and meaningful graph relationships. Favor real
interface screenshots and annotated workflows over decorative character art. Record
asset provenance and usage rights.

**Acceptance criteria:** Welcome, Features, and onboarding reuse a coherent cast and
world; screenshots display believable data density and relationships; assets remain
legible in both light and dark contexts where used; every external or generated asset
has documented provenance.

### Chunk 15 — Generator output information design

**Outcome:** Dense generated output supports fast use at the table without discarding
the full result.

**Scope:** Make generated content open in a compact summary with expandable full lore
while preserving Save and Copy. Define which fields belong in the compact state per
generator family, provide a clear expansion control, and keep section-level actions
associated with the content they affect.

**Acceptance criteria:** A GM can identify the generated result's most actionable
fact without scrolling through every section; full generated content is still
available and copied/saved without data loss; expanding and collapsing does not
regenerate or mutate the draft; focus remains predictable. Include success plus
copy/save failure tests for compact and full states.

### Chunk 16 — Mobile entity actions and tabs

**Outcome:** Small-screen entity controls remain understandable and all sections are
discoverable without an icon-decoding exercise.

**Scope:** Keep Back, Edit, and the main contextual action visible on mobile entity
views. Move secondary actions into a labeled overflow sheet, separate destructive
actions, and add a tab-scroll cue or a More destination for clipped sections. Reuse
the responsive sizing contract established in chunk 2.

**Acceptance criteria:** Visible and overflow actions use clear labels; destructive
actions require confirmation and are visually separated; every tab is discoverable
at 390×844 without accidental page overflow; opening and closing the overflow or More
surface restores focus correctly. Cover the primary action, cancellation, and a long
tab-label fixture in interaction tests.

### Chunk 17 — Cross-surface validation and tuning

**Outcome:** The revised experience is demonstrably clearer, more cohesive, and more
usable rather than merely visually different.

**Scope:** Run automated and manual passes at 1280, 1440, and 1600px desktop widths,
390×844 mobile, and one tablet viewport. Cover keyboard operation, reduced motion,
light/dark or representative genre themes, long content, offline behavior, and empty
states. Conduct short moderated sessions with five to eight GMs using the questions
below, then make narrowly scoped tuning changes.

**Acceptance criteria:** Must-change findings M1–M7 are closed with evidence; no
critical regression exists in welcome → demo → entity → graph or generator → save →
Codex journeys; participants describe the product primarily as a private campaign
workspace; unresolved observations are recorded with severity and supporting evidence
instead of being silently folded into subjective polish.

## Suggested validation questions

For short moderated sessions, ask users to think aloud while completing these tasks:

1. “What do you think this product is, and what would you click first?”
2. “Open the sample world and tell me what is connected to Eldrin.”
3. “Find every character without using the graph.”
4. “Generate an NPC and identify the one fact you would use at tonight’s table.”
5. “Start your own world. What do you think Theme will change?”
6. “Which parts feel handcrafted, and which feel automated?”

Success is not “nobody mentions AI.” Codex Cryptica openly includes optional AI. Success is that users describe it first as **a distinctive, private campaign workspace**—not as a collection of generated pages and generated prose.

## Screenshot appendix

### Mobile welcome

![Mobile welcome](ux-assessment/screenshots/mobile-welcome.png)

The mobile welcome is cleaner than desktop, but the primary action still follows the full graph preview instead of preceding it.

### Desktop table

![Desktop entity table](ux-assessment/screenshots/desktop-table.png)

This is the strongest reference for future UI work: clear, compact, specific, and visually tied to the archive metaphor without overusing decoration.
