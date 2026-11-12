# Usability and look-and-feel assessment — 12 November 2026

This looks at Codex Cryptica as something a person uses and looks at. It sits beside
[`ui-assessment-2026-11-11.md`](./ui-assessment-2026-11-11.md), which is an engineering-quality audit
(accessibility scores, token counts, load size). Findings from that file are referenced as F1–F30 and not
repeated in full.

## How it was assessed

- Live on `https://staging.codexcryptica.com`, in the demo vault (7 entities), in an isolated browser tab.
- Desktop at 1440 × 900 and a narrow window at 500 × 844.
- Three themes: Ancient Parchment (the default, dark), Workspace (light) and Sci-Fi Terminal (dark).
- Screens: welcome page, graph, entity side panel, full entity view, table, timeline, canvas, map (empty),
  Oracle sidebar, settings (Vault and Theme), search.
- Flow results (create, link, solo session, Generate Region) are carried over from the 11 November walk.
- Afterwards the findings were read against `docs/STYLE_GUIDE.md` and its new Usability and Clarity
  Principles. That adds findings G1–G4 and the action plan at the end.

### Limits

- **Look and feel is my judgement from screenshots.** It is one reviewer's reading, not user testing.
- The demo vault is tiny. Nothing here says how the screens feel with hundreds of entities.
- The narrow window was 500px wide, not a real phone, and the graph was not refitted after resizing.
- 15 of the 18 themes were not looked at.
- AI was unreachable from the test browser, so AI results and their loading states were not seen.
- The staging banner adds a row of chrome that production does not have.

## Scorecard

Each dimension is scored 0–4: 0 broken, 1 poor, 2 works with clear problems, 3 good, 4 excellent.

| Area          | Dimension                  | Score | In one line                                                                |
| ------------- | -------------------------- | ----- | -------------------------------------------------------------------------- |
| Usability     | Finding things             | 2     | Most tools are icons without text; some features need a hidden gesture     |
| Usability     | Effort for common tasks    | 2     | Search and linking are quick; creating and reading an entity take too much |
| Usability     | Feedback and recovery      | 1     | Several actions fail or change things without saying so                    |
| Usability     | Knowing where you are      | 2     | The active tool is marked, but page titles and breadcrumbs are uneven      |
| Usability     | Wording                    | 2     | Themed vocabulary replaces plain words for basic actions                   |
| Look and feel | Visual hierarchy           | 2     | Table and full entity view are clear; the side panel and header are not    |
| Look and feel | Typography                 | 2     | Three type families, monospace body text, very heavy use of small capitals |
| Look and feel | Spacing and density        | 2     | Chrome takes a lot of room; content is often pushed below the fold         |
| Look and feel | Colour and theme character | 3     | Themes are distinctive and deliberate; the light theme is the weakest      |
| Look and feel | Polish                     | 2     | Overlaps, clipped labels and duplicated blocks are easy to find            |
| Look and feel | Cohesion                   | 2     | Screens look like they come from two or three different designs            |

**Usability ≈ 1.8, look and feel ≈ 2.2, overall ≈ 2.0 out of 4.**

The short version: the app has a strong visual identity and a few very good screens, but the identity is
applied unevenly, and the interface asks the user to remember a lot of unlabelled icons and special words.

## What is good

- **The graph is the best thing in the app.** Portrait nodes, coloured rings by type and readable
  relationship labels make the demo world understandable at a glance.
- **The table is clear and calm.** Type chips, a colour stripe per row, readable summaries and label chips.
  It is the easiest screen to read.
- **The full entity view has real hierarchy.** Type, large title, tabs, image on the left, text on the right.
- **Themes change the mood, not just the colours.** Sci-Fi Terminal and Ancient Parchment feel like
  different products in a good way.
- **Empty states for Map and Timeline are tidy**, with one icon, one heading and one sentence.
- **Search is fast and keyboard-first**, with the key hints shown.
- **The narrow layout has a bottom bar and a first-run tip** that explains it.

## Usability findings

