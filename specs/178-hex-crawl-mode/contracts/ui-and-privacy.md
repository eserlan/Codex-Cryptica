# Contract: UI surfaces, visibility and privacy

## Surfaces

| Surface               | Location                                                                                                                                                  | Shown when                                   | Requirement     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------- |
| Hex Crawl mode switch | Inside the grid settings panel (`VTTGridSettings.svelte` hosts `components/map/hex-crawl/HexCrawlModeToggle.svelte`), which opens with or without the VTT | GM, map has a hex grid                       | FR-001          |
| Terrain icons toggle  | Map display options (`HexCrawlDisplayToggle`)                                                                                                             | GM, Hex Crawl mode on                        | FR-005a         |
| Go to hex             | Map controls (`HexGoTo.svelte`), a labelled text field plus button                                                                                        | GM, Hex Crawl mode on                        | FR-003a         |
| This hex              | Selected token detail (`TokenDetail.svelte`, one action) and selected pin popover (`MapOverlays.svelte`)                                                  | GM, Hex Crawl mode on                        | FR-003b         |
| Hex panel             | `HexCrawlPanel.svelte`: floating (Floating UI) on `md` and up, bottom sheet below                                                                         | GM, Hex Crawl mode on, a hex is selected     | FR-003–FR-009   |
| Discovery review      | `HexDiscoveryReview.svelte`, inside the panel                                                                                                             | A draft exists or is generating              | FR-020–FR-034   |
| Explore offer (solo)  | Non-blocking inline prompt near the travel readout, with "Explore" and "Not now"                                                                          | Solo on, a hex newly explored by the party   | FR-035/036      |
| Overlay               | `HexCrawlOverlay.svelte`: explored marker and terrain icons                                                                                               | GM view only                                 | FR-018, FR-005a |
| AI notice             | Inline in the Explore area, dismissible                                                                                                                   | AI enabled, not yet dismissed on this device | FR-031          |
| First-use hint        | `FeatureHint` configured in `help-content.ts`                                                                                                             | First hex panel open, until dismissed        | FR-045          |

## Hex panel layout (top to bottom)

1. **Header:** hex label in the map's label style (or the default numeric format when labels are hidden or set to `none`), a state chip (Unknown, Seen or Explored), and a close button.
2. **Explore (primary):** a prominent button for hexes that aren't explored, and a secondary one for explored hexes. If a draft is pending, it reads **Review discovery**.
3. **Terrain:** a picker with nine presets with icons, plus "Custom…" (a text field) and "Clear".
4. **Notes:** a GM textarea, labelled **Your notes**.
5. **AI notes (when present):** a separately framed section headed **AI-drafted**, editable and clearable, never merged into **Your notes** (FR-027).
6. **In this hex:** the list of pinned entities, each one opening its entity. Then **Attach entity** (search, then pin at the hex centre) and **Create entity here** (type and title, then create, pin and open).
7. **Footer:** **Mark explored** or **Mark unexplored**.

## Discovery review card

- **Six parts:** landmark, encounter, hazard, secret, faction presence and atmosphere. Each shows its text, a source badge (**AI-drafted** or **Rolled**), and the actions **Keep/Save**, **Regenerate** and **Discard**.
- **Landmark and encounter:** **Save as location** or **Save as event/note** (the encounter defaults to event). A proposed-link checkbox, "Link to {title}", is shown when a location sits within 2 hexes and is ticked by default.
- **Faction presence:** **Link {faction}** when the name matches an existing faction; otherwise **Create faction {name}**.
- **Hazard, secret and atmosphere:** **Add to AI notes**.
- **Draft controls:** **Discard draft** (all parts) and **Cancel** while generating (aborts).
- **Failure:** a plain message, "The AI couldn't draft this hex.", with **Try again** and **Roll on terrain tables** (FR-034).
- **Custom terrain offline:** "No tables for '{terrain}', so general tables were used." (FR-030)

## Accessibility (FR-003c)

- The panel is a labelled region (`aria-labelledby` the header). Focus moves to the header on open, Escape closes it, and focus returns to the opener on close.
- Every action is a `<button type="button">` with visible text. Icon-only controls have an `aria-label`, and decorative icons have `aria-hidden="true"`.
- The state chip and source badges use text as well as colour. Contrast follows theme tokens (`text-theme-*`, `bg-theme-*`) and meets 3:1 for controls in all themes.
- Generation progress is announced through an `aria-live="polite"` status line.

## Visibility matrix (FR-018, FR-041)

| Item                               | GM (normal)             | GM (solo) | GM (Player View preview) | Connected player | Guest vault / published bundle |
| ---------------------------------- | ----------------------- | --------- | ------------------------ | ---------------- | ------------------------------ |
| Hex panel, notes, AI notes, drafts | ✅                      | ✅        | ❌                       | ❌               | ❌                             |
| Terrain values and icons           | ✅ (icons when toggled) | ✅        | ❌                       | ❌               | ❌                             |
| Explored marker                    | ✅                      | ✅        | ❌                       | ❌               | ❌                             |
| Pins (existing rules)              | unchanged               | unchanged | unchanged                | unchanged        | unchanged                      |
| Fog                                | unchanged               | unchanged | unchanged                | unchanged        | unchanged                      |

## Privacy contract (D16)

1. `GuestExporter.export()` output maps **never** contain `hexCrawl`, with or without `playerVisible`. `grid` may be included. This is enforced by a vault-engine contract test.
2. VTT session snapshots and network messages **never** contain `hexCrawl`. This is enforced by a snapshot test.
3. An AI request happens only from an explicit **Explore**, **Regenerate** or **Try again**, or from accepting the solo offer, with AI enabled and not in a guest vault (FR-043). This is enforced by tests that assert the model runner is not called otherwise.
4. No analytics, telemetry or remote logging calls are added (FR-042). Review checks that no analytics imports were added.
