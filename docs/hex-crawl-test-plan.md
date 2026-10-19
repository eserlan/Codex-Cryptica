# Hex crawl: step-by-step manual test plan

Use this to test hex preparation, exploration, discovery and step-by-step journeys together.
Run the core walkthrough in order, then the additional checks that match your release.
This record documents the completed test run; all core walkthrough cases (1–8) have passed.

## Record the run

| Item                                  | Value                                                           |
| ------------------------------------- | --------------------------------------------------------------- |
| Tester and date                       | Antigravity & Espen, 2026-10-19                                 |
| App URL and commit/build              | http://localhost:5173, commit `bfc2ac819` / staging `db3a38da2` |
| Browser, version and operating system | Chromium (Chrome DevTools MCP), Linux (x86_64 Wayland)          |
| Map and grid orientation              | Aldoria Wilds, Hex (Pointy)                                     |
| Result                                | **Pass** (All Core Walkthrough cases 1–8 passed)                |
| Failures and issue links              | None                                                            |

For each case below, record **Pass**, **Fail** or **Blocked**. For a failure, record
the case number, hex label, last action, expected result and actual result. Include a
screenshot or console error if it helps. A blocked or skipped case is not a pass.

## Prepare a test campaign

1. Create a disposable campaign called **Hex Crawl QA**. Add a map image large enough
   for a route of at least four adjacent hexes and a second map for switching tests.
2. Create a location called **Millbrook** and a faction called **The Ash Wardens**.
3. Open the first map as the GM. Open **Grid Settings** by right-clicking the grid
   control. Select **Hex (Pointy)**, fit the grid, and turn on **Hex Crawl mode**.
   Choose **Apply to All** to apply the settings; closing the dialog is not the apply action.
4. Set **Distance per Cell** to `6` and **Unit Name** to `mi`.
5. Add one unlocked party token. Enable **Vision Source (PC)** for it, with a vision
   range of one hex. Keep it away from the edge of the map.
6. Turn on **AI Disabled** in Settings. Start with fog off and solo play off.
7. Identify four adjacent hexes in a straight line. Record their actual labels below.
   A–D are names used only in this plan, not coordinates to type into the app.

   | Test name | Actual hex label | Purpose                               |
   | --------- | ---------------- | ------------------------------------- |
   | A         | A01              | Party starts here; pin Millbrook here |
   | B         | A02              | Forest; notes and discovery           |
   | C         | B03              | Custom terrain; second arrival        |
   | D         | B04              | Destination; third arrival            |

8. Place the party token at A. Keep another empty hex away from A–D for cancellation
   and draft-discard checks. Wait for settings to save before reloading.

## Core walkthrough

### 1. Open and navigate hexes — **Pass**

1. Click empty space inside B. **Expect:** a panel opens with B's label, **Seen**,
   terrain, **Your notes**, **In this hex**, and exploration controls.
2. Drag empty map space. **Expect:** the map pans without opening a different panel.
3. Close the panel. Type B's actual label into **Go to hex** and activate **Go**.
   **Expect:** the map centres on B and focus enters its panel.
4. Press Escape. **Expect:** the panel closes and focus returns to its opener.
5. Enter an invalid coordinate, such as `not-a-hex`, then a valid-format coordinate
   outside this map. **Expect:** a plain error; no unrelated hex opens or changes.

### 2. Prepare terrain, notes and contents — **Pass**

1. Open B, choose **Forest**, and enter `QA: old road through the trees` in **Your notes**.
2. Immediately open C. Choose **Custom…**, enter `Glass dunes`, and apply it.
   **Expect:** B's note stays on B; C has its own terrain and no copied note.
3. Open A and use **Attach entity** to attach Millbrook.
   **Expect:** its pin is at A's centre and it appears under **In this hex**.
4. Open B and use **Create entity here** to create a character named **QA Scout**.
   **Expect:** one character is created, pinned in B, listed there and opened.
5. Close the entity view. Click its pin and the party token in turn.
   **Expect:** normal pin/token interaction still works. Use **This hex** from a
   pin/token menu; the panel opens for the hex containing it.
6. Reload and reopen A, B and C. **Expect:** terrain, notes, entities and pins remain
   attached to the correct hexes.

### 3. Check fog and exploration states — **Pass**