### U1 — Most navigation and tools are icons with no text (High)

**Seen:** Full Toolbox has a left rail of at least 13 icons with no labels. The graph has a bottom bar of
12 icon buttons. The entity side panel has 7 icons in a row, and the full entity view has 8. Two of the
eight in the full entity view are the same "open in new" icon for different actions. The Map tool uses a
compass icon, while the map icon on the graph bar means "minimap".

**Why it matters:** a new user has to hover over each icon to learn the app, and on touch there is no hover.

**Fix:**

- Give the rail an expanded state with text labels, on by default until the user collapses it.
- In the entity views, keep two or three actions visible with text ("Edit", "Find in graph") and move the
  rest into a "More" menu with text labels.
- Use one icon per meaning across the app.

### U2 — Guided mode shows only the graph (Medium)

**Seen:** in Guided mode there is no rail, so Map, Canvas, Timeline, Table and the Oracle are not visible.
The only way to them is the Guided/Full Toolbox switch, which does not say that it reveals more tools.

**Fix:** keep a short labelled rail in Guided mode (Graph, Table, Map, Timeline), or rename the switch so it
is clear that Full Toolbox adds tools.

### U3 — The last rail item is cut off, and the header runs off-screen (High)

**Seen:** at 1440 × 900 the bottom rail icon is half hidden behind the footer. In Full Toolbox with the demo
controls showing, the header runs past the right edge and Settings is not reachable (F12). The search box
shrinks to an icon-sized box showing "Sea".

**Fix:** let the rail scroll or drop the footer inside the app. Give the header a priority order so search
and Settings always fit, and move the demo controls to their own row as the narrow layout already does.

### U4 — Reading an entity takes a scroll (High)

**Seen:** in the side panel at 900px height, the first screen shows the title, seven icons, a label box, a
notice, two image buttons, the image, a tab row and two Generate buttons. The entity's text starts about
380px further down. In the narrow window the text is further still (F15).

**Fix:** put the text directly under the title. Shrink the image to a thumbnail beside the title, and move
image and Generate actions below the text or into a menu.

### U5 — Things change or fail without saying so (High)

**Seen:**

- Create with AI Disabled on runs for about 14 seconds, then closes with nothing made (F1).
- Create runs for over 90 seconds when AI cannot be reached (F2).
- Create does nothing when no vault is open (F4).
- Grid settings "Close" throws changes away (F6).
- Selecting an entity turned graph labels and images off, and they stayed off after the panel was closed,
  until I pressed the two toggles. I saw this once and did not find the cause.

**Fix:** every action should end in a visible result or a message. For Create, offer a blank entity when AI
is off or unreachable. For the graph, restore labels and images when the selection is cleared.

### U6 — Themed vocabulary replaces plain words for basic actions (Medium)

**Seen:** the theme sets the words, in `packages/schema/src/theme-templates.ts`. In Ancient Parchment,
Delete is "Burn", connections are "Bonds", the vault is an "Archive" and entities are "Chronicles". In
Sci-Fi Terminal, Delete is "Purge" and entities are "Data nodes". In Workspace they are "Vault" and "Notes".
The themed words are also applied unevenly: the side panel says "Bonds" and "Burn" while the full view of
the same entity says "Connections" and shows a bin icon (F22). "ARCHIVE DETAIL MODE" is fixed text in
`GraphHUD.svelte` and stays the same in every theme.

**Why it matters:** flavour words are fine for headings. For actions that destroy or save data, the user
should not have to work out what "Burn" or "Inscribe" does, and help text cannot match 18 vocabularies.

**Fix:** keep themed words for decorative headings only. Use plain words for actions (Delete, Save, Search)
and for the core nouns in navigation and help. Apply whatever remains through one helper in both entity views.

### U7 — Internal wording and raw markup reach the user (Medium)

