# Entity Side Panel and Zen Mode Clarity Mini-Spec

Source: [usability-look-feel-assessment-2026-11-12.md](../usability-look-feel-assessment-2026-11-12.md)
(Phase 2, tasks B1–B6) and the
[Usability and Clarity Principles](../STYLE_GUIDE.md#usability-and-clarity-principles) (P1–P9).

Tracking issue: [#4738](https://github.com/eserlan/Codex-Cryptica/issues/4738).

## 1. Specification (What & Why)

### Problem Statement

Opening an entity is the most common thing a user does, and the two views of an entity look and read like
different products. The side panel is set in monospace, shows seven unlabelled icons, and pushes the
entity's text about 380px below the fold. Zen mode has a clearer layout but uses different tabs, different
words and its own copy of the same ten actions.

The goal is one entity view at two sizes: the text first, one type rule, three labelled actions plus a
menu, and the same sections and words in both. The themed headings, texture and portrait stay.

### What the code looks like today

| Concern     | Side panel                                                                    | Zen mode                                                   |
| ----------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Shell       | `EntityDetailPanel.svelte` (605 lines), `font-mono` on the root `<aside>`     | `zen/ZenView.svelte` (708 lines)                           |
| Header      | `entity-detail/DetailHeader.svelte` (584 lines), about 7 icon buttons         | `zen/ZenHeader.svelte` (585 lines), about 10 icon buttons  |
| Tabs        | status, connections, lore, map, chats, family, stats, timeline                | overview, connections, map, chats, family, stats, timeline |
| Tab labels  | `jargon.tab_status` ("Attributes"), `jargon.tab_lore` ("Mythos"), upper-cased | Plain words                                                |
| Main text   | In the status tab, below image, tabs and Generate buttons                     | Top of the overview, under `jargon.chronicle_header`       |
| Lore        | Its own tab                                                                   | Second section of the overview, under `jargon.lore_header` |
| Connections | In the status tab under `jargon.connections_header` ("Bonds"), and in a tab   | In the sidebar as "Connections", and in a tab              |
| Image       | `DetailImage.svelte`, 16:10 block up to 320px high, above the tabs            | In `ZenSidebar.svelte`                                     |
| Delete      | `DetailFooter.svelte`, text from `jargon.delete` ("Burn", "Purge")            | Bin icon in the header                                     |
| Demo notice | "TRANSIENT MODE: CHANGES WILL NOT BE SAVED"                                   | None                                                       |

Both headers are over the 500-line review trigger (Constitution XIV) and hold near-identical action code:
canvas or delve, Shelf, MonsterLabs, Find in graph, copy link, sound bite, chat, Zen or new tab, delete.

### Scope & Boundaries

- **In Scope**:
  - Layout, order, typography and wording of the side panel and Zen mode, at desktop and phone width.
  - One shared description of entity actions, used by both headers.
  - Bringing the panel's tabs in line with Zen mode's.
  - The demo and draft notices inside these two views.
  - Rendering `[[links]]` as links in read-only entity text in these two views.
- **Out of Scope**:
  - Tab contents: chats, family, stats, map, timeline and sound-bite internals stay as they are.
  - Removing action-word overrides from `theme-templates.ts` for the whole app (assessment task D1). These
    two views stop reading those keys; the theme data is left alone.
  - A shared app-wide `Button` component (D3) and the app-wide sentence-case migration (D4).
  - `EmbeddedEntityView`, popout windows and the guest view, beyond keeping them working.
  - New features. Nothing is added except the "More" menu that holds existing actions.
  - `[[link]]` rendering in the table (covered by assessment task B6, done separately).

### Acceptance Criteria

Checked in Ancient Parchment, Sci-Fi Terminal and Workspace, at 1440 × 900 and at 390 × 844.

- [ ] **Text first.** With an entity that has an image and text, the first line of its text is visible
      without scrolling, in the side panel and in Zen mode, at both sizes.
- [ ] **Same actions.** Both views show the same three actions with text (Edit, Find in graph when a graph
      is present, and Expand or Collapse), then a "More" menu. The menu items have text labels and appear in
      the same order in both views.
- [ ] **No shared icons.** No two actions in either view use the same icon.
- [ ] **Same tabs.** Both views show Overview, Connections, Map, Chats, Family, Stats, Timeline, with the
      same visibility rules as today (Chats and Family for characters only).
- [ ] **Same plain words.** Tabs, buttons and notices read the same in all three themes: "Overview",
      "Connections", "Delete", "Save changes", "Cancel", "Edit", "GM notes". The only themed word is the
      small subtitle beside "GM notes" (`lore_header`).
- [ ] **GM notes are closed by default** in both views, show a "GM only" marker, and are never rendered
      for guests. Opening or closing the section is remembered on the device.
- [ ] **No heading on the main text.** It starts directly under the tabs in both views.
- [ ] **Type rule.** No monospace in either view except dates, ids and other code-like values. Titles use
      `font-header`; everything else uses `font-body`.
- [ ] **Sentence case and size.** Tabs, buttons and notices are sentence case. Nothing a user must read is
      under 12px.
- [ ] **Delete is safe and consistent.** Delete is in the "More" menu in both views, in the danger colour,
      and still asks for confirmation.
- [ ] **Demo notice** reads "Demo: changes are not saved" and appears in both views.
- [ ] **Links render.** Read-only entity text shows `[[The Missing Heirloom]]` as a link without brackets.
- [ ] **Nothing lost.** Every action available today is still reachable, for owners and for guests.
- [ ] **File size.** `DetailHeader.svelte` and `ZenHeader.svelte` are each under 400 lines.

---

## 2. Technical Plan (How & Where)

### Target layout

Side panel, top to bottom:

1. **Header row:** thumbnail (64px, click to enlarge), type label, title, parent line. On the right:
   Edit, Find in graph, Expand, More, Close.
2. **Labels row:** existing label chips and the "Add label" field, one line high.
3. **Notices:** demo and draft, one line each.
4. **Tabs.**
5. **Overview panel:** main text with no heading → "GM notes" section (owners only, when present or
   editing; closed by default) → connections →
   tools (Generate related, Generate a business).
6. **Footer:** only while editing: Save changes, Cancel, and the unsaved marker.

Zen mode keeps its two columns. The header takes the same action bar, the sidebar keeps the full image,
and the overview's order matches the panel: text, lore, then tools at the bottom.

### Architecture & Touchpoints

Paths are under `apps/web/src/lib/components/`.

- **New files**:
  - `entity-detail/entity-actions.svelte.ts`: one function that returns the list of actions for an entity.
    Each action has `id`, `label`, `icon`, `run`, `placement` (`primary` or `menu`), `tone` (`default` or
    `danger`) and an optional `state` (busy, done). Visibility rules now duplicated in the two headers
    (guest, graph view, entity type, delve location, sound bite present) move here. Dependencies (vault,
    modal store, shelf, clipboard) are passed in with defaults (Constitution VIII).
  - `entity-detail/EntityActionBar.svelte`: renders primary actions as labelled buttons and the rest in a
    "More" menu. Below a width threshold, primary actions show icon only with `aria-label` and `title`,
    except Edit.
  - `entity-detail/EntityActionMenu.svelte`: the menu. `role="menu"`, arrow keys, Escape, focus returns to
    the trigger. Positioned with Floating UI, following `layout/VaultActionsMenu.svelte`.
  - `entity-detail/EntityNotices.svelte`: demo and draft notices, used by both views.
  - `entity-detail/EntityGmNotes.svelte`: the collapsible "GM notes" section, used by both views.
- **Changed files**:
  - `EntityDetailPanel.svelte`: remove `font-mono`; new order; use `EntityNotices`; drop the lore tab panel.
  - `entity-detail/DetailHeader.svelte`: thumbnail, type label, title; replace the icon row with
    `EntityActionBar`.
  - `entity-detail/DetailImage.svelte`: split into a small `DetailThumbnail` for the header and the
    existing large block, which stays for edit mode and for entities with no text.
  - `entity-detail/DetailTabs.svelte`, `detail-tabs.ts`: rename `status` to `overview`, remove `lore`,
    plain sentence-case labels.
  - `entity-detail/DetailStatusTab.svelte`: reorder to text, lore, connections, tools; heading "Connections".
  - `entity-detail/DetailLoreTab.svelte`: becomes a section inside the overview.
  - `entity-detail/DetailFooter.svelte`: plain "Save changes", "Cancel"; Delete moves to the menu; the
    footer shows only while editing.
  - `entity-detail/GenerateRelatedButton.svelte`, `GenerateBusinessButton.svelte`: sentence case; the
    business label becomes "Generate a business" for characters and factions, "Generate a business here"
    for locations.
  - `zen/ZenHeader.svelte`: replace the icon row with `EntityActionBar`.
  - `zen/ZenContent.svelte`: move Generate and AI revise below the text; use `EntityNotices`.
  - `zen/ZenView.svelte`: tab labels in sentence case, shared with the panel's label map.
  - Read-only text path in `MarkdownEditor.svelte` or its renderer: render wiki links.
- **Data Contracts & State Flow**:
  - No vault, schema or storage change. No migration.
  - `modalUIStore.zenModeActiveTab` and the panel's `activeTab` share one tab id type. Any stored or
    deep-linked `status` or `lore` value maps to `overview`.
  - Help targets (`data-help-target`) and test ids keep their names. Where an element moves into the menu,
    the help highlight opens the menu first; check `entity-detail/help-targets.test.ts`.
- **UI & Design Tokens**:
  - `font-header` for the title, `font-body` elsewhere, `font-mono` only on code-like values.
  - `text-sm` for tabs and buttons, `text-helper` as the smallest readable size.
  - Semantic tokens only (`theme-*`); danger actions use the existing danger treatment.
  - Iconify classes (`icon-[lucide--…]`), `touch-target` on icon buttons.

### Key Technical Decisions & Tradeoffs

- **Share the action model, not the whole header.** A single header component for both views would be
  cleaner but is a larger rewrite of two 580-line files with six test files between them. Sharing the action
  list and bar removes the duplication that causes the drift, and leaves each header's layout alone.
- **Thumbnail in the panel, full image in Zen.** The portrait matters to the app's character, so it stays
  visible beside the title and opens the lightbox on click. The alternative, a short banner image above
  the title, keeps more of the picture but pushes the text down again on phones.
- **Lore becomes a closed section, not a tab.** This matches Zen mode and removes a tab. The section is
  closed by default so GM-only text is not on screen when players can see it, and it opens while editing.
  The open or closed choice is one device-local preference shared by both views
  (`codex-entity-gm-notes-open`), read through the injected storage. Zen mode today shows lore open; it
  changes to the same rule.
- **Plain heading with a themed subtitle.** The lore section is headed "GM notes" with `jargon.lore_header`
  beside it in muted text, hidden from assistive technology as decoration. The main text has no heading, so
  `jargon.chronicle_header` is no longer shown in these two views.
- **Plain words by not reading the keys.** The two views stop using `jargon.save`, `jargon.delete`,
  `jargon.tab_status`, `jargon.tab_lore` and `jargon.connections_header`. The theme data is not edited
  here, so other screens are unaffected until task D1.
- **Delete moves into the menu.** It is rarer than Edit and destructive, so it should not sit one tap from
  the main action. It keeps its confirmation.
- **Ship in slices.** Five pull requests, each leaving both views working, so review stays small.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: open an entity, read the text at once, press Edit, change text, Save
  changes. Open More, choose an action, and the result shows as it does today.
- **Negative / Error Path**:
  - An action fails (clipboard blocked, shelf write fails): the menu closes and the existing error
    notification shows. The action never fails silently.
  - Guest view: the menu lists only guest actions; if none remain, the More button is not shown.
  - AI disabled: Generate and AI revise stay visible and explain why they are unavailable, as today.
- **Cancellation / Edge Case**:
  - Escape closes the menu before it closes the panel or Zen mode, and focus returns to the More button.
  - Unsaved edits: Close, Expand and navigation still go through the existing guarded close.
  - No image: the thumbnail shows the silhouette. No text: the overview shows the existing empty prompt
    and the large image block.
  - Very long title or many aliases: the header wraps; the action bar stays on the first line.
  - Narrow panel (320px): primary actions fall back to icons, except Edit.
  - Stored tab `status` or `lore` from an earlier session: opens Overview.

---

## 3. Tasks & Execution Sequence (When)

Each slice is one pull request on its own branch, with tests first. Tests cover the success path and at
least one failure, guest or cancellation path.

### Slice 1 — Type and words (smallest, most visible) ([#4739](https://github.com/eserlan/Codex-Cryptica/issues/4739))

- [x] **1.1 Tests** — `EntityDetailPanel`: root has no `font-mono`. `DetailTabs` and `ZenView`: labels are
      "Overview", "Connections" and so on in a fantasy and a sci-fi theme. `DetailFooter`: reads "Save
      changes" and "Cancel" with `jargon.save` set to "Inscribe". Guest: no edit controls.
- [x] **1.2 Panel type** — remove `font-mono` from the `<aside>`; set `font-body`; keep `font-mono` only
      on dates and ids in `DetailTabs`, `DetailTimelineTab`, `DetailConnectionsTab`.
- [x] **1.3 Tab labels** — one shared label map for both views; sentence case, `text-sm`, no widened
      letter-spacing.
- [x] **1.4 Plain words** — footer, connections heading and buttons stop reading action jargon; sentence
      case on Generate buttons; business label by entity type.
      The "Generate related" casing and the type-specific business label followed once their tests were updated.
- [x] **1.5 Notices** — add `EntityNotices`; "Demo: changes are not saved"; use it in both views.
- [ ] **1.6 Verification gate.**

### Slice 2 — Shared actions ([#4740](https://github.com/eserlan/Codex-Cryptica/issues/4740))

- [x] **2.1 Tests** — `entity-actions`: owner on graph gets Edit, Find in graph, Expand as primary; guest
      gets no Edit, Delete or Shelf; character gets Chat only when guest chat is enabled; delve location
      gets the canvas action; delete has tone `danger`. Failure: a `run` that rejects surfaces an error.
- [x] **2.2 Action model** — `entity-actions.svelte.ts`, moving the visibility rules out of both headers.
- [x] **2.3 Menu** — `EntityActionMenu.svelte` with keyboard tests: arrows, Escape returns focus, click
      outside closes.
- [x] **2.4 Bar** — `EntityActionBar.svelte`; narrow-width fallback to icons.
- [x] **2.5 Wire the panel** — `DetailHeader` uses the bar; update `DetailHeader.test.ts`.
- [x] **2.6 Wire Zen mode** — `ZenHeader` uses the bar; update the five `ZenHeader.*.test.ts` files.
- [x] **2.7 Delete** — remove it from `DetailFooter`; footer renders only while editing; update
      `ZenHeader.delete.test.ts` and `tests/vault-delete.spec.ts`.
- [x] **2.8 Help targets** — a highlighted action inside the menu opens the menu first.
- [ ] **2.9 Verification gate.**

### Slice 3 — Text first in the side panel ([#4741](https://github.com/eserlan/Codex-Cryptica/issues/4741))

- [x] **3.1 Tests** — component test for DOM order: title, tabs, text, connections, tools. Playwright
      check in `tests/responsive-entity-panel.spec.ts`: first line of text is within the viewport at
      1440 × 900 and 390 × 844. Edge: entity with no text shows the empty prompt and large image.
- [x] **3.2 Thumbnail** — `DetailThumbnail` in the header; click opens the lightbox; silhouette fallback.
- [x] **3.3 Image tools** — "Change image" and "Choose silhouette" move to the More menu and stay as
      buttons in edit mode.
- [x] **3.4 Reorder the overview** — text, connections, tools.
- [x] **3.5 Labels row** — one line under the header; the field expands on focus.
- [ ] **3.6 Verification gate.**

### Slice 4 — Same structure in both views ([#4742](https://github.com/eserlan/Codex-Cryptica/issues/4742))

- [x] **4.1 Tests** — `detail-tabs`: no `lore`, `status` maps to `overview`. GM notes: closed by default,
      opens on click and while editing, remembers the choice, and is absent from the DOM for guests. Panel: lore section appears
      for owners when lore exists or while editing, and never for guests. Zen: tools sit below the text
      (`ZenContent.order.test.ts`).
- [x] **4.2 Tab ids** — rename `status` to `overview`; map old values.
- [x] **4.3 GM notes section** — one shared `EntityGmNotes.svelte` used by both views: heading "GM notes",
      themed subtitle, "GM only" marker, closed by default, open while editing, preference remembered.
      Move `DetailLoreTab` content into it and use it in `ZenContent`.
- [x] **4.3b Main text heading** — remove the `chronicle_header` heading from `ZenContent`; the delve and
      canvas controls that sit in that heading row move to the tools group.
- [x] **4.4 Zen order** — move AI revise and Generate related below the text in `ZenContent`.
- [x] **4.5 Connections wording** — "Connections" in both; one row component if `ZenConnectionRow` fits
      the panel without layout change, otherwise leave two and match the words and icons.
- [ ] **4.6 Verification gate.**

### Slice 5 — Links and polish ([#4743](https://github.com/eserlan/Codex-Cryptica/issues/4743))

- [x] **5.1 Tests** — read-only text with `[[Name]]` renders a link and no brackets; an unknown name
      renders as plain text without brackets; edit mode still shows the raw source.
- [x] **5.2 Wiki links** in the read-only render path.
- [ ] **5.3 Theme pass** — check both views in all 18 themes at both sizes; fix contrast or overflow found.
  - Only the three acceptance themes were checked in the build; the full 18-theme sweep is done by hand.
- [x] **5.4 Help content** — update the Help article and any `FeatureHint` that names moved controls
      (Constitution VII).
- [x] **5.4b Demo data** — give the demo entities GM notes that differ from their main text, or none.
- [ ] **5.5 Re-score** — add a dated row to the assessment scorecard for the entity views.
  - The re-score is done by hand (assessment task K3).
- [ ] **5.6 Verification gate.**

### Traceability

Findings (U, L, F, G) and tasks (B) are numbered as in the
[assessment](../usability-look-feel-assessment-2026-11-12.md); F numbers come from
[ui-assessment-2026-11-11.md](../ui-assessment-2026-11-11.md). Principles (P) are numbered as in the
[style guide](../STYLE_GUIDE.md#usability-and-clarity-principles).

| Slice                           | Issue                                                          | Findings closed        | Assessment tasks | Principles |
| ------------------------------- | -------------------------------------------------------------- | ---------------------- | ---------------- | ---------- |
| 1. Type and words               | [#4739](https://github.com/eserlan/Codex-Cryptica/issues/4739) | L1, L2, U6, U7, G1, G3 | B2, B4, B5       | P1, P6     |
| 2. Shared actions               | [#4740](https://github.com/eserlan/Codex-Cryptica/issues/4740) | U1, F22, G4            | B3               | P3, P4, P5 |
| 3. Text first in the side panel | [#4741](https://github.com/eserlan/Codex-Cryptica/issues/4741) | U4, F15                | B1               | P2         |
| 4. Same structure in both views | [#4742](https://github.com/eserlan/Codex-Cryptica/issues/4742) | F22, U6                | B4               | P1, P3     |
| 5. Links and polish             | [#4743](https://github.com/eserlan/Codex-Cryptica/issues/4743) | U7, F26, L6            | B5, B6           | P1, P9     |

### Decisions (made 12 November 2026)

| Decision         | Choice                                                                                                                               | Alternatives turned down                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Panel image      | 64px thumbnail beside the title; click opens the full image. Zen mode keeps the full image.                                          | Short banner, collapsing banner, image wrapped in the text |
| Visible actions  | Edit, Find in graph, Expand. Everything else in "More", with Delete last and separated. Guests see Copy link, Find in graph, Expand. | AI revise in the header, Edit only, Delete visible         |
| Lore             | A section of the overview, closed by default, in both views.                                                                         | Open by default, its own tab                               |
| Section headings | "GM notes" with the themed word as a small subtitle. No heading on the main text.                                                    | Themed only, plain only, themed word first                 |

---

## 4. Verification Gate

Run from the repository root after each slice.

```bash
bun scripts/lint-changed.mjs --base origin/staging
bun scripts/test-changed.mjs --base origin/staging
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error && cd ../..
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

Then check by hand on a local dev server, in three themes and two sizes, against the acceptance criteria.