1. Turn fog on and cover D, including its centre. Open D via **Go to hex**.
   **Expect:** **Unknown**.
2. Reveal D's centre. **Expect:** **Seen**.
3. Choose **Mark explored**, then cover D again. **Expect:** it stays **Explored**
   with a GM exploration marker.
4. Choose **Mark unexplored** while D is covered. **Expect:** it becomes **Unknown**.
5. Turn fog off. **Expect:** untouched hexes are **Seen**; explored hexes remain explored.
6. Turn **Terrain icons** on and off in map display options.
   **Expect:** terrain icons follow the setting without deleting terrain records.

### 4. Discover a hex with AI disabled — **Pass**

1. Open B and choose **Explore**. **Expect:** a draft appears using terrain tables,
   with six parts: landmark, encounter, hazard, secret, faction presence and atmosphere.
   Parts show **Rolled**. No AI request is required.
2. Keep at least one part pending. Close the panel, reload, and reopen B.
   **Expect:** **Review discovery** opens the same pending draft.
3. **Regenerate** the encounter. **Expect:** only that part is regenerated; the other
   parts and handwritten notes remain intact. A random roll may repeat its text.
4. Save the landmark with **Save as location**, leaving **Link to Millbrook** ticked
   if proposed. **Expect:** exactly one location is created and pinned in B; the
   proposed relationship is created when selected.
5. Save the encounter with **Save as event**. On a later draft, also exercise
   **Save as note**. **Expect:** the chosen entity type is created once per save.
6. Use **Add to AI notes** for the secret, then discard the hazard.
   **Expect:** the secret appears under **AI-drafted** notes, the hazard is discarded,
   and **Your notes** still says `QA: old road through the trees`.
7. Finish or discard the remaining parts. **Expect:** no pending draft remains.
8. Explore C. **Expect:** six rolled parts and a message that general tables were
   used for **Glass dunes**. Use **Discard draft**, reload, and reopen C.
   **Expect:** no pending draft, with terrain and handwritten notes preserved.

### 5. Preview a journey without moving — **Pass**

1. Ensure the party is at A. Open A and choose **Set as journey start**.
   Open D and choose **Travel here**.
2. **Expect:** a straight route A → B → C → D, zero travelled, three remaining hexes,
   and `18 mi` remaining. No token moves, hex becomes explored or draft is generated.
3. Leave **Hours per hex** blank. **Expect:** distance is shown and time remains unset.
4. Enter `1.5`. **Expect:** `4.5` hours estimated. Enter `0` and then a negative number.
   **Expect:** a validation message and no invalid time estimate or movement.
5. Restore `1.5`, pan and zoom, then close the hex panel.
   **Expect:** the route stays aligned to hex centres and journey controls remain available.
6. Dismiss the preview. Preview A → A. **Expect:** zero moves; **Start journey** is
   disabled. Preview A → D again and enter `1.5` in **Hours per hex** for the next case.

### 6. Travel one hex at a time and record arrivals — **Pass**

1. Start a **Session Journal** and enable **Record map moves**. Turn fog and solo
   play on. Ensure B, C and D are marked unexplored before starting.
2. Choose **Start journey**. **Expect:** the party stays at A; **Next hex** is available.
3. Choose **Next hex** once. **Expect:** the party moves to B's centre, its vision
   reveals fog, B becomes **Explored**, B's panel opens, and progress reads one of three
   hexes travelled with `12 mi` and `3` hours remaining.
4. Inspect the journal. **Expect:** one movement entry and one first-exploration entry
   for B, with no duplicate of either. No discovery is generated automatically.
5. Dismiss the Explore offer with **Not now**. **Expect:** B remains explored and no
   discovery draft is created.
6. Enter `QA: arrival at B` in B's notes, then immediately choose **Next hex**.
   **Expect:** the party moves only to C, progress becomes two of three, and the
   newly typed note belongs to B rather than C.
7. Choose **Next hex** once more. **Expect:** the party reaches D, **Arrived** appears,
   and no further step is offered. Dismiss the journey.
8. Review the journal. **Expect:** one movement and one first-exploration entry per
   arrival. Revisit B on a new journey: another movement entry, no repeated
   first-exploration entry unless B was explicitly marked unexplored again.

### 7. Stop and reload — **Pass**

1. Preview a route of at least two steps from the party's current position. Start it
   and take one step. Record the arrival's label and current progress.
