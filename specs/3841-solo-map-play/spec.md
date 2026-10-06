# Feature Specification: Solo Map Play

**Feature Branch**: `feat/3841-solo-map-play`
**Created**: 2026-10-06
**Status**: Draft
**Input**: User description: "Solo map play: a "Solo" mode for the VTT map that lets one person be both GM and player. Builds on the shipped SOLO fog toggle (#3818, PR #3838). Cover: solid fog as players see it with all GM tools kept; handling of GM-only tokens and map notes (hidden until revealed vs always shown); hex exploration flow (reveal by moving, vision, travel); capturing what happens into the Session Journal; Cif help and context for solo play; discoverability. Must not change multiplayer or Player View behaviour. Local-first, no tracking."
**Issue**: #3841. Builds on #3818.

## Context

In solo play the GM is the player: one person prepares the map and then explores it as their own party. Until #3818 the map offered two views, neither of which fits. GM view keeps every tool but shows the map through a light fog, so nothing is really hidden. Player View hides properly but switches the GM tools off. The **SOLO** switch shipped in #3818 closes the first gap: with it on, the GM sees fog exactly as players do and keeps every tool.

This feature turns that switch into a complete way to play a map alone: what stays hidden and what shows up as the party explores, how exploring a hex map feels, how what happens is recorded, and how someone finds and understands it.

## Clarifications

### Session 2026-10-06

- Q: When a solo GM reveals a hex holding something hidden from players, does it appear straight away? → A: Yes. It appears as soon as its area is revealed (FR-007).
- Principle: in solo play the GM is the player. There is one person in one role, so "hidden from players" has no audience; fog alone decides what is concealed, and the GM keeps every tool. Requirements about connected players and Player View exist to protect people who use SOLO in a multiplayer game, not because solo play has other players.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Explore my own map without seeing what lies ahead (Priority: P1)

A solo GM prepares a hexcrawl region, stocks some hexes with notes and hidden monster tokens, turns on **SOLO**, and starts exploring. Everything they have not revealed is completely hidden: the terrain, tokens, pins, pin labels and notes in those areas. As they reveal hexes, what lies there appears, and every GM tool keeps working throughout.

**Why this priority**: Without genuine concealment there is no exploration, and solo play has no point. This is the core of the feature and the part #3818 began.

**Independent Test**: Stock a fogged region with a hidden token, a note and a labelled pin, turn on SOLO, and confirm none of them, nor the terrain, can be seen until their area is revealed, while the fog brush, the hex menu and token movement all still work.

**Acceptance Scenarios**:

1. **Given** fog is on and SOLO is on, **When** the GM looks at a fogged area, **Then** nothing in it is visible: map image, tokens (including ones hidden from players), pins, pin labels, notes, note markers and hex coordinate labels.
2. **Given** SOLO is on, **When** the GM reveals an area by brush, by right-clicking a hex, or by a token's vision, **Then** everything in that area appears, including tokens and notes hidden from players.
3. **Given** SOLO is on, **When** the GM uses any GM tool (fog brush, Reveal hex, Hide hex, moving any token, adding tokens, tile decks, layers, initiative), **Then** it behaves exactly as with SOLO off.
4. **Given** SOLO is on, **When** the GM hides an area again, **Then** everything in it is concealed again.
5. **Given** a session with connected players, **When** the GM turns SOLO on or off, **Then** nothing changes for the players.

---

### User Story 2 - Explore a hex map by moving my party (Priority: P2)

The solo GM places a party token, marks it as the party's eyes, and moves it hex by hex. Each move reveals the hexes the party can see, the travel distance and time are shown using the map's scale, and the GM can see at a glance how far the party has come.

**Why this priority**: Moving the party is how exploration actually happens in a hexcrawl. Revealing by hand works, but moving and seeing is the experience players want, and most of it builds on what exists (vision tokens, hex snapping, hex distance).

**Independent Test**: On a hex map with SOLO on, move a party token three hexes and confirm the surrounding hexes are revealed after each move and the distance travelled is shown in the map's units.

**Acceptance Scenarios**:

1. **Given** a hex map with SOLO on and a party token marked as a vision source, **When** the GM moves the token into a new hex, **Then** the hexes within the party's sight are revealed, in whole hexes.
2. **Given** the party's sight is set in hexes, **When** the GM changes it, **Then** later moves reveal the new range; hexes already revealed stay revealed.
3. **Given** the map has a scale (for example 6 miles per hex), **When** the party moves, **Then** the GM can see the hexes travelled and the distance for that move and for the session so far.
4. **Given** the GM undoes a move's reveal, **When** they press undo, **Then** the hexes revealed by that move are hidden again.
5. **Given** a square-grid or gridless map, **When** the party moves, **Then** sight reveals a circular area as it does today, and travel is shown in the map's units.

