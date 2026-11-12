# UI assessment — 11 November 2026

Scored against eight dimensions, each 0–4. Tasks, states and layout fit are weighted double.

**Overall: about 2.1 out of 4.** One hard fail was observed (F1).

## How it was assessed

- **Live:** `staging.codexcryptica.com` at version 0.36.22, in a clean browser profile, using the demo vault (7 entities, Fantasy dark). Desktop at 1440×900, phone at 390×844.
- **Flows walked:** create entity, link two entities, start a solo session, Generate Region on a blank map, open a public guest world. AI Disabled was switched on for part of the create flow.
- **Static:** pattern counts over the 830 Svelte files in `apps/web/src`, and contrast maths over the 18 theme definitions in `packages/schema/src/theme-templates.ts`.
- **Tools:** Lighthouse (accessibility, best practices, SEO), a contrast and touch-target script run in the page, browser performance timings.

### Limits

- The automated browser could not reach the AI verification service, so every AI call ran in an "AI unreachable" condition. F2 describes what a user sees in that condition; it says nothing about AI when it is reachable.
- Everything in the app was done in demo mode. Demo mode does not persist some settings, so F1 needs a repeat in a saved vault.
- Sharing was not walked: publishing writes to R2, so only the read side (an existing public world) was checked.
- Only one public world was inspected, and nothing was measured on a large vault of your own.
- Only Fantasy dark and Workspace dark were seen live. Other themes were scored from their base token set.
- Error states other than AI failure were not exercised.

## Scorecard

| #   | Dimension        | Score | Weight | Summary                                                                                                                             |
| --- | ---------------- | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task success     | 2     | ×2     | Linking, solo session and Generate Region work. Create is blocked without AI, and Generate Region sits behind a hidden right-click. |
| 2   | State coverage   | 2     | ×2     | Empty states exist. AI failure states do not: one spins forever, one closes silently.                                               |
| 3   | Accessibility    | 3     | ×1     | Lighthouse 95 in-app, 100 on `/generators`. Small text, a few unnamed or mislabelled buttons.                                       |
| 4   | Theme robustness | 2     | ×1     | Body text passes everywhere. 26 of 162 core colour pairs fall below target; about 7% of colour classes bypass tokens.               |
| 5   | Layout fit       | 2     | ×2     | No horizontal page scroll on phone. Desktop header clips Settings off-screen; map panels overlap.                                   |
| 6   | Consistency      | 2     | ×1     | Two different entity views; no shared button component.                                                                             |
| 7   | Clarity and copy | 2     | ×1     | Several names for the same thing; internal ids and raw Markdown shown to users.                                                     |
| 8   | Responsiveness   | 2     | ×1     | App shell loads 2.5 MB of compressed JS. Not measured on a large vault.                                                             |

## Hard-fail checks

| Check                                               | Result                                          |
| --------------------------------------------------- | ----------------------------------------------- |
| AI action with AI Disabled on must explain itself   | **Fail** — see F1                               |
| Guest or public viewer must not see GM-only content | No leak found in one world — see "What held up" |

## Findings and fix proposals

Severity: **High** blocks a core job or is a hard fail; **Medium** costs time or trust; **Low** is polish.

### Task success and states

#### F1 — Create with AI Disabled on spins, then closes with nothing created (High, hard fail)

- **Seen:** Settings → AI → AI Disabled on. Header Create → typed a name → Character. A "Generating…" dialog showed for about 14 seconds, then closed. No entity was created (count stayed at 7) and no message appeared.
- **Where:** `lib/components/guided/IntentCreateModal.svelte` (`selectIntent` always opens a generator workflow) and `lib/components/generators/CampaignGeneratorModal.svelte` (auto-generate at lines 104–123; the `ai-disabled` throws at lines 216 and 248).
- **Fix:** When AI is disabled, Create should make a blank entity of the chosen type with the typed name and open it for editing. If a generator has an offline path, say so in the dialog ("Made on this device, no AI"). Never close the dialog without either a result or a reason.
- **Verify:** Repeat in a saved vault, since demo mode may not hold the AI Disabled setting.

#### F2 — Create spins indefinitely when AI cannot be reached (High)