2. Choose **Stop journey**. **Expect:** the remaining route disappears; the completed
   move, fog reveal, exploration and journal entries remain.
3. Reload and reopen the arrival hex. **Expect:** saved hex data remains and no active
   journey is restored. Token persistence follows the map/session's normal behaviour.
4. Turn Hex Crawl mode off, apply, then turn it back on.
   **Expect:** the panel/overlay disappear while off; saved hex data returns when on.

### 8. Guard grid changes — **Pass**

1. With saved hex records present, change hex size in **Grid Settings** and apply.
   **Expect:** a confirmation naming how many hex records are affected.
2. Choose **Cancel**. **Expect:** the original geometry and records remain.
3. Repeat and confirm **Change grid**. **Expect:** the geometry changes deliberately;
   an active journey cannot continue against the old geometry. Records are not silently
   repositioned to compensate for the new grid.
4. On the second map, with no hex records, change grid size.
   **Expect:** no hex-record warning. Apply a square grid: Hex Crawl mode is unavailable.

## Additional regression checks

### 9. Journey eligibility and interruption

1. Preview a route without any eligible party token, using an explicit starting hex.
   **Expect:** preview works but Start is disabled with an explanation.
2. Add two eligible party tokens. Choose each through **Party token** and preview
   again. **Expect:** the intended token is used; a token outside an explicit origin
   cannot start there and is not teleported to it.
3. Start a journey, then move its party token manually to another hex.
   **Expect:** the next step is blocked and asks for a new plan.
4. On fresh journeys, separately lock/remove the token, change map measurement,
   switch maps, disable Hex Crawl mode, and enter Player View.
   **Expect:** each change prevents stale steps; no movement or hex write is redirected
   to the new map. Returning does not silently resume the invalid route.
5. Attempt a rapid double-click of **Next hex** while the first move is still pending.
   **Expect:** the pending action does not queue an extra move. Ordinary later clicks
   after completion remain valid steps.

### 10. Solo, fog and journal switches

1. With solo on, manually drag the party into an unexplored hex.
   **Expect:** its destination is explored and one Explore offer appears. Hexes merely
   crossed during the drag are not automatically explored.
2. Repeat a journey with solo off, then with fog off.
   **Expect:** stepping and exploration still work without requiring solo fog.
3. Disable **Record map moves**, then take a step during an active journal.
   **Expect:** neither a movement entry nor a hex-exploration entry; both use the map-moves
   capture setting. Re-enable it and confirm both are recorded on a new arrival.
4. End the journal and step again. **Expect:** travel works without creating journal entries.

### 11. AI discovery and cancellation — requires an AI connection

1. Enable AI and Explore a forest hex within two hexes of Millbrook.
   **Expect:** a first-use disclosure must be acknowledged before generation; the draft
   has six **AI-drafted** parts and uses terrain and relevant nearby context.
2. Explore another hex. **Expect:** the dismissed disclosure is remembered on this device.
3. Start generation and choose **Cancel** before it finishes. Repeat by changing the
   selected hex, then by leaving the map during generation.
   **Expect:** late responses do not create a draft or change notes on either hex/map.
4. With a deliberately failed discovery request, check **Try again**, then
   **Roll on terrain tables**. **Expect:** an understandable error and a working rolled
   fallback, with handwritten notes preserved.
5. When a draft proposes **The Ash Wardens**, save its faction presence.
   **Expect:** a case-insensitive exact-name match links the existing faction rather
   than creating a duplicate. For an unmatched name, exercise **Create faction**.
6. Save another landmark with its proposed relationship unchecked.
   **Expect:** the entity is saved without that relationship.

For repeatable AI quality evaluation, use the ten grounding fixtures in
[hex-grounding-hexes.ts](../apps/web/tests/fixtures/hex-grounding-hexes.ts): target
terrain references in 10/10 drafts and nearby context in at least 5/6 applicable drafts.
Record model and counts; a single good draft is not that evaluation.

### 12. GM, player and guest privacy — requires a second browser/session

1. Host a live VTT session and join as a player in another browser/profile. Step a
   journey as GM. **Expect:** ordinary token/fog updates reach the player, but hex notes,
   terrain icons, exploration markers, drafts, route and journey controls do not.