---

### User Story 3 - Keep a record of the expedition (Priority: P3)

While a Session Journal is running, the solo GM's exploration is written into it as it happens: which hexes were entered and revealed, the distance travelled, and the dice, table and deck results already captured today. Afterwards the GM can read back the route and turn anything worth keeping into vault entries.

**Why this priority**: Solo play relies on the record, because there is no one else at the table to remember it. The journal and its automatic capture already exist, so this extends them to the map.

**Independent Test**: Start a journal, move a party token across four hexes with SOLO on, and confirm the journal has entries for the movement and reveals, in order, alongside a dice roll made during the trip.

**Acceptance Scenarios**:

1. **Given** a journal is running and SOLO is on, **When** the party token enters a hex, **Then** the journal records the move with the hex coordinates (when coordinates are shown) and the distance.
2. **Given** several hexes are revealed in quick succession, **When** they are recorded, **Then** they are grouped into one entry rather than one entry per hex.
3. **Given** no journal is running, **When** the party moves, **Then** nothing is recorded and nothing is stored.
4. **Given** the GM does not want map events in the journal, **When** they turn map capture off for the journal, **Then** moves and reveals stop being recorded and dice, table and deck capture continue.
5. **Given** a recorded map entry, **When** the GM promotes it, **Then** it can become a vault entry (for example a location note for a hex) the same way other journal entries can.

---

### User Story 4 - Find solo play and get help with it (Priority: P3)

Someone who plays alone opens a map and wonders how to keep the map hidden from themselves. They find the SOLO switch next to FOG, its tooltip explains it, the Help library has a solo play guide, and Cif can answer solo questions with their current state in mind and point at the controls.

**Why this priority**: The feedback that led to #3818 came from someone who could not make solo play work. A feature nobody finds does not help them.

**Independent Test**: With no prior knowledge, a tester asks Cif "how do I play this map solo?" from the map and is shown the SOLO switch, and the Help library's solo guide describes the whole flow.

**Acceptance Scenarios**:

1. **Given** fog is on in GM view, **When** the GM looks at the map controls, **Then** SOLO is visible next to FOG with a plain-language explanation on hover or focus.
2. **Given** fog is off, **When** the GM asks Cif about solo play, **Then** Cif explains that fog must be on first and can point at the fog control.
3. **Given** SOLO is on, **When** the GM asks Cif something like "why can't I see anything?", **Then** Cif knows SOLO is on and explains what it does and how to reveal areas.
4. **Given** AI is turned off, **When** the GM opens Help, **Then** the solo play guide is available and complete.

### Edge Cases

- **Fog turned off while SOLO is on**: SOLO has no effect without fog; turning fog back on restores SOLO as it was.
- **SOLO on, then Player View**: Player View behaves exactly as today (GM tools off); leaving Player View returns to GM view with SOLO as it was.
- **Hosting a live session with SOLO on**: players see what they always see; nothing the GM's screen shows is sent to them because of SOLO.
- **Map with no fog painted yet**: everything starts hidden, as fog always does; the first reveal shows the start area.
- **Party token without vision**: moving it reveals nothing; the travel distance is still shown.
- **Several vision tokens**: each reveals around itself; party versus selected vision behaves as today.
- **Moving a token onto a hex that is already revealed**: no new reveal, and the journal records the move without a reveal.
- **Very large reveals** (a long jump across the map): the reveal and the journal entry stay one action, one undo step and one entry.
- **Hidden token or note in a revealed area**: it appears when the area is revealed (FR-007).
- **Journal paused or ended mid-move**: nothing is recorded after it stops.
- **Guest in someone else's session**: SOLO is not offered; nothing about solo play changes their view.

## Requirements _(mandatory)_

### Functional Requirements

**Concealment**