- **Seen:** With AI enabled but the verification handshake failing (`[AiSession] Session handshake error: Verification service is unavailable`), "Generating…" ran for over 90 seconds with rotating flavour text and no error. Only Cancel ended it.
- **Where:** `CampaignGeneratorModal.svelte`; the handshake lives in `packages/ai-engine/src/session-manager.ts`.
- **Fix:** Fail fast when the session handshake has already failed. Add a timeout (20–30 seconds) with a plain message and two actions: "Try again" and "Create without AI". Replace the flavour text with a real status after 10 seconds.

#### F3 — There is no plain "new entity" path from the Create button (High)

- **Seen:** In both Guided and Full Toolbox, Create → type always starts AI generation. Cancel lands on the generator picker, not a blank entity. The input placeholder is "Optional prompt, name, or keywords…", so a typed name is treated as a prompt.
- **Fix:** Give the dialog two clear actions per type: "Create blank" (default when a name is typed) and "Generate with AI". Label the field "Name".

#### F4 — Create does nothing when no vault is open (Medium)

- **Seen:** On the welcome screen, clicking Create gave no dialog and no message.
- **Where:** `IntentCreateModal.svelte`, `selectIntent`: `if (!isVaultReadyForGenerators(vault)) { close(); return; }`, and the header button itself.
- **Fix:** Either hide or disable Create until a vault exists, or have it start Quick Start / "Create a vault first".

#### F5 — Generate Region is seven steps deep and needs a hidden right-click (High)

- **Seen:** The path is: Map → "Upload world image" → Blank Map tab → name → Grid on → **right-click** the Grid button → Hex → tick Hex Crawl mode → "Apply to All" → click a hex → Generate Region. The right-click is only hinted at in a tooltip (`MapVTTControlsHUD.svelte:186`, "Right-click for settings") and cannot be done on a touch screen.
- **Fix:** Add a visible grid-settings button (a cog beside Grid). On the blank-map dialog, offer "Hex crawl map" as a starting choice that sets hex grid and Hex Crawl mode in one step.

#### F6 — Grid settings: "Close" discards changes and the save button is "Apply to All" (Medium)

- **Seen:** Choosing Hex then Close left the grid square. Only "Apply to All" saved it.
- **Where:** `lib/components/map/VTTGridSettings.svelte` lines 516 (`close`) and 523 (`save`).
- **Fix:** Rename to "Cancel" and "Save". If "all" means all maps, say that in a separate, explicit option.

#### F7 — Blank map is hidden behind "Upload world image" (Medium)

- **Seen:** The map empty state offers only "Upload world image" and says "drag and drop… or click", including on a phone. The Blank Map tab appears only after pressing it (`MapUploadOverlay.svelte`).
- **Fix:** Two buttons in the empty state: "Upload an image" and "Start a blank map". Use "tap" wording on touch devices.

#### F8 — A new blank map gives no next step (Medium)

- **Seen:** After creating a blank map the canvas is empty with no hint. The dialog mentions a tile deck that is not on screen.
- **Fix:** Show a short empty-canvas hint with the two likely next actions: turn on a grid, or add tiles.

#### F9 — Solo session does not pick up the map you then open (Low)

- **Seen:** Started a session with "No map" (the only option), then created and opened a map. The solo bar still read "NO MAP". Starting with no map lands on the graph with an entity panel open.
- **Fix:** Offer "Use this map for the session" when a map is opened during a map-less session. Add "Create a map" to the start dialog when none exist.

#### F10 — Table and timeline empty states have no action (Low)

- **Seen:** "No entities yet — Create entities in this vault…" and "No matching events" are text only.
- **Fix:** Add a Create button to the table empty state and "Clear filters" / "Add a dated event" to the timeline.

#### F11 — Opening `/dice` directly drops the demo vault (Low)

- **Seen:** Navigating to `/dice` did a full reload into a standalone shell; the demo vault was gone on return.
- **Fix:** Keep `/dice` inside the app shell when a vault is open, or warn before leaving demo mode.

### Layout fit

#### F12 — Desktop header overflows; Settings is off-screen (High)

- **Seen:** At 1440px in Full Toolbox with demo controls showing, the header is 1,756px wide in a 1,440px window. Manage vault, Save to folder, Explore public worlds and Settings are clipped off the right edge. The search box shrinks to an icon (to "Sear" in Guided).
- **Fix:** Let the header wrap or collapse low-priority items into an overflow menu. Settings must always stay visible. Move the demo controls to their own strip, as the phone layout already does.

