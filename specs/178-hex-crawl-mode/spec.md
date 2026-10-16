# Feature Specification: Hex Crawl Mode

**Feature Branch**: `178-hex-crawl-mode`
**Created**: 2026-10-16
**Status**: Draft
**Input**: User description: "Hex Crawl Mode with AI discovery. Per map, the GM can enable Hex Crawl mode on hex grids. Each hex holds an exploration state (Unknown, Seen, Explored), terrain, GM-only notes and linked campaign entities. Clicking a hex opens a GM-only hex panel. An Explore action generates a hex stocking draft (landmark, encounter, hazard, secret, faction presence, atmosphere) grounded in the hex and its surroundings, which the GM reviews and saves as entities linked to the hex. AI is first-class, with guardrails and an offline fallback. Hex grid geometry moves into the vault so hex data stays aligned. Out of scope: Journey mode, pathfinding, system-specific movement rules, a full hex editor, terrain painting."
**Issue**: #4147. Epic #1957. Builds on #1951 (hex grids, spec 170) and spec 171 (solo map play).

## Context

Hex maps already work: the GM can lay a hex grid over a map, snap tokens and pins to hexes, reveal hexes from fog by hand or through party vision, and see how far the party has travelled. What a hex cannot do yet is _hold_ anything. There is nowhere to record that a hex is forest, that the party has searched it, what the GM decided lives there, or which places and people belong to it. Pins dropped on a hex map already remember which hex they are in, but nothing shows "what is in this hex".

A hex crawl is played hex by hex: the party sees a hex before they reach it, enters it, and finds out what is there. This feature turns each hex into a small worldbuilding container and makes that loop part of the map: **worldbuilding → map → exploration → discovery → more worldbuilding**. AI drafts what the party finds, grounded in the surrounding world, and the GM decides what becomes canon.

One prerequisite comes first. The hex grid's geometry (grid type, size, offsets and label style) is currently remembered only on the device that set it. Hex data is tied to grid positions, so the grid has to travel with the map: to other devices, through backups and restores.

## Clarifications

### Session 2026-10-16