**Seen:** "System Proxy", "Connected to Local Archive (OPFS)", "Transient mode: changes will not be saved",
"ellipse nodes // solid edges" on theme cards, "Shift the visual dimension of your workspace",
"Transmuting exploration into reality", `**Demo Mode**` with the asterisks showing, and `[[The Missing
Heirloom]]` with the brackets showing in entity text and table summaries (F26).

**Fix:** say what the thing does for the user: "Using the free shared AI", "Saved in this browser", "Demo:
changes are not saved". Render or strip the markup.

### U8 — Page titles and breadcrumbs do not help you place yourself (Low)

**Seen:** Table has a title and a one-line description. Timeline is titled "World Chronology" and opens on
Calendar. Canvas shows "Primary Workspace". Map has no title. The graph breadcrumb read "Ancient Forest
Dragon / Eldrin the Wise", which looks like a parent and child but the two are only linked.

**Fix:** give each tool the same title pattern, matching its rail name. Make the graph breadcrumb show
"Graph / entity name".

### U9 — Empty canvas gives no starting point (Low)

**Seen:** the canvas opens blank with seven unlabelled tool icons and a round plus button. Map and Timeline
have an explanatory empty state; Canvas has none (see also F8, F10).

**Fix:** add the same style of empty state with one main action, such as "Add an entity to the canvas".

### U10 — The welcome page hides its main buttons below the fold (Medium)

**Seen:** at 1440 × 900 the first screen shows the heading and the graph preview. "Quick Start World",
"Explore Demo Vault" and "Open Existing Vault" are about 1,000px down. The graph preview is itself a button
that starts Quick Start, which a visitor may not expect from clicking a picture.

**Fix:** put the three buttons directly under the subtitle and the preview below them.

## Look-and-feel findings

### L1 — Three type families with no clear rule (High)

**Seen:** in Ancient Parchment the header uses a sans face, graph labels use a serif, and the entity side
panel uses a monospace face for its title, body text and connections. The full view of the same entity uses
sans for all of these. Page titles differ too: bold sans (Table), monospace (Timeline), wide-spaced small
capitals (Canvas).

**Why it matters:** this is the largest reason the app feels like several designs. Monospace body text in a
fantasy theme reads as a terminal, and it is slower to read in a narrow column.

**Fix:** set one rule per theme: one face for interface text, one for display (titles, graph labels), and
monospace only for code-like values such as zoom level or dice. Apply it to the side panel first.

### L2 — Small capitals and tiny text everywhere (High)

**Seen:** on the graph with an entity open, 39 of 72 text elements were in capitals, and 27 of 72 were 10px
or smaller. Nine font sizes were in use on that one screen. Across the app's components there are about
1,500 uses of `uppercase` and about 1,300 uses of widened letter-spacing.

**Why it matters:** when buttons, tabs, labels, notices and headings are all small spaced capitals, nothing
stands out, and long labels such as "TRANSIENT MODE: CHANGES WILL NOT BE SAVED" are hard to read.

**Fix:** keep capitals for short section labels. Use sentence case for buttons, tabs and notices. Settle on
about five sizes with 12px as the smallest for anything a user must read.

### L3 — The header has too many things at the same weight (Medium)

**Seen:** in the demo the header holds a gold Create button, a gold Guided/Full Toolbox switch, a gold
"Make this mine" button, a "Demo mode" badge, "Exit demo", the vault name and an entity count. Three gold
elements sit side by side, so there is no single main action.

**Fix:** make one element primary (Create). Show the demo state as a slim bar under the header with its two
actions, as the narrow layout does.

### L4 — Chrome takes too much of the screen (Medium)

**Seen:** on desktop, banner, header and footer use about 160px of 900. In the narrow window, banner, header
and demo bar use about 170px before content starts, and the entity sheet then adds its own toolbar, title,
"Set parent", label box and notice. The footer with legal links stays visible inside the working app.

**Fix:** drop the footer inside the app and put its links in Settings or Help. Collapse the header on scroll
in the narrow layout.

### L5 — Floating controls sit on top of content (Medium)