#### F13 — Hex panel and "Go to hex" bar overlap other controls (Medium)

- **Seen:** With a hex selected at 1440px, the "Go to hex" bar sits on top of the map toolbar (Set world, Delete, Note, Add map are unreadable), the hex panel covers part of the solo bar and the footer links, and the bottom toolbar is cut off under the panel.
- **Fix:** Reserve space for the hex panel (shrink the map area) and place "Go to hex" inside the panel or below the map toolbar.

#### F14 — VTT mode clips its bottom toolbar (Medium)

- **Seen:** In VTT mode at 1440px the bottom toolbar is cut on both sides ("…IEW", "VTT O…") and the measure button overlaps "Player view".
- **Fix:** Make the toolbar scroll or wrap between the two sidebars; give the measure button its own slot.

#### F15 — Entity view on a phone: actions run off-screen and the text is below the fold (Medium)

- **Seen:** The header row of seven icon buttons is clipped at the right edge. The lore text sits below a full-height image and four image buttons.
- **Fix:** Keep Edit and Close visible and move the rest into a "More" menu. On phones, put the text first and collapse the image to a thumbnail.

#### F16 — Table search overlaps "Filters" on a phone (Low)

- **Seen:** The search control covers the first letter of "Filters".
- **Fix:** Give the collapsed search a fixed width or move Filters to its own row.

### Accessibility

#### F17 — Buttons without names, or with names that do not match their text (Medium)

- **Seen (Lighthouse, entity open, phone):** the Edit button (`data-testid="edit-entity-button"`) has no accessible name at phone width. Three buttons have aria-labels that do not contain their visible text: "Generate prompt", "AI Revise", and "Regenerate", which is labelled "Revise Chronicle and Lore".
- **Fix:** Add `aria-label="Edit"` when the text is hidden. Make each aria-label start with the visible text; check that "Regenerate" is wired to the right label.

#### F18 — Small and low-contrast text in the desktop table (Medium)

- **Seen:** About 40 text elements under 11px. The "—" placeholders are 2.9:1 and the count badge 3.6:1.
- **Fix:** Set a 12px floor for UI text. Use the muted text token, not a faded one, for placeholders.

#### F19 — Page structure (Low)

- **Seen:** 2–3 `h1` elements when a dialog is open; no `nav` landmark in Guided mode; no skip link. The search box shows no focus change.
- **Fix:** One `h1` per page with dialog titles as `h2`; add a "Skip to content" link; add a focus ring to the search box.

### Theme robustness

#### F20 — Theme colours below contrast targets (Medium)

- **Seen (base token set, 18 themes):**
  - Horror: primary on background 4.2:1, primary and link on surface 3.9:1.
  - Western: primary and link on surface 4.3:1.
  - Space Western: muted text 3.4:1 on surface, 3.8:1 on background.
  - Accent on background about 2.5:1 in Workspace, Fantasy, Horror and Western.
  - Border on surface below 3:1 in 15 of 18 themes. This matters only where the border is the sole edge of a control.
- **Fix:** Adjust those tokens in `packages/schema/src/theme-templates.ts`. Add a unit test that computes these pairs for every theme and variant and fails below 4.5:1 for text and 3:1 for accents.

#### F21 — About 7% of colour classes bypass theme tokens (Medium)

- **Seen:** 950 fixed palette classes (such as `text-red-500`) in 167 files, 185 `white`/`black` classes and 105 hex values, against about 14,900 token classes. Worst files: `modals/NodeReadModal.svelte` (24), `canvas/EntityNode.svelte` (19), `ShareModal.svelte` (17), `entity-detail/CharacterChat.svelte` (17), `dice/DiceRollResult.svelte` (12).
- **Fix:** Replace with semantic tokens, starting with those five files. Add a lint rule that rejects fixed palette classes in `.svelte` files.

### Consistency

#### F22 — Two entity views with different words and controls (Medium)

- **Seen:** The entity dialog has tabs "Overview, Connections…", a "Connections" list and a bin icon. The side panel has "Attributes, Connections, Mythos…", a "Bonds" list, a "Burn" button and a monospace title.
- **Fix:** One set of tab names, one word for connections, one delete control ("Delete") in both.

#### F23 — No shared button component (Medium)

