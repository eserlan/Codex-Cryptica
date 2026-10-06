---
id: vtt-session
title: Starting a VTT Session from Maps
description: Start a tactical tabletop session from a campaign map with tokens, initiative, and multiplayer controls.
tags: [vtt, map, session, encounter, tokens, multiplayer, p2p, initiative]
rank: 4
---

## Tactical VTT Sessions from Your Maps

Codex Cryptica includes an integrated **Virtual Tabletop (VTT)** mode directly accessible from your campaign maps. You can launch tactical encounters, place character tokens, track initiative, and host live multiplayer sessions for your gaming group straight from any map canvas.

### How to Start a VTT Session

1. Click the **MAP** tab in the top navigation bar or activity rail.
2. Select the map or floor plan you wish to use for your session.
3. In the top-right map control overlay, click the **VTT OFF** button to toggle it to **VTT ON**.
4. The tactical grid overlay, token management drawer, and encounter controls will immediately activate on your map canvas.

### Core VTT Features

#### 1. Placing & Managing Tokens

- **Drag & Drop Tokens**: Drag characters, NPCs, or monsters directly from the **Entity Explorer** sidebar onto the active map to instantiate tactical tokens linked to your vault notes.
- **Token Status & Stats**: Right-click or select a token to adjust hit points, apply status conditions (e.g. _Poisoned_, _Blinded_, _Prone_), or toggle player/GM visibility.

#### 2. Encounter & Initiative Tracking

- Activate combat tracking from the VTT control bar to open the **Initiative Tracker**.
- Add participating characters and monsters, roll initiative, and cycle through active combat turns and rounds seamlessly.

#### 3. Live P2P Multiplayer Hosting

- To share the live VTT session with your players, open the session menu and start a **Host Session** (or click the P2P connection icon in the top header).
- Copy and share the generated session link or Peer ID with your players.
- Connected guests view map navigation, live token movements, map pings, and Fog of War revelations in real-time in their browser — without requiring player accounts. Session connections can still use network services to establish or relay the connection.

#### 4. Measurement & Map Pings

- **Ruler Tool**: Press `R` or select the measurement icon to compute distance across grid tiles for movement or spell area radii.
- **Map Pings**: Hold `Shift` + `Click` (or double-click) anywhere on the map canvas to broadcast an animated visual ping to all connected players.

#### 5. Fog of War Integration

- Enable **GM MODE** and toggle **FOG** ON in the map controls.
- Hold `Alt` and **Click-Drag** across the canvas to "paint away" fog, revealing terrain and enemy tokens to players live during play.

#### 6. Token Menu & Map Controls

- **Token menu**: Right-click a token for **Ping Token**, **Clone Token**, **Hide from Guests** or **Show to All**, **Move to Layer**, **Appearance** (including a facing indicator), **Resize**, **Status**, and **Remove Token**. Right-click empty map to **Ping Here**.
- **Move and turn**: Arrow keys pan the map, `+` and `-` zoom, and `Alt` + `Left` or `Right` arrow turns the selected token.
- **Layers**: Use the layer control in the map bar to choose which layer you are editing and to show, hide or lock layers.
- **Grid**: Use the grid button to show the grid, and right-click it for grid settings.
- **Player view**: **PLAYER VIEW** shows the map the way your players see it. **VISION** chooses whether the party's combined vision or only the selected token's vision lights the map.
- **Cif**: Click **Cif** in the map bar to ask how any of this works. It stays available when the map is maximized, and you can pop it out into its own window to keep the map full size.

### Pausing or Ending a Session

- Click the **VTT ON** toggle button to return to standard map editing mode (**VTT OFF**).
- All token coordinates, revealed fog regions, and encounter metadata automatically persist in your local vault data for your next session.

### Related Blog Posts

- [Introducing Tactical VTT Mode](/blog/vtt-introduction) — Overview of zero-overhead, Peer-to-Peer tactical map sessions.
- [Spatial Intelligence & Map Navigation](/blog/spatial-intelligence) — Integrating geographic maps, pins, and spatial lore navigation.