- **FR-001**: The map MUST offer a SOLO setting in GM view while fog is on, as shipped in #3818, and keep it per map on this device.
- **FR-002**: With SOLO on, fogged areas MUST conceal everything in them: the map image, all tokens (including ones hidden from players), pins, pin labels, notes, note markers and hex coordinate labels.
- **FR-003**: With SOLO on, every GM tool MUST keep working exactly as with SOLO off.
- **FR-004**: SOLO MUST only change what the GM's own screen shows. It MUST NOT change what connected players see, MUST NOT be sent to them, and MUST NOT change Player View.
- **FR-005**: Revealing or hiding an area MUST update what is concealed immediately, by any method (brush, hex menu, token vision, undo).
- **FR-006**: Concealment MUST be safe by default: if the map cannot tell whether an area is revealed, a hint drawn over the map (such as a label) MUST NOT reveal content from a fogged area. The pin label check shipped in #3818 shows a label when the fog state cannot be read; this requirement replaces that behaviour.
- **FR-007**: With SOLO on, tokens and notes that are hidden from players MUST appear as soon as their area is revealed. In solo play there is no other player to hide them from, so fog is the only thing that conceals; revealing the hex is the discovery.

**Exploration**

- **FR-008**: On a hex map with SOLO on, a token marked as a vision source MUST reveal the hexes within its sight when it moves, in whole hexes.
- **FR-009**: The party's sight on a hex map MUST be settable in hexes, and changing it MUST only affect later reveals.
- **FR-010**: The map MUST show the hexes travelled and the distance, in the map's units, for the last move and for the current session.
- **FR-011**: Each move's reveal MUST be a single undo step.
- **FR-012**: On square-grid and gridless maps, vision and travel MUST keep working as they do today.

**Record**

- **FR-013**: While a Session Journal is running and SOLO is on, entering a hex MUST add a journal entry with the move, the distance and, when shown, the hex coordinates.
- **FR-014**: Reveals made in quick succession MUST be grouped into a single entry.
- **FR-015**: The GM MUST be able to turn map capture off for a journal without affecting dice, table and deck capture.
- **FR-016**: Map entries MUST be promotable to vault entries like other journal entries.
- **FR-017**: Nothing MUST be recorded when no journal is running.

**Help and discoverability**

- **FR-018**: The SOLO control MUST carry a plain-language explanation available on hover and keyboard focus, and MUST be reachable on phones through the map controls.
- **FR-019**: The Help library MUST contain a complete solo play guide covering concealment, exploring by moving, travel, and the journal, usable without AI.
- **FR-020**: Cif MUST know whether SOLO is on and whether fog is on, MUST be able to point at the SOLO control when the GM can use it, and MUST answer solo play questions from the Help library.

**Privacy and scope**

- **FR-021**: All solo play state (the setting, travel totals, journal entries) MUST stay on this device and in the vault. Nothing about solo play MUST be sent anywhere, measured or reported.
- **FR-022**: Multiplayer sessions, Player View and guest views MUST behave exactly as before.

### Key Entities

- **Solo setting**: per map, on this device. Whether fog is shown solid in GM view.
- **Party sight**: per map. How far vision-source tokens reveal, in hexes on a hex map and in map units otherwise.
- **Travel record**: per session. The moves made by vision-source tokens: from and to hexes, hexes travelled, distance.
- **Map journal entry**: a Session Journal entry describing a move and its reveals, grouped, promotable like other entries.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: With SOLO on, a reviewer checking a prepared test map finds zero items (terrain, tokens, pins, labels, notes, coordinates) visible inside fogged areas.
- **SC-002**: With SOLO on, all GM tools listed in FR-003 pass the same checks as with SOLO off.
- **SC-003**: A connected player's view is identical whether the GM has SOLO on or off.
- **SC-004**: A solo tester can explore ten hexes by moving a party token, with each move revealing the expected hexes, in under two minutes and without opening any menu.
- **SC-005**: After a ten-hex expedition with a journal running, the journal holds the route in order with no more than one entry per move.
- **SC-006**: In a usability check, at least four of five people who play solo find SOLO and explain what it does without help, within one minute of opening a fogged map.
- **SC-007**: Cif retrieves the solo play guide for at least four of five realistic solo play questions in the evaluation set.

## Assumptions

- SOLO stays a single switch next to FOG. "Solo mode" in this spec means that switch plus the behaviour this spec defines, not a separate app mode.
- The party is represented by one or more tokens marked as vision sources, which already exist.
- Hex sight and travel use the map's existing grid size, distance per cell and unit name.
- Map capture in the journal uses the existing automatic capture and promote paths.
- Solo play is a GM-side feature; guests in someone else's session are not offered it.
- No AI is required for any of this. Cif help is optional and covered by the existing AI Disabled setting.

## Out of Scope

- An AI game master or narrator. Solo Adventure (spec 160) covers AI-run play.
- A dimmed "explored but not currently seen" fog tier.
- Random encounters or weather rolled automatically on entering a hex. The GM can roll tables as today, and rolls are captured.
- Sharing or publishing a solo session.