2. Enter Player View as GM and try empty-hex clicks and hex navigation.
   **Expect:** no GM hex panel or journey controls. Return to GM view to continue.
3. Publish a test world containing the map and open its guest link.
   **Expect:** no hex notebook, discovery or journey controls. Inspect the actual guest
   bundle and VTT payloads: neither contains `hexCrawl` data or transient journey state.

### 13. Persistence, layout and accessibility

1. Export/restore the test campaign through its supported backup flow. If sync is
   configured, also open it on a second device. **Expect:** grid geometry, terrain,
   notes, explored states and pending drafts travel with the map; unfinished routes do not.
   Terrain-icon visibility remains a device preference.
2. Repeat panel opening, a three-step journey and invalid-coordinate entry on a
   **Hex (Flat)** map. Check low/high zoom and panning.
   **Expect:** correct centres, distances, fog and overlay alignment in both orientations.
3. Repeat at a phone-sized viewport (approximately 390 × 844).
   **Expect:** the panel is usable as a bottom sheet, controls stay within the viewport,
   and Next/Stop and discovery actions remain reachable.
4. Repeat the key actions with keyboard only, then with a screen reader if available.
   **Expect:** labelled controls, visible focus, Escape/focus return, understandable
   progress/error announcements and no information conveyed solely through colour.
5. Check **Fantasy Dark**, **Modern Light** and **Cyberpunk** themes.
   **Expect:** readable notes, status badges, route markers and focus indicators.
6. Search Help for `hex crawl`. **Expect:** the Hex Crawl Mode article covers discovery
   and journeys. Dismiss the first-use panel hint and reopen: it stays dismissed.

### 14. Failure recovery and scale — developer-assisted

These need controlled fixtures or fault injection. Do not simulate a storage failure
by deleting live campaign data. Mark blocked if the required setup is unavailable.

1. Inject a failed arrival save after a journey token has moved.
   **Expect:** progress reflects that completed move, further stepping is blocked, and
   **Retry arrival save** appears. Retry after restoring storage: it saves only the
   pending arrival, without moving again or duplicating the movement journal entry.
2. Inject movement refusal and then movement that snaps to an unexpected hex.
   **Expect:** refusal leaves progress unchanged; an unexpected arrival blocks further
   travel and requires replanning rather than claiming the planned arrival succeeded.
3. Delay a step and Stop or switch maps while it completes.
   **Expect:** committed movement is retained, no next step is queued, and completed
   writes belong to the original map with no stale panel opened on the new map.
4. Seed a disposable map with 2,000 hex records. Measure click-to-panel and pan/zoom.
   **Expect:** panel opens within the 500 ms target; offscreen records do not all render
   as overlay elements. Record machine/load and timing rather than guessing from feel.
5. Preview routes at 1,000 and 1,001 steps using an appropriate fixture.
   **Expect:** the bounded route is accepted; the longer route is rejected with a useful
   message before allocating/rendering an unbounded route.

## Optional automated support

Existing focused tests support the manual run; this document does not claim they
have been executed. From the repository root:

```sh
bun run --filter hex-crawl-engine test
```

From `apps/web`, use the repository's Playwright configuration and prerequisites:

```sh
bunx playwright test tests/hex-crawl.spec.ts tests/hex-journey.spec.ts
```

The existing browser tests cover offline preparation/discovery, grid persistence and
guards, navigation, journey preview/stepping, Stop/reload, host VTT mode and Player View.
They do not replace a real connected-player/guest privacy check or a live AI run.

## Finish the run

- Record every case result; link failures and state any blocked external setups.
- Core cases 1–8 must pass. For release sign-off, resolve or explicitly accept failures
  in the applicable additional checks; do not treat an unrun scenario as verified.
- Confirm no handwritten notes were overwritten, no completed step was repeated, and
  no GM-only hex data reached players or guests.
- Keep the disposable campaign if a failure needs reproduction; otherwise remove the
  QA campaign and any test publication/session when testing is complete.

## References

- [Hex Crawl Mode help](../apps/web/src/lib/content/help/hex-crawl-mode.md)
- [Original hex crawl quickstart](../specs/178-hex-crawl-mode/quickstart.md)
- [Hex Journey plan](./plans/4148-hex-journey-mode/plan.md)
- [Solo Map Play quickstart](../specs/171-solo-map-play/quickstart.md)
