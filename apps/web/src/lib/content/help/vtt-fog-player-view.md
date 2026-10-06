---
id: vtt-fog-player-view
title: Fog, Player View & Solo Play
description: How map fog differs from hidden entities, how Player View works, how to reveal and hide areas and hexes, and what to know when playing solo.
tags: [vtt, fog, player view, vision, hex, reveal, solo, visibility, gm]
rank: 5
---

## Two kinds of hiding

Codex Cryptica hides things in two separate ways, and they do not affect each other:

- **Map fog** covers areas of a map image. It is painted and revealed on the map itself. See also [Fog of War](/help#help/fog-of-war).
- **Hidden entities** are lore entries you have hidden from your players in the graph and lists. See [Fog of War](/help#help/fog-of-war) for the Revealed, Hidden and Rumor states.

Hiding a hex does not hide an entity, and hiding an entity does not cover the map. Tokens have their own switch too: **Hide from Guests** and **Show to All** on the token menu.

## GM view and Player View

- **GM view** (the default) is for running the game. You keep every control, and hidden areas are still visible to you.
- **PLAYER VIEW** shows the map the way your players see it. Hidden areas stay hidden.

Switching to **PLAYER VIEW** turns the GM controls off, including the fog brush and the hex right-click menu. Switch back with **EXIT PLAYER VIEW** to reveal or hide anything.

## Turning fog on

Choose **FOG: ON** in the map bar. The fog switch only appears in GM view.

## Revealing and hiding

- Hold `Alt` and drag to reveal. Hold `Alt` + `Shift` and drag to hide again. **Brush Size** changes how much you paint at once.
- On a hex map, the fog follows the hex grid, and you can right-click one hex and choose **Reveal hex** or **Hide hex**. See [Hexcrawl & Overland Maps](/help#help/hexcrawl-maps).
- **Vision**: tokens marked **Vision Source (PC)** reveal the fog around them. **VISION: PARTY** combines every source and **VISION: SELECTED** uses the selected token. **Vision Range** sets the distance.

Changes are saved with the map, can be undone with `Ctrl` + `Z`, and are sent to connected players straight away.

## Playing solo

When you are both GM and player, you want the map to look the way a player sees it, with hidden areas truly hidden, while you keep the GM's tools to reveal more as you explore.

Use **SOLO**:

1. Turn **FOG: ON** in the map bar.
2. Turn **SOLO: ON**. Fogged areas now hide the map completely, just as they do for players, and also hide pin labels in those areas.
3. Explore. Reveal as you go with `Alt` + drag, or right-click a single hex and choose **Reveal hex**. Tokens marked **Vision Source (PC)** clear the fog around them as they move.
4. Hide an area again with `Alt` + `Shift` + drag or **Hide hex**.

You stay in GM view the whole time, so every GM control keeps working, including moving any token. **SOLO** only changes how the fog looks on your screen. It is remembered for each map on this device, and it does not change what connected players see. Turn it off to see the whole map under a light fog again.

**PLAYER VIEW** is different: it previews what players see and turns the GM controls off, so you cannot reveal or hide anything there. For solo play, use **SOLO** instead.

Tokens you hid from players are still shown to you once their area is revealed, because as the GM you placed them.
