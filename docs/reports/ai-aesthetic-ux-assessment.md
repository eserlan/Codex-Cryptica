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

## Recommended implementation order

### Phase 1 — Must-fix product usability

1. Fix right-panel overflow at 1280–1600px.
2. Fix graph edge-label collision and contrast.
3. Change mobile graph initial zoom/centering.
4. Verify graph-node keyboard/screen-reader access and expose the table fallback.
5. Remove the marketing footer from application routes.
6. Clarify Quick Start genre vs appearance.
7. Correct provider/privacy copy.

### Phase 2 — Remove the AI-template impression

8. Rewrite the welcome hierarchy around one headline and two actions.
9. Replace the feature wall with 4–6 screenshot-led workflows.
10. Standardize the global shell and product naming.
11. Consolidate duplicate generator entries.
12. Group the responsible-AI article series and add author/provenance signals.
13. Establish rules for when cards, uppercase text, and shadows are appropriate.

### Phase 3 — Polish and validate

14. Curate a visually consistent demo world asset set.
15. Add compact/full modes to generator output.
16. Simplify mobile entity actions and tab overflow.
17. Test the revised welcome → demo → entity → graph journey with 5–8 GMs.

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
