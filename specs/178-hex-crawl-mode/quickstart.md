# Quickstart: validating Hex Crawl Mode

How to prove the feature works end to end. Details of each interface are in [contracts/](./contracts/) and [data-model.md](./data-model.md). This guide only says what to run and what you should see.

## Prerequisites

- On branch `178-hex-crawl-mode`, with `bun install` done.
- A test vault containing:
  - a map with an image;
  - a location entity ("Millbrook") and a faction entity ("The Ash Wardens");
  - a token for the party, marked as a vision source.
- For the AI scenarios, an AI connection (system proxy or a personal key). For the offline scenarios, turn **AI Disabled** on in Settings.

## Automated checks (impacted only, per AGENTS.md)

```sh
# Engine and touched packages
bun run --filter hex-crawl-engine test
bun run --filter map-engine test           # parseHexLabel
bun run --filter session-journal-engine test   # formatHexExplored
bun run --filter vault-engine test         # GuestExporter strips hexCrawl

# Web: changed files only
bun scripts/test-changed.mjs
bun scripts/lint-changed.mjs
(cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
```

**Expected:** all pass, including these named contract tests:

- the engine pairs listed in `contracts/hex-crawl-engine-api.md`;
- "guest export never contains hexCrawl";
- "VTT snapshot never contains hexCrawl";
- "model runner not called when AI disabled or guest";
- "discovery never writes notes".

## Manual scenarios

### 1. Grid travels with the map (US5)

1. Open the map, enable a pointy hex grid, and fit it.
2. Reload the app. **Expected:** identical grid.
3. Open DevTools → Application → `.codex/maps.json` (or export the vault). **Expected:** the map has `grid` with type, size, offsets and labels.
4. Clear this site's `localStorage`, then reload. **Expected:** the grid is still identical, read from the map.

### 2. Hex panel basics (US1)

1. Turn on **Hex Crawl mode**. **Expected:** the switch is only offered on the hex map, not on a square-grid map.
2. Click an empty hex (don't drag). **Expected:** the panel opens with label, state, terrain, notes and "In this hex".
3. Drag the map instead. **Expected:** it pans, and the panel does not open.
4. Set terrain to **Forest**, write a note, and use **Attach entity** with Millbrook. **Expected:** a pin appears at the hex centre and Millbrook is listed.
5. Use **Create entity here** to make a character. **Expected:** it is created, pinned and listed.
6. Reload. **Expected:** everything is still there.

### 3. States and markers (US2)

1. With fog on, reveal a hex. **Expected:** its panel says **Seen**.
2. Drag the party token into it and release. **Expected:** **Explored**, a subtle marker on the hex, and a journal entry "Explored hex … (forest)".
3. Re-fog that hex. **Expected:** it is still **Explored**.
4. Open Player View. **Expected:** no markers, no terrain icons, no panel.

### 4. Discovery with AI (US3)

1. In an unexplored hex two hexes from Millbrook, choose **Explore**. **Expected:** a one-time AI notice, then a six-part draft that mentions forest terrain and Millbrook or its surroundings.
2. **Regenerate** the encounter. **Expected:** only the encounter text changes.
3. **Discard** the hazard. **Save** the landmark with "Link to Millbrook" ticked. **Expected:** a draft location labelled `hex-crawl-discovery` and `ai-drafted`, pinned in the hex and linked to Millbrook.
4. Close the panel with the secret still pending, then reload and reopen the hex. **Expected:** the same draft with the secret pending (FR-033a).
5. Add the secret to AI notes. **Expected:** it appears under **AI-drafted**, and **Your notes** is unchanged.
6. Start **Explore** on another hex and press **Cancel** while it generates. **Expected:** nothing is saved.

### 5. Discovery offline (US3)

1. Turn on **AI Disabled**, then **Explore** a mountain hex. **Expected:** a draft in under 1 second, with parts badged **Rolled**.
2. Set a custom terrain "Glass dunes" and **Explore**. **Expected:** a draft plus the message that general tables were used.

### 6. Solo offer (US4)

1. Turn on solo play. Move the party into an unexplored hex. **Expected:** an inline "Explore this hex?" offer. **Not now** generates nothing. **Explore** opens the draft.

### 7. Grid-change guard (US5)

1. With hex records on the map, open grid settings and change the size. **Expected:** a confirmation naming the record count. **Cancel** restores the size.
2. On a map with no hex records, change the size. **Expected:** no confirmation.

### 8. Keyboard (FR-003c)

1. Tab to **Go to hex**, type a label shown on the map, and press Enter. **Expected:** the map centres and the panel opens with focus inside it. Esc closes it and returns focus to the field.
2. Type a label that doesn't exist. **Expected:** a plain message, and nothing opens.
3. Select the party token and choose **This hex**. **Expected:** that hex's panel opens.

### 9. Guests and published worlds (privacy)

1. Publish the world with the map player-visible, then open the guest link. **Expected:** the map and fog only. No panel, markers or terrain. The downloaded bundle JSON has no `hexCrawl`.
2. Start a live session and join as a player. **Expected:** the same. Network snapshots contain no `hexCrawl`.

## Done when

- All automated checks pass.
- Scenarios 1–9 match the expected results.
- The Help article and hint exist (FR-044, FR-045).
- `bunx fallow audit` passes before commit.
