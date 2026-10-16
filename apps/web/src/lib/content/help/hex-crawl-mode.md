---
id: hex-crawl-mode
title: Hex Crawl Mode
description: "Run hex crawls on a hex grid. Track terrain, notes, explored hexes and what lies in each hex, with AI drafts or offline terrain tables."
tags:
  [
    hex crawl,
    hexcrawl,
    hex,
    overland,
    exploration,
    terrain,
    fog of war,
    discovery,
    travel,
    solo,
  ]
rank: 5
---

## Hex Crawl mode in brief

**Hex Crawl mode** adds a notebook to every hex on a hex grid. You can record terrain, write notes, mark hexes as explored, and draft what lies in a hex. Turn it on per map, in the grid settings. It only works on maps with a hex grid.

Only the Game Master sees any of it. Players and guests never see hex notes, terrain, drafts or explored markers.

## Turning on Hex Crawl mode

1. Open the map and open **Grid Settings**. You can do this with the VTT open or closed, so you can prepare a map before a session.
2. Choose **Hex (Pointy)** or **Hex (Flat)** as the grid type. The Hex Crawl mode switch only appears for hex grids.
3. Turn on **Hex Crawl mode**.

Turning Hex Crawl mode off keeps your hex data. Turning it back on brings it all back. Hex data is saved with the map, so it travels with the campaign, sync, backup, restore and export.

To show terrain icons on the map, turn on **Terrain icons** in the map display options. They are off by default, and the setting is remembered on this device only.

## The hex panel

Click a hex on the map where there is no pin or token, and the hex panel opens for that hex. Clicking a pin or token still does what it did before.

The panel shows, from top to bottom:

- **The hex label**, in your map's label style, with its state (Unknown, Seen or Explored).
- **Explore**, the main action. Use **Review discovery** if a draft is waiting.
- **Terrain**, a picker with nine presets and a custom option.
- **Your notes**, a text box for your own notes.
- **AI-drafted**, a separate section for AI text, shown only when there is some.
- **In this hex**, the entities pinned here, with **Attach entity** and **Create entity here**.
- **Mark explored** or **Mark unexplored**, at the bottom.

On a desktop the panel floats beside the map. On a phone it slides up from the bottom. Press **Escape** to close it. Focus goes back to whatever opened it.

## Terrain and notes

Pick a terrain for the hex: plains, forest, hills, mountains, swamp, desert, water, coast or tundra. For anything else, choose **Custom…** and type a name of up to 40 characters. **Clear** removes the terrain.

Notes are free text. Write what you like about the hex: a ford that floods, a ruin with a cult in it, a good view. A hex keeps its record only while it has something in it. Clearing the terrain, the notes and the other details removes the record again.

## Attaching and creating entities

Entities pinned to a hex are listed under **In this hex**. Entities pinned before Hex Crawl mode was turned on also appear here. Choose one to open it.

- **Attach entity** searches your vault. Choose an entity to pin it at the centre of the hex.
- **Create entity here** asks for a type and a title, then creates the entity, pins it at the hex centre and opens it.

## Go to hex and This hex

**Go to hex** is in the map controls. Type a hex coordinate in your map's label style, such as `B03` or `01.04`, and press **Go**. The map centres on that hex and its panel opens. If the coordinate is not on the map, you see a short message and nothing opens.

**This hex** is in the token and pin menus. Select a token or pin, then choose **This hex** to open the panel for the hex it stands in.

## Unknown, Seen and Explored

Every hex is in one of three states:

- **Unknown** means the hex is hidden by fog of war and has not been explored.
- **Seen** means the hex is showing through the fog, but nobody has been there.
- **Explored** means the party has been there, or you marked it explored by hand.

A hex counts as Seen when its centre is uncovered by fog. With fog off, every hex counts as Seen. Explored hexes stay explored when you fog them again.

When a party token ends a move in a hex, that hex becomes Explored and the time is kept. Only the hex where the move ends counts, so a path across the map does not explore every hex it crosses. You can also mark any hex explored or unexplored by hand in the panel.

Explored hexes show a small marker on the map, for you only. Each time a hex becomes Explored, the session journal records it with the hex label and terrain, using your usual journal settings.

## Exploring a hex

**Explore** drafts what is in a hex. The draft has six parts:

- **Landmark**: a place or feature worth finding.
- **Encounter**: something that happens or waits there.
- **Hazard**: a danger in the hex.
- **Secret**: something hidden.
- **Faction presence**: which faction holds sway here.
- **Atmosphere**: how the hex feels.

Each part has a source badge, **AI-drafted** or **Rolled**. For each part you can:

- **Keep** it, or **Save** it. A landmark is saved as a location and an encounter as an event by default, or as a note if you choose. Saved entities are AI-drafted and pinned at the hex centre.
- **Regenerate** it. The other parts stay as they are.
- **Discard** it.

A landmark or encounter saves with a proposed link to the nearest location within two hexes. The link is ticked by default and is only created if it is still ticked when you save.

Faction presence links to the faction whose name matches exactly, ignoring capitals. If there is no such faction, you can create one. Hazard, secret and atmosphere are added to **AI-drafted** notes. They never change **Your notes**.

A draft stays on its hex, saved with the map, until every part is saved or discarded. Reopen the hex and you see the draft again. **Discard draft** removes all of it. **Cancel** stops a discovery in progress, and nothing is saved.

### What is sent to the AI service

Exploring sends this hex's terrain, notes and nearby lore to the AI service. Your full vault is never sent. Nearby lore means the hexes within two steps, the nearest locations and factions, the map's region, the entities already in the hex, and the campaign's basic context, all kept to a small size.

Explore only sends anything when you ask for it, with AI enabled. The first time you explore with AI on, a short notice tells you this. Dismissing it is remembered on this device.

### AI Disabled and terrain tables

With **AI Disabled** turned on in Settings, Explore rolls on built-in terrain tables instead. You get the same six parts and can review and save them the same way. Custom terrain has no tables of its own, so general tables are used, and the panel tells you so. If an AI draft fails, you see a plain message with **Try again** and **Roll on terrain tables**.

Explore is not available in a guest vault.

## Hex crawling solo

In solo play, with Hex Crawl mode on, the party moving into an unexplored hex offers Explore. The offer appears near the travel readout with **Explore** and **Not now**.

The offer never starts on its own. **Not now** dismisses it and generates nothing. The hex stays Explored either way.

## Your hex grid travels with the map

The grid is saved with the map: type, size, offsets and label style. Maps that were set up on an older version keep their grid, and it is saved with the map the first time you open it.

Hex records are placed on the grid. If you change the grid type or size, or move the map or refit the grid while there are hex records, the app asks first. The question says how many hex records would no longer line up with their hexes. **Cancel** leaves the grid as it was. **Change grid** applies the change. The app asks once for each session of changing the grid.

## Players and guests never see hex notes

Players and guests never see hex notes, terrain, drafts or explored markers. Connected players see the map and fog as they always have, and guest vaults and published bundles leave hex data out.
