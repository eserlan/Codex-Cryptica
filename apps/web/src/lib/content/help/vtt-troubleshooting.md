---
id: vtt-troubleshooting
title: VTT Troubleshooting
description: Fixes for the most common VTT problems, such as a token that will not move, players who cannot see something, fog that does not behave, initiative that will not advance, and voice or connection trouble.
tags:
  [
    vtt,
    troubleshooting,
    token,
    move,
    fog,
    initiative,
    guest,
    voice,
    connection,
    help,
  ]
rank: 6
---

## A token will not move

The map tells you why when you try. The usual reasons are:

- **The token is locked.** Unlock it to move it.
- **Its layer is locked.** Unlock the layer in the layer control. A locked layer blocks everyone, including the GM.
- **It belongs to someone else.** Only its owner and the GM can move it. Assign it to a player with **Owner** in its details.
- **You are in PLAYER VIEW.** Switch back to GM view to edit.

## A player cannot see something

- The token may be hidden. Right-click it and choose **Show to All**.
- Notes start hidden from players. Right-click the note and show it.
- The area may still be under fog. Reveal it with `Alt` + drag, or give a token **Vision Source (PC)**.
- Hiding an entity in your lore and covering a map area are separate, so check both. See [Fog, Player View & Solo Play](/help#help/vtt-fog-player-view).

## Fog does not behave as expected

- Check that **FOG** is **ON**. The fog switch only shows in GM view.
- Reveal needs `Alt` held while you drag. `Alt` + `Shift` hides again.
- On a hex map the fog follows hexes, so a small brush changes one hex at a time. For a single hex, right-click it and choose **Reveal hex** or **Hide hex**.
- In **PLAYER VIEW** you cannot paint fog. Switch back to GM view.
- If you can still see the map under the fog, that is how GM view looks: the fog is light so you can see what you have hidden. Turn on **SOLO** (next to **FOG**) to hide fogged areas completely, for example when playing alone.

## Initiative will not advance

- **Next Turn** only works for the GM, or the owner of the token whose turn it is.
- It is disabled while the list is empty. Add tokens with **Add to Initiative**.
- The initiative list only shows in **Combat** mode.

## A player cannot edit or manage something

Players can only move tokens assigned to them, and cannot create tokens, place tiles or change the map. These are host tools by design. Assign their token with **Owner**.

## Voice chat will not connect

- The host has to start voice first. Players see **Join voice chat** once a channel is open.
- Hover the voice button to see the current state or error. Click it again while connecting to cancel and retry.
- Check your browser has permission to use the microphone.

## The session will not connect

- The host must keep their tab open with the live session running (see **Share Campaign**).
- Send the player the full copied link.
- Ask the player to reload the link.

## Still stuck?

Ask Cif from the map bar, which can see which screen you are on, or open the [VTT Overview](/help#help/vtt-session).