**Seen:** in all three themes the graph's bottom toolbar covered the lowest node's label ("The Gilded
Hand"), and the Labels filter covered the top-left node. On the map, the "Go to hex" bar covers the toolbar
and the hex panel covers part of the solo bar (F13).

**Fix:** have "fit to screen" leave room for the toolbars, and give map panels fixed slots that cannot overlap.

### L6 — Duplicated and leftover blocks (Medium)

**Seen:**

- Settings → Vault shows the "Active Archive" block twice, once in sans and once in monospace.
- The full entity view shows the same text under both "Tome" and "Ancient Inscription". These are two
  separate fields (the main text and the lore), and the demo entity holds the same text in both, so this is
  a demo-data problem, not a layout bug.
- A character's side panel offers "Generate a business here". The button is meant for places, people and
  organisations, so showing it is by design; the word "here" does not fit a person.
- Search highlights the match with a gap inside the word: "Eld rin the Wise".

**Fix:** remove the second "Active Archive" block. Give the demo entities different lore text, or none.
Label the button "Generate a business" for characters and factions. Remove the padding on the search
highlight.

### L7 — The light theme is weaker than the dark ones (Medium)

**Seen in Workspace:** graph lines and relationship labels are very pale grey on near-white. The "System
Proxy" badge is mint text on a mint background. The staging banner text is nearly invisible. The Oracle's
greeting still says "The archives are open" and "Greetings, Seeker" in a theme described as neutral.

**Fix:** darken edge and edge-label colours for light themes. Check each status badge on a light surface.
Use neutral Oracle copy in neutral themes.

### L8 — The line between neutral chrome and themed world is uneven (Low)

**Seen in Sci-Fi Terminal:** the header, rail and footer stayed neutral grey next to a black and green
workspace. That is by design: `docs/STYLE_GUIDE.md` keeps app chrome neutral and scopes the theme to world
surfaces. The uneven parts are these. The Create button and mode switch in the header did take the theme
colour (green), while the demo buttons beside them stayed gold. The themed graph label face is hard to read
at small sizes, and one label was cut off at the screen edge ("he Missing"). The paper texture appears on
Table, Timeline and Canvas in Ancient Parchment but not on Graph or Map.

**Fix:** make header controls follow one rule, all neutral as the style guide says. Test each display face
at the graph's smallest label size and fall back to the body face below it. Decide whether texture belongs
to all work surfaces or none.

### L9 — Two zoom controls, two toolbar styles (Low)

**Seen:** the graph has a horizontal bar with square outlined buttons; the canvas has a small vertical stack
in the corner plus a round floating plus button; the map has its own bar. Button shapes vary between
square, slightly rounded and pill within one screen.

**Fix:** one shared toolbar and zoom control for Graph, Canvas and Map, and one corner radius per theme. This
is the visible side of F23 (no shared button component).

### L10 — Settings feels heavier than it needs to (Low)

**Seen:** theme cards are large with empty space and a technical footer line. "Skip welcome screen" and
"Auto fullscreen" sit under Theme. Section headings such as "Interface configuration" add words without
adding meaning.

**Fix:** show themes as a compact grid of swatches with name and one short line. Move start-up options to
their own section.

## Checked against the design principles

After the findings above were written, `docs/STYLE_GUIDE.md` gained a
[Usability and Clarity Principles](./STYLE_GUIDE.md#usability-and-clarity-principles) section (nine
principles). Reading the app and the older guidance against it gave four more findings.

### G1 — The style guide already asked for some of this, and the app had drifted (Medium)

**Seen:** before this update the guide already said that app chrome stays neutral, that the theme is scoped
to world surfaces, and that the interface uses a readable sans face for controls. The entity side panel
sets a monospace face on its root (`EntityDetailPanel.svelte`), and header controls mix theme colour, gold
and neutral (L8). The constitution's Natural Language rule (IX) already ruled out wording such as
"Transmuting exploration into reality" (U7).

**What it means:** the rules were not the problem. Nothing checked screens against them.

### G2 — The old guidance itself prescribed the small-capitals look (High)

**Seen:** `docs/design/components/button.md` told every button to use `text-xs font-bold uppercase
tracking-widest`. The style guide's tab bar and empty-state examples used 10px spaced capitals, and the
empty state was "brief, muted, and uppercase" at half opacity. The app followed this faithfully: about
1,500 uses of `uppercase` and 1,300 of widened letter-spacing in components.

**What it means:** L2 is the result of following the guide, so it needs a planned migration, not a clean-up.
The guide, the button pattern and the examples are now changed to sentence case.

### G3 — Every theme overrides the words for basic actions (Medium)

**Seen:** `packages/schema/src/theme-templates.ts` sets `save`, `delete`, `new`, `search`, `syncing`,
`vault` and `entity_plural` in 15 theme blocks. The theme guide used to say "override only what fits the
theme" with no line between headings and actions. Only 14 components read themed words, which is why the
two entity views disagree (U6).

**What it means:** principle 1 now draws the line, and the theme guide and checklist say to leave action
and core-noun keys at their defaults. The existing overrides are still in the code.

### G4 — There is no shared button, toolbar or empty-state use to hang the rules on (Medium)

**Seen:** there are 1,857 raw `<button>` elements and no shared button component (F23). A shared
`ui/EmptyState.svelte` exists, but Canvas does not use an empty state at all (U9). Graph, Canvas and Map
each have their own toolbar (L9).

**What it means:** each rule has to be applied by hand in hundreds of places. Shared components are the
only way the principles stay true after the first pass.

## Action plan

The aim is to move usability from about 1.8 to 3 or better, and look and feel from about 2.2 to 3 or
better, without changing the graph, the themes or the genre voice. The targets are goals to score against,
not predictions.

Each task names the principle it serves (P1–P9, numbered as in the style guide) and the findings it
closes. Paths are under `apps/web/src/lib/components/` unless they start with `packages/` or `docs/`.
Sizes are rough: S is under a day, M is one to three days, L is about a week.

### Phase 1 — Stop the silent failures

These are correctness problems. Do them first; nothing else matters if Create does nothing.

| Task | What to do                                                                                                  | Where                                             | Done when                                                                                                   | Closes              | Size |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------- | ---- |
| A1   | Offer "Blank entity" in Create, beside the AI options.                                                      | `guided/IntentCreateModal.svelte`                 | A user can create and name an entity with AI Disabled on, in three steps or fewer.                          | F1, F3, U5 · P3, P5 | M    |
| A2   | When AI is disabled or unreachable, show a message with the manual path. Never close without a result.      | `generators/CampaignGeneratorModal.svelte`        | With AI Disabled on, the dialog explains and offers "Create blank" within one second.                       | F1, U5 · P5         | S    |
| A3   | Give AI generation a time limit, a Cancel button and a clear failure message.                               | `generators/CampaignGeneratorModal.svelte`        | With the network blocked, the dialog shows an error and a retry within 30 seconds.                          | F2, U5 · P5         | S    |
| A4   | When no vault is open, Create explains why and offers to open or start one.                                 | `guided/IntentCreateModal.svelte`                 | Pressing Create with no vault always shows something.                                                       | F4, U5 · P5         | S    |
| A5   | Grid settings: rename "Apply to All" to "Save", and make "Close" warn when there are unsaved changes.       | `map/VTTGridSettings.svelte`                      | Changing the grid and pressing Close cannot lose the change silently.                                       | F6, U5 · P5         | S    |
| A6   | Find why selecting an entity turns graph labels and images off, and restore them when the selection clears. | `graph/` (view controller, `GraphToolbar.svelte`) | Select then close an entity: labels and images are as they were. First confirm the behaviour is repeatable. | U5 · P5             | S–M  |

### Phase 2 — Rebuild the entity panel as the proof

This is the most-used screen and it exercises nearly every principle. If it works in a fantasy theme, a
sci-fi theme and Workspace, the same rules roll out to the rest of the app.

The detailed plan for this phase is in
[plans/entity-views-clarity.mini-spec.md](./plans/entity-views-clarity.mini-spec.md).
It is tracked in [#4738](https://github.com/eserlan/Codex-Cryptica/issues/4738), with one issue per slice:

- B1: [#4741](https://github.com/eserlan/Codex-Cryptica/issues/4741)
- B2: [#4739](https://github.com/eserlan/Codex-Cryptica/issues/4739)
- B3: [#4740](https://github.com/eserlan/Codex-Cryptica/issues/4740)
- B4: [#4739](https://github.com/eserlan/Codex-Cryptica/issues/4739), [#4742](https://github.com/eserlan/Codex-Cryptica/issues/4742)
- B5: [#4739](https://github.com/eserlan/Codex-Cryptica/issues/4739), [#4743](https://github.com/eserlan/Codex-Cryptica/issues/4743)
- B6: [#4743](https://github.com/eserlan/Codex-Cryptica/issues/4743)

B6 covers the two entity views only in that plan; the table part of B6 has no issue yet.

| Task | What to do                                                                                                                                      | Where                                                                                            | Done when                                                                                         | Closes           | Size |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------- | ---- |
| B1   | Reorder the side panel: title, small portrait, then the text. Move image tools and Generate buttons below the text.                             | `EntityDetailPanel.svelte`, `entity-detail/DetailHeader.svelte`, `DetailImage.svelte`            | At 1440 × 900 and at phone width, the first paragraph of the entity is visible without scrolling. | U4, F15 · P2     | M    |
| B2   | Remove the monospace face from the panel. Title in the header face, everything else in the body face.                                           | `EntityDetailPanel.svelte` and the `entity-detail/` tabs that set `font-mono`                    | No monospace in the panel except code-like values.                                                | L1, G1 · P6      | S    |
| B3   | Cut the header actions to three with text (Edit, Find in graph, Open full view) plus a labelled "More" menu. Use the same set in the full view. | `entity-detail/DetailHeader.svelte`, `modals/ZenModeModal.svelte`                                | Both views show the same actions in the same order, and no two actions share an icon.             | U1, F22 · P3, P4 | M    |
| B4   | Use plain words for actions in both views: Delete, Edit, Connections. Keep themed section headings.                                             | `entity-detail/DetailFooter.svelte`, `DetailConnectionsTab.svelte`, `modals/ZenModeModal.svelte` | The side panel and full view of one entity use identical words in three themes.                   | U6, F22 · P1     | S    |
| B5   | Label the button "Generate a business" for characters and factions, and give demo entities lore text that differs from their main text.         | `entity-detail/GenerateBusinessButton.svelte`, `modals/ZenModeModal.svelte`                      | A character shows "Generate a business", and no demo entity repeats its text.                     | L6               | S    |
| B6   | Render `[[links]]` as links wherever entity text is shown read-only, including table summaries.                                                 | Entity text renderers, `table/`                                                                  | No square brackets appear in read-only text.                                                      | U7, F26 · P1     | S–M  |

### Phase 3 — Navigation and the header

| Task | What to do                                                                                                                                       | Where                                                       | Done when                                                                        | Closes           | Size |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------- | ---- |
| C1   | Give the rail an expanded state with text labels, on by default, with a collapse control that is remembered.                                     | `layout/ActivityBar.svelte`                                 | A new user sees a name beside every tool.                                        | U1 · P4          | M    |
| C2   | Make Guided mode the same rail with fewer items (Graph, Table, Map, Timeline).                                                                   | `layout/ActivityBar.svelte`, Guided mode switch             | Switching mode adds or removes items and does not move the layout.               | U2 · P4          | M    |
| C3   | Set a header priority: search, Create and Settings always fit. Move demo, guest and staging state to a slim bar under the header on desktop too. | `layout/AppHeader.svelte`, `layout/MobileDemoBanner.svelte` | At 1280px wide in demo mode nothing is cut off and Settings is clickable.        | U3, L3, F12 · P7 | M    |
| C4   | Keep one primary-styled control in the header (Create). Make the others neutral, as the style guide says for chrome.                             | `layout/AppHeader.svelte`, `VaultControls.svelte`           | In every theme the header has one filled button.                                 | L3, L8, G1 · P2  | S    |
| C5   | Remove the footer inside the app. Put its links in Settings → About and Help.                                                                    | `layout/AppFooter.svelte`                                   | Work surfaces run to the bottom edge, and the rail's last item is fully visible. | U3, L4 · P7      | S    |
| C6   | Use the same page-title pattern on every tool, matching its rail name. Fix the graph breadcrumb to "Graph / entity".                             | Tool page headers, `graph/GraphHUD.svelte`                  | Table, Timeline, Canvas and Map each show their rail name as the title.          | U8               | S    |
| C7   | Put the three start buttons directly under the subtitle on the welcome page.                                                                     | Welcome page component                                      | At 1440 × 900 all three are visible without scrolling.                           | U10 · P2         | S    |

### Phase 4 — Words and type across the app

| Task | What to do                                                                                                                                                                                             | Where                                                                                        | Done when                                                               | Closes           | Size |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------- | ---- |
| D1   | Remove the action and core-noun overrides (`save`, `delete`, `new`, `search`, `syncing`, `vault`, `entity`, `entity_plural`) from all themes. Add a schema test that fails if a theme sets them.       | `packages/schema/src/theme-templates.ts` and its tests                                       | Delete reads "Delete" in every theme, and the test guards it.           | U6, G3 · P1      | S    |
| D2   | Replace internal wording: "System Proxy", "OPFS", "Transient mode", "Archive detail mode", "ellipse nodes // solid edges", "Transmuting exploration into reality", and the unrendered `**Demo Mode**`. | `oracle/`, `settings/VaultSettings.svelte`, `settings/` theme cards, `graph/GraphHUD.svelte` | A search for each phrase in `apps/web/src` finds nothing user-facing.   | U7, F26 · P1     | S    |
| D3   | Add a shared `Button` component with primary, secondary, danger and icon variants in sentence case, as in `docs/design/components/button.md`.                                                          | `ui/Button.svelte` (new)                                                                     | The component exists with tests, and phases 2 and 3 use it.             | G4, F23, L9 · P6 | M    |
| D4   | Migrate buttons, tabs, notices and empty states to sentence case, one area at a time: entity views, header and rail, settings, map, then the rest.                                                     | App-wide                                                                                     | In each migrated area, capitals appear only on short eyebrow labels.    | L2, G2 · P6      | L    |
| D5   | Raise anything a user must read to 12px or more, and hold each screen to about five sizes.                                                                                                             | App-wide, using the `text-helper` and larger tokens                                          | On the graph with an entity open, no readable text is under 12px.       | L2, F18 · P6     | M    |
| D6   | Restrict monospace to code-like values. Bring Timeline and Canvas titles into the header face.                                                                                                         | `timeline/`, `canvas/`, others found by searching `font-mono`                                | `font-mono` remains only on dice, coordinates, zoom, ids and key hints. | L1 · P6          | M    |

### Phase 5 — Polish and shared parts

| Task | What to do                                                                                                                                             | Where                                                                  | Done when                                                                         | Closes            | Size |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------- | ---- |
| E1   | Make "fit to screen" leave room for the toolbars and filters.                                                                                          | `graph/` view controller                                               | With seven nodes fitted, no label sits under a control, in three themes.          | L5 · P7           | S    |
| E2   | Give map panels fixed slots so the hex panel, "Go to hex" bar and solo bar cannot overlap.                                                             | `map/`, `map/hex-crawl/`, `solo/`                                      | All three open together with no overlap at 1440 × 900.                            | L5, F13, F14 · P7 | M    |
| E3   | One shared toolbar and zoom control for Graph, Canvas and Map.                                                                                         | `graph/GraphToolbar.svelte`, `canvas/`, `map/MapVTTControlsHUD.svelte` | The three surfaces use the same component and the same zoom placement.            | L9, G4 · P3       | L    |
| E4   | Remove the second "Active Archive" block in Settings → Vault.                                                                                          | `settings/SettingsModal.svelte`, `settings/VaultSettings.svelte`       | The block appears once.                                                           | L6                | S    |
| E5   | Remove the gap inside highlighted search matches.                                                                                                      | `search/SearchModal.svelte`                                            | "Eldrin" reads as one word with the match highlighted.                            | L6                | S    |
| E6   | Light themes: darken graph edges and edge labels, fix the status badge contrast, and use neutral Oracle copy in Workspace.                             | `packages/schema/src/theme-templates.ts`, `oracle/`                    | In Workspace, edge labels meet 4.5:1 and the greeting has no genre voice.         | L7, F20 · P9      | M    |
| E7   | Check each theme's display face at the graph's smallest label size, and fall back to the body face below it. Stop labels being cut at the screen edge. | Graph label styling                                                    | No clipped or unreadable node label in any of the 18 themes at default zoom.      | L8 · P6           | M    |
| E8   | Add an empty state with one action to Canvas, and a next step to a new blank map.                                                                      | `canvas/`, `map/`, using `ui/EmptyState.svelte`                        | Every tool's empty surface says what it is for and offers one action.             | U9, F8, F10 · P8  | S    |
| E9   | Put Generate Region, hex mode and grid settings behind visible, labelled controls. Keep right-click as a shortcut.                                     | `map/MapVTTControlsHUD.svelte`, `map/MapUploadOverlay.svelte`          | A new user reaches Generate Region without a right-click, in four steps or fewer. | F5, F7 · P8       | M    |
| E10  | Show themes as a compact grid, and move start-up options out of Theme.                                                                                 | `settings/`                                                            | All 18 themes fit in two screens of the settings dialog.                          | L10               | S    |

### Keeping it true

| Task | What to do                                                                                                                                                                              | Done when                                                                                 | Size   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| K1   | Add the five-point "Checking a change" list from the style guide to the UI and UX review lenses (`.claude/agents/reviewer-ui.md`, `reviewer-ux.md`) and to the `codex-review` patterns. | A pull request that adds an unlabelled icon or an uppercase button gets a review finding. | S      |
| K2   | Add lint or test guards where a rule can be checked by machine: no jargon for action keys (D1), no new `text-[Npx]` under 12px (already guarded), no new `uppercase` on `<button>`.     | The guards run in `lint:changed` or the schema tests.                                     | M      |
| K3   | Re-score this scorecard after phases 2, 3 and 5, in the same three themes and sizes.                                                                                                    | Three dated score rows are added to this file.                                            | S each |
| K4   | Run a short test with three to five people who run games: create an entity, link two, open a map, find Settings.                                                                        | Notes are written up, and any principle the test contradicts is revisited.                | M      |

### Order and expected effect

1. **Phase 1** lifts "Feedback and recovery" from 1. It is small and should not wait.
2. **Phase 2** is where the look changes most for the least work. Do B1 to B4 together.
3. **Phase 3** fixes "Finding things" and "Knowing where you are".
4. **Phase 4** is the largest. D1 to D3 are quick; D4 runs area by area behind the other phases.
5. **Phase 5** can be picked off in any order.

Dependencies: D3 (shared button) before D4 and before E3. B2 and B4 before D4, so the rule is proved on
one screen first. D1 before K2.

### Open decisions

- **Sentence case and plain action words** reverse two earlier choices (G2, G3). The style guide now says
  so, but the code has not moved. If either choice is to stay, D1 and D4 change or drop out.
- **Texture on work surfaces** (L8): all of them or none.
- **Guided mode's rail** (C2): which four or five tools it shows.

## Not covered

- Motion and transitions: screenshots do not show them.
- How screens look with real data volumes.
- Play, Rolls & Decks, Generators, Shelf and Notes screens.
- The other 15 themes.
- Real users. A short test with three to five people would confirm or overturn the judgement calls here,
  especially U6 on themed wording.