- Q: How do Unknown, Seen and Explored relate to fog of war? → A: Seen means the hex is revealed in the existing fog. Fog and vision behaviour do not change. Explored is set when the party ends a move in the hex, or when the GM marks it. Explored hexes get a subtle marker in the GM view.
- Q: What does Explore produce? → A: A hex stocking draft (landmark, encounter, hazard, secret, faction presence, atmosphere), reviewed part by part. The GM saves the parts they want as entities linked to the hex.
- Q: How is terrain chosen? → A: From a default list (plains, forest, hills, mountains, swamp, desert, water, coast, tundra), or a custom value the GM types.
- Q: Does AI discovery ship with the core mode or later? → A: With the core mode. AI is a selling point and a first-class part of this feature. Journey mode follows separately (#4148).
- Q: If the GM closes the hex panel or reloads before saving any part of a discovery draft, is the draft kept? → A: Yes. An unsaved draft stays on that hex, saved with the map, until the GM saves or discards it.
- Q: Which existing entity is a saved landmark or encounter connected to? → A: The nearest location pinned within 2 hexes, shown as a proposed link the GM can untick before saving. There is no "settlement" type, so any location counts.
- Q: Can the GM see each hex's terrain on the map, or only in the hex panel? → A: Both. An optional GM-only toggle, off by default, shows a small terrain icon on each hex that has a terrain.
- Q: How does a GM open a hex's panel without a mouse? → A: Two ways. A "Go to hex" field in the map controls opens the panel for a typed coordinate in the map's label style, and a "This hex" action on a selected token or pin opens the panel for the hex it is in.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Keep what each hex holds (Priority: P1)

The GM turns on Hex Crawl mode for an overland hex map. Clicking a hex opens a small panel for that hex: its label, its state, its terrain, the GM's notes, and the campaign entities that are in it. The GM can set the terrain, write notes, attach an existing entity (a village, a ruin, an NPC), or create a new entity right there. Everything stays with the map.

**Why this priority**: This is the foundation. Without a place to keep a hex's terrain, notes and contents, there is nothing to explore or discover. On its own it already gives a GM a usable hex crawl prep tool.

**Independent Test**: On a hex map, enable Hex Crawl mode, click a hex, set terrain to forest, write a note, attach an existing location and create a new character from the panel. Reload the app: the hex still shows forest, the note, and both entities.

**Acceptance Scenarios**:

1. **Given** a map with a hex grid, **When** the GM opens the map controls, **Then** a Hex Crawl mode switch is available. **Given** a map with a square grid or no grid, **Then** it is not.
2. **Given** Hex Crawl mode is on, **When** the GM clicks a hex that has no pin or token under the cursor, **Then** the hex panel opens for that hex, showing its coordinate label, state, terrain, notes and an "In this hex" list.
3. **Given** the hex panel is open, **When** the GM chooses a terrain from the list or types a custom terrain, **Then** the hex keeps that terrain.
4. **Given** the GM turns on the terrain icons toggle, **Then** every hex with a terrain shows a small icon for it on the map in the GM view. Custom terrains share one generic icon. With the toggle off (the default), no terrain icons are shown.
5. **Given** the hex panel is open, **When** the GM attaches an existing entity, **Then** a pin for that entity is placed at the centre of the hex and the entity appears in "In this hex".
6. **Given** the hex panel is open, **When** the GM chooses Create entity here and saves the new entity, **Then** it is pinned at the hex centre and listed in "In this hex".
7. **Given** a pin was dropped on the map into a hex before Hex Crawl mode was turned on, **When** the GM opens that hex's panel, **Then** the pinned entity is listed in "In this hex".
8. **Given** the GM clicks on a pin or token, **Then** the existing pin or token behaviour happens, not the hex panel.
9. **Given** Hex Crawl mode is on, **When** the GM types a coordinate in the map's label style into Go to hex, **Then** the map centres on that hex and its panel opens. **When** the coordinate does not exist on the grid, **Then** the GM is told plainly and nothing opens.
10. **Given** a token or pin is selected on a hex map in Hex Crawl mode, **When** the GM chooses This hex, **Then** the panel opens for the hex it stands in.
11. **Given** a GM using only the keyboard, **Then** they can open a hex panel, reach every control in it, and close it to return focus to where they were.

---

### User Story 2 - See what the party has explored (Priority: P1)

As play goes on, the GM can tell at a glance which hexes are still unknown, which the party has seen from a distance, and which they have actually explored. When the party token stops in a hex, that hex becomes explored. The GM can also mark or unmark hexes by hand.

**Why this priority**: Exploration state is what makes a map a hex crawl rather than a gridded picture. It is also what decides where Explore is offered.

**Independent Test**: On a hex map in Hex Crawl mode with fog on, reveal a hex: its panel says Seen. Move the party token into it and end the move: the panel says Explored and the hex shows the explored marker. Mark another hex explored by hand, then unmark it.

**Acceptance Scenarios**:

1. **Given** a hex is still hidden by fog and is not explored, **Then** its state is Unknown.
2. **Given** a hex is revealed in the fog and is not explored, **Then** its state is Seen. Fog and party vision reveal hexes exactly as they do today.
3. **Given** the party token ends a move in a hex during solo or VTT play, **Then** that hex becomes Explored and the time it was explored is kept.
4. **Given** the hex panel is open, **When** the GM marks the hex explored or unexplored, **Then** its state changes accordingly.
5. **Given** a hex is Explored, **Then** it shows a subtle explored marker in the GM view, and players' view is unchanged.
6. **Given** fog is turned off for the map, **Then** every hex that is not explored counts as Seen.
7. **Given** a hex becomes Explored, **Then** the session journal records it with the hex label and terrain, using the existing journal capture.

---

### User Story 3 - Find out what is in a hex (Priority: P1)

When the party reaches a hex the GM has not prepared, the GM clicks Explore. A discovery draft appears: a landmark, an encounter, a hazard, a secret, which faction holds sway, and the atmosphere. It is grounded in the hex's terrain, the hexes around it, nearby places and factions, the region, and the campaign itself. The GM keeps, regenerates or discards each part and saves the parts worth keeping as entities linked to that hex.

**Why this priority**: This is the loop that makes hex crawling with Codex Cryptica different: the world grows during play, connected to what already exists. AI is a central selling point of the product, so it ships with the core mode.

**Independent Test**: In a campaign with a village (a location) pinned two hexes away, open an unexplored forest hex and choose Explore. The draft refers to forest and to the nearby village or its region. Regenerate the encounter only, discard the hazard, save the landmark as a location with the proposed link to the village left ticked. The new location is pinned in the hex and connected to the village. Repeat with AI disabled: a draft is still produced, from terrain tables.

**Acceptance Scenarios**:

1. **Given** a hex in the panel is not explored, **Then** Explore is a prominent action in the panel.
2. **Given** the GM chooses Explore with AI enabled, **Then** a discovery draft is produced with a landmark, encounter, hazard, secret, faction presence and atmosphere, drawing on the hex's terrain, its neighbours within two hexes (their terrain, whether they are explored, and the entities in them), the nearest locations and factions, the map's region entity if any, and the campaign context.
3. **Given** a draft is shown, **When** the GM regenerates one part, **Then** only that part changes.
4. **Given** a draft is shown, **When** the GM discards a part, **Then** it is removed from the draft and nothing is saved for it.
5. **Given** a draft is shown, **When** the GM saves the landmark, **Then** it becomes a location entity pinned at the hex centre. If a location is pinned within 2 hexes, the nearest one is shown as a proposed link before saving; the GM can untick it, and the link is only created if it stays ticked. Saving the encounter creates an event or note entity in the same way. Saving faction presence, when the draft names a faction that exists, links that faction to every entity saved from this hex's discoveries, and adds a "Faction presence" line to the hex's AI-drafted notes section. When the named faction does not exist, the GM is offered to create it first.
6. **Given** the hex already has GM notes, **When** discovery text is added to the hex, **Then** the GM's notes are left untouched and the discovery text is added in the hex's AI-drafted notes section, kept separate from the GM's notes and clearly marked.
7. **Given** an entity or note was created from a discovery draft, **Then** it is marked as AI-drafted.
8. **Given** AI is disabled or unavailable, **When** the GM chooses Explore, **Then** a draft is produced by rolling on terrain-based random tables, and the GM can review and save it in the same way.
9. **Given** the vault is a guest vault, **Then** Explore is not offered.
10. **Given** AI is enabled, **Then** before the first discovery the GM is told what will be sent to the AI service, worded the same way as Generate Related.
11. **Given** the GM closes the panel or cancels while a draft is being generated, **Then** generation stops and nothing is saved.
12. **Given** a finished draft has parts that are neither saved nor discarded, **When** the GM closes the panel, reloads, or opens the campaign on another device, **Then** reopening that hex shows the same draft, in the same state, until each part is saved or discarded.

---

### User Story 4 - Explore while playing solo (Priority: P2)

In solo play the GM is also the party. When the party token enters a hex nobody has explored yet, the map offers to explore it, so the solo player gets the "what do we find?" moment without breaking the flow. It is always an offer, never automatic.

**Why this priority**: Solo play is a growing use of Codex Cryptica (specs 171 to 174), and discovery is most valuable there because there is no one else to prepare the world. It depends on stories 2 and 3.

**Independent Test**: In solo play, move the party token into an unexplored hex. An offer to explore appears. Accepting opens the discovery draft for that hex. Dismissing it leaves the hex Explored with no draft.

**Acceptance Scenarios**:

1. **Given** solo play is on and Hex Crawl mode is on, **When** the party token ends a move in a hex that was not explored before, **Then** an offer to explore that hex appears.
2. **Given** the offer appears, **When** the GM accepts, **Then** the discovery draft for that hex opens.
3. **Given** the offer appears, **When** the GM dismisses it or keeps moving, **Then** nothing is generated.
4. **Given** solo play is off, **Then** no offer appears when the party enters a hex.

---

### User Story 5 - Keep hex data safe across devices and grid changes (Priority: P2)

A GM preps a hex crawl on a laptop and runs it from a tablet, or restores the campaign from a backup. The grid lines up the same way everywhere, so every hex's terrain, notes and contents stay on the right hex. If the GM later changes or re-fits the grid on a map that already has hex data, they are warned first.

**Why this priority**: Without it, hex data could silently end up on the wrong hexes. It is a prerequisite for trusting stories 1 to 4, but it is invisible when everything goes right.

**Independent Test**: Set up a hex grid and hex data on one device, then open the same campaign on another device or restore it from a backup: the grid matches and the hex data sits on the same hexes. Then change the grid size: a confirmation says how many hex records would no longer line up. Cancelling leaves the grid as it was.

**Acceptance Scenarios**:

1. **Given** the GM sets up a hex grid on a map, **Then** the grid's type, size, offsets and label style are saved with the map in the campaign.
2. **Given** a map whose grid was set up before this feature and is remembered only on this device, **When** the map is opened on that device, **Then** the grid looks exactly as before and is saved with the map from then on.
3. **Given** a campaign is opened on another device or restored from a backup, **Then** each map's hex grid matches the original and hex data appears on the same hexes.
4. **Given** a map has hex records, **When** the GM changes the grid type, size or offsets, or re-fits the grid, **Then** a confirmation states how many hex records would no longer line up, and cancelling leaves the grid unchanged.
5. **Given** a map has no hex records, **When** the GM changes the grid, **Then** no confirmation is shown.
6. **Given** display preferences such as grid visibility and colours, **Then** they stay per device, as they are today.

---

### User Story 6 - Learn how hex crawling works (Priority: P3)

A GM who has not used Hex Crawl mode can find out what it does and how to use it from Help, and gets a short hint the first time they click a hex.

**Why this priority**: Required by the project's documentation principle and important for discovery of the feature, but it does not change what the feature can do.

**Independent Test**: Search Help for "hex crawl" and find an article explaining the mode, states, the hex panel, Explore and its AI and offline behaviour. Turn on Hex Crawl mode and click a hex for the first time: a hint explains the panel, and it does not appear again once dismissed.

**Acceptance Scenarios**:

1. **Given** the Help system, **Then** it explains Hex Crawl mode, the three states, the hex panel, attaching and creating entities, Explore, what is sent to the AI service, the offline fallback, and that players never see hex notes.
2. **Given** the GM clicks a hex in Hex Crawl mode for the first time, **Then** a short hint explains the hex panel. Once dismissed, it does not reappear.

---

### Edge Cases

- **Several pins in one hex**: all of their entities are listed in "In this hex". A pin for an entity that has since been deleted is not listed.
- **A pin dragged from one hex to another**: it moves to the other hex's "In this hex" list.
- **A hex at the edge of the party's vision**: it is Seen only when its centre is revealed. A hex whose edge is partly revealed but whose centre is not stays Unknown.
- **The GM hides a hex again under fog after it was explored**: it stays Explored. Explored is a record of what the party has done, not of what is currently visible.
- **The party token passes through hexes during one move**: only the hex where the move ends becomes Explored.
- **More than one party token**: a hex becomes Explored when any token that counts as part of the party ends a move in it.
- **Turning Hex Crawl mode off**: hex data is kept and comes back when the mode is turned on again. The explored markers and the hex panel are hidden while it is off.
- **No locations or factions within 2 hexes**: discovery still works, grounded in terrain, neighbours, region and campaign context. No link is proposed when saving.
- **Two locations at the same distance**: the one proposed is chosen consistently (the same one every time for the same map state), and the GM can untick it.
- **Discovery fails or times out with AI enabled**: the GM is told plainly and can retry, or roll on terrain tables instead. Nothing is saved.
- **A custom terrain with no matching random table**: the offline fallback uses general tables and says so.
- **Choosing Explore on a hex that still has an unsaved draft**: the existing draft is shown instead of generating a new one. The GM can discard it to start a fresh one.
- **Generating a second draft for a hex that already has saved discoveries**: the new draft knows what is already there and avoids repeating it. Previously saved entities are never changed.
- **The grid is changed after confirming the warning**: the hex records stay keyed to their old positions, so they now sit on whichever hexes share those positions. The GM was told how many records are affected. This feature does not try to move them.
- **Players connected to a live session**: they never see the hex panel, hex notes, terrain values, discovery drafts or explored markers. They see fog as they do today.
- **A guest vault**: the hex panel, hex data, editing and Explore are not offered. Guests see the map and fog as they do today.
- **Go to hex when coordinate labels are hidden or the label style is "none"**: Go to hex still accepts the map's default coordinate format, and the panel shows the coordinate in that format.
- **A very large map**: only hexes the GM has touched keep a record, so a mostly untouched map adds almost nothing to the campaign.

## Requirements _(mandatory)_

### Functional Requirements

**Hex Crawl mode**

- **FR-001**: The GM MUST be able to turn Hex Crawl mode on and off per map. The switch MUST only be offered on maps with a hex grid.
- **FR-002**: Turning Hex Crawl mode off MUST NOT delete hex data. Turning it on again MUST restore it.

**Hex panel and hex data**

- **FR-003**: In Hex Crawl mode, clicking a hex where there is no pin or token MUST open a hex panel for that hex. Clicking a pin or token MUST keep its existing behaviour.
- **FR-003a**: In Hex Crawl mode the map controls MUST offer Go to hex, which accepts a coordinate in the map's current label style, centres the map on that hex and opens its panel. An unknown or invalid coordinate MUST produce a plain message and open nothing.
- **FR-003b**: When a token or pin is selected in Hex Crawl mode, a This hex action MUST open the panel for the hex it stands in.
- **FR-003c**: The hex panel and its entry points MUST be fully usable with the keyboard alone. Closing the panel MUST return focus to the control that opened it.
- **FR-004**: The hex panel MUST show the hex's coordinate label in the map's chosen label style, its state, its terrain, the GM's notes, and an "In this hex" list.
- **FR-005**: The GM MUST be able to set a hex's terrain to one of plains, forest, hills, mountains, swamp, desert, water, coast or tundra, or to a custom value, and to clear it.
- **FR-005a**: The GM MUST be able to turn terrain icons on the map on and off. The toggle MUST be off by default and remembered per device, like other display preferences. When on, each hex with a terrain MUST show a small icon for it in the GM view. Custom terrains MUST use one generic icon. Terrain icons MUST NOT appear in the view of connected players or guests.
- **FR-006**: The GM MUST be able to write and edit free-text notes for a hex.
- **FR-007**: "In this hex" MUST list every entity pinned in that hex, including pins placed before Hex Crawl mode existed or was turned on, and MUST open the entity when chosen.
- **FR-008**: The GM MUST be able to attach an existing entity to a hex from the panel. This MUST place a pin for the entity at the hex centre.
- **FR-009**: The GM MUST be able to create a new entity from the panel. Once saved, it MUST be pinned at the hex centre.
- **FR-010**: Hex data MUST be saved with the map in the campaign, so it is included in sync, backup, restore and export wherever the map is.
- **FR-011**: A hex MUST only keep a record once the GM or the party has changed something about it (terrain, notes, explored state, an unsaved discovery draft, or a saved discovery). Untouched hexes MUST NOT add data.
- **FR-012**: Existing maps and campaigns MUST keep working with no conversion step. Maps without hex data MUST behave exactly as before.

**Exploration states**

- **FR-013**: Each hex MUST have one of three states: Unknown (hidden by fog and not explored), Seen (revealed in the fog and not explored) or Explored.
- **FR-014**: A hex MUST count as revealed when its centre is revealed in the map's fog. When fog is off, every hex MUST count as revealed.
- **FR-015**: Fog of war and party vision MUST behave exactly as they do today. This feature MUST NOT add a new fog layer or change how hexes are revealed.
- **FR-016**: When a party token ends a move in a hex during solo or VTT play, that hex MUST become Explored and the time MUST be kept.
- **FR-017**: The GM MUST be able to mark a hex explored or unexplored by hand.
- **FR-018**: Explored hexes MUST show a subtle marker in the GM view. The marker MUST NOT appear in the view of connected players or guests.
- **FR-019**: When a hex becomes Explored, the session journal MUST capture it with the hex label and terrain, through the existing journal capture and with the existing capture settings respected.

**Discovery**

- **FR-020**: The hex panel MUST offer Explore prominently for any hex that is not Explored, and MUST also allow it for an Explored hex.
- **FR-021**: Explore MUST produce a discovery draft with six parts: landmark, encounter, hazard, secret, faction presence and atmosphere.
- **FR-022**: With AI enabled, the draft MUST be grounded in: the hex's terrain and notes; hexes within two steps (their terrain, explored state and the entities in them); the nearest locations and factions on the map; the map's region entity, if there is one; the entities already in the hex; and the campaign's existing context. The amount of surrounding context MUST be bounded so that large maps do not slow discovery down.
- **FR-023**: The GM MUST be able to keep, regenerate or discard each part of the draft independently. Regenerating a part MUST NOT change the others.
- **FR-024**: The GM MUST be able to save the landmark as a location entity and the encounter as an event or note entity. Each saved entity MUST be pinned at the hex centre.
- **FR-024a**: When a location is pinned within 2 hexes, saving a landmark or encounter MUST propose a link to the nearest such location, shown before saving and ticked by default. The link MUST only be created if it is still ticked when the GM saves. No link is proposed when there is no location within 2 hexes.
- **FR-025**: Saving faction presence MUST, when the draft names an existing faction (case-insensitive exact title match), link that faction to every entity saved from this hex's discoveries, both those already saved and any saved later from the same draft, and add a "Faction presence: {faction}" line to the hex's AI-drafted notes section. If no entity has been saved yet, only the notes line is added. When the named faction does not exist, the app MUST offer to create it, and then behave as above.
- **FR-026**: The hazard, secret and atmosphere MUST be savable into the hex's notes.
- **FR-027**: Discovery MUST NEVER overwrite or edit text the GM wrote. Discovery text added to a hex MUST go into the hex's AI-drafted notes section, which is stored separately from the GM's notes and clearly marked.
- **FR-028**: Entities and notes created from a discovery draft MUST be marked as AI-drafted, consistent with other AI-drafted content in the app.
- **FR-029**: A new draft for a hex that already has saved discoveries MUST take what is already there into account and avoid repeating it. It MUST NOT change entities that were saved earlier.
- **FR-030**: With AI disabled or unavailable, Explore MUST still produce a draft by rolling on terrain-based random tables, and the GM MUST be able to review and save it the same way. For a custom terrain with no matching tables, general tables MUST be used and the GM told so.
- **FR-031**: Before the first discovery with AI enabled, the GM MUST be told what will be sent to the AI service, using the same wording and setting as Generate Related.
- **FR-032**: Explore MUST NOT be offered in a guest vault.
- **FR-033**: Closing the panel or cancelling MUST stop a discovery in progress, and nothing MUST be saved.
- **FR-033a**: A finished draft that has not been fully saved or discarded MUST stay on its hex, saved with the map, and MUST be shown again when the hex is reopened. The draft MUST be removed once every part is saved or discarded, or when the GM discards the whole draft.
- **FR-034**: If discovery fails, the GM MUST be told in plain language and offered a retry and the terrain-table fallback.

**Solo play**

- **FR-035**: In solo play with Hex Crawl mode on, when the party token ends a move in a hex that was not explored before, the app MUST offer to explore it. It MUST NEVER start discovery automatically.
- **FR-036**: Dismissing the offer or continuing to move MUST leave the hex Explored and generate nothing.

**Grid geometry**

- **FR-037**: A map's hex grid geometry (grid type, size, horizontal and vertical offsets, and label style) MUST be saved with the map in the campaign.
- **FR-038**: For a map whose grid is remembered only on this device, the app MUST use that grid unchanged and save it with the map, with no visible change for the GM.
- **FR-039**: When a map has hex records and the GM changes the grid type, size or offsets, or re-fits the grid, the app MUST first ask for confirmation, stating how many hex records would no longer line up. Cancelling MUST leave the grid unchanged.
- **FR-040**: Grid display preferences (grid visibility, grid and fog colours, coordinate labels shown or hidden, terrain icons shown or hidden) MUST remain per device.

**Visibility and privacy**

- **FR-041**: The hex panel, hex notes, terrain values and icons, discovery drafts and explored markers MUST be visible to the GM only. Connected players and guests MUST only see the map and fog as they do today.
- **FR-042**: Nothing about Hex Crawl mode, the hex panel or discovery MUST be tracked, measured or reported off the device.
- **FR-043**: Hex data MUST only be sent to the AI service as part of a discovery the GM asked for, with AI enabled.

**Help**

- **FR-044**: The Help system MUST explain Hex Crawl mode, the three states, the hex panel, attaching and creating entities, Explore, what is sent to the AI service, the offline fallback, and that players never see hex notes.
- **FR-045**: The first time the GM clicks a hex in Hex Crawl mode, a short hint MUST explain the hex panel. Once dismissed, it MUST NOT reappear.

### Key Entities

- **Hex grid geometry**: How a map's hex grid lies over the image: grid type (pointy or flat hexes), size, horizontal and vertical offsets, and coordinate label style. Belongs to one map and is saved with it.
- **Hex record**: What the campaign knows about one hex on one map, identified by its grid position. Holds terrain, GM notes, whether and when it was explored, any AI-drafted notes section, and any unsaved discovery draft. Its saved discoveries are the entities pinned in it, not a separate reference. Only exists for hexes that have been touched.
- **Terrain**: One of a fixed default list (plains, forest, hills, mountains, swamp, desert, water, coast, tundra) or a custom label.
- **Exploration state**: Unknown, Seen or Explored. Explored is stored on the hex record. Unknown and Seen are worked out from the map's fog.
- **Hex contents**: The campaign entities pinned in a hex. These are existing map pins that already know their hex, not a new kind of link.
- **Discovery draft**: A draft for one hex with six parts (landmark, encounter, hazard, secret, faction presence, atmosphere), each kept, regenerated or discarded independently. While any part is still pending, the draft is kept on the hex record and saved with the map. It becomes campaign content only through the parts the GM saves, and it disappears once every part is saved or discarded.
- **Hex Crawl mode setting**: Whether Hex Crawl mode is on for a map. Saved with the map.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A GM can open a hex, set its terrain, write a note and attach an entity in under 30 seconds.
- **SC-002**: The hex panel opens within half a second of clicking a hex, on a map with 2,000 touched hexes.
- **SC-003**: With AI enabled, a discovery draft appears within 15 seconds in at least 95% of attempts. With AI disabled, a draft appears in under 1 second.
- **SC-004**: In acceptance testing, every discovery draft refers to the hex's terrain, and when a location or faction lies within two hexes, at least 80% of drafts refer to it or its surroundings.
- **SC-005**: After syncing, or restoring from a backup, on another device, 100% of hex records appear on the same hexes as on the original device.
- **SC-006**: No discovery action ever changes text the GM wrote. This is verified by tests covering every save path.
- **SC-007**: A map with no hex data and Hex Crawl mode off behaves and looks exactly as it did before the feature, including its grid.
- **SC-008**: Connected players and guests see no hex notes, terrain values or icons, drafts or explored markers in any tested scenario.
- **SC-009**: A GM who has never used the mode can enable it, explore one hex and save one discovered entity using only the in-app hint and Help article.

## Assumptions

- "Party token" means the tokens already used as the party in solo and VTT play (vision sources), as defined in spec 171.
- Linking an entity to a hex reuses map pins, which already record the hex they sit in. No new kind of link is introduced.
- Seen is worked out from the existing fog. A hex is revealed when its centre is revealed.
- "Nearest locations and factions" means location and faction entities pinned on the same map, ordered by hex distance. The vault has no separate settlement type, so any location counts.
- The map's region entity is its existing parent entity, when one is set.
- Discovery uses the campaign's existing AI settings, AI Disabled switch and AI service. No new AI provider or setting is added.
- The offline fallback uses the app's existing random table system, with built-in terrain tables provided by this feature.
- Journal capture uses the existing session journal and respects its existing capture settings.
- Hex data rides along with the map in the campaign, so sync, backup, restore and export need no separate handling.

## Out of Scope

- Journey mode: choosing a route and stepping through it hex by hex (#4148).
- Pathfinding or terrain-weighted travel.
- System-specific movement, travel or encounter rules.
- A full hex map editor or a terrain painting brush.
- A new fog layer, such as a dimmed "explored but not currently seen" tier.
- Moving hex records to new positions after a grid change.
- Generating discoveries for many hexes at once.
- Showing terrain or exploration state to players.