- **Seen:** 1,857 raw `<button>` elements, no `<Button>` usage, 86 `<style>` blocks and 243 arbitrary pixel values. Dialogs mix uppercase and Title Case headings, and custom and native form controls (the solo session dialog uses native ones).
- **Fix:** Add `Button` and `IconButton` to `lib/components/ui` with primary, secondary, danger and ghost variants, and migrate the busiest screens first.

#### F24 — Public pages use a different logo and wordmark (Low)

- **Seen:** `/generators` shows a castle icon and "CODEX"; the app shows a book icon and "Codex Cryptica".
- **Fix:** Use one mark, or confirm the split is intended.

### Clarity and copy

#### F25 — Several names for the same thing (Medium)

- **Seen:** Vault, Archive and Chronicles for the vault and its entries ("Make this my Vault" and "Make this my Archive" both exist; "Save as Archive"; "7 Chronicles"). "Tome" and "Ancient Inscription" as section titles. "Transient mode" and "Demo mode" for the same state. The map is "Map", "World Map" and "Battle Map".
- **Fix:** Pick one plain word for each and keep themed wording to decoration only.

#### F26 — Internal ids and raw markup shown to users (Medium)

- **Seen:**
  - A new connection with no label shows as `RELATED_TO` in the entity and `related_to` on the graph.
  - Entity text shows `[[The Missing Heirloom]]` with the brackets; table summaries show `[[The Mi…`.
  - Settings shows `**Demo Mode**` with the asterisks.
- **Fix:** Show "Related to" for the default relation. Strip wiki-link brackets when rendering links and summaries. Render or remove the Markdown in the settings notice.

#### F27 — "Tag" still used in settings (Low)

- **Seen:** "Tag reference", "tag suggestions" and "automated tagging" in Settings.
- **Fix:** Change to "label".

#### F28 — Smaller copy issues (Low)

- The connections cell reads "1 0 in · 1 out". Show "1 (0 in, 1 out)" or drop the total.
- The AI settings name both "OpenAI/Luna" and "Google Gemini API" as the provider.
- The demo content uses "Rumor"; house style is British English.
- The onboarding tip on phone points to "the bar at the bottom", which is not shown.
- The Play intro says "or hand the game to the Oracle" when AI is disabled and that card is hidden.
- The entity header places Delete in the middle of unlabelled icon buttons. Move it to the end or into a menu.
- In Full Toolbox the left rail is 13 icons with no text. Add labels on hover and focus, or an expanded state.

### Responsiveness

#### F29 — Heavy app shell (Medium)

- **Seen (fast desktop connection, no throttling):** 2,527 KB of compressed JS in 179 files, 203 requests, first content at 1.8s, about 1.1s of long tasks. The public `/generators` page: 716 KB of JS, first content at 0.5s. In-app navigation took 50–500 ms.
- **Fix:** Check what the welcome screen pulls in; defer the graph, map and generator code until those views open. Measure again with phone throttling, since many users play on phones.

#### F30 — Blank screen on reload at phone width (Low)

- **Seen:** After a reload at 390px the page was blank with no loader when first checked, and had rendered 4 seconds later.
- **Fix:** Show the app shell or a loader straight away.

## What held up

- **Linking two entities:** Add → search → Connect, three steps, result shown at once.
- **Solo session:** one dialog, and the dialog says no AI is needed. The solo bar's controls are plain text.
- **Generate Region, once reached:** the preview appeared in about a second, says it runs on the device with no AI, and offers Accept and Cancel before anything is saved.
- **Guest view:** one public world (220 entities, 1,281 connections) opened read-only with no edit, delete or generate controls. Its bundle contained no `hexCrawl` key and no `hidden` label.
- **Graph accessibility:** the canvas graph has a text alternative that points to the table view and search.
- **Phone basics:** no horizontal page scroll on nine screens; the menu and main actions are at least 44px.
- **Public pages:** `/generators` scored 100 on Lighthouse accessibility, best practices and SEO.
- **Icons:** no `lucide-svelte` imports anywhere.

## Suggested order

1. F1, F2, F3 — creating an entity must work without AI, and never end silently.
2. F12 — Settings must be reachable on desktop.
3. F5, F6, F7 — make hex maps and Generate Region reachable without a right-click.
4. F13, F14, F15 — overlaps and clipped controls.
5. F17, F20, F26 — quick accessibility, contrast and copy fixes.
6. F21, F22, F23, F25 — consistency work, done screen by screen.
