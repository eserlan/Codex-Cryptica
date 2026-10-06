---
id: vtt-tokens
title: Tokens, Players & Permissions
description: Create tokens from vault entities or as freeform markers, then move, resize, restyle, hide and assign them to players.
tags:
  [
    vtt,
    tokens,
    owner,
    permissions,
    visibility,
    status,
    resize,
    facing,
    vision,
    health,
  ]
rank: 5
---

## Creating tokens

- **From a vault entity**: open **Vault Entities** in the VTT Sidebar, search your characters, creatures and items, then drag one onto the map. A ghost marker follows your cursor so placement stays precise, and the token is linked to that entity.
- **Freeform marker**: choose **Add Token** (or double-click an empty spot on the map with VTT on). Type a **Token Name** such as "Goblin Captain" and choose **Create Token** to place a combat marker. You can pick an entity in the same dialog to link it, which fills in the name.

Only the GM can create tokens.

## Moving, resizing and restyling

- **Move**: drag the token. Tokens snap to the grid.
- **Turn**: drag the handle above a selected token or its facing ring. `Alt` + `Left` or `Right` arrow turns it in 45-degree steps.
- **Right-click a token** for **Ping Token**, **Clone Token**, **Hide from Guests** or **Show to All**, **Move to Layer**, **Appearance**, **Resize** and **Status**, plus **Remove Token**.
- **Appearance**: switch the facing indicator on or off, and choose a circle or square base.
- **Resize**: choose 1x to 4x. On a hex grid the size matches the hex.
- **Status**: mark a token **Dead**, **Stunned**, **Prone**, **Poisoned** or **Invisible**. The status shows on the token.
- **Health bar**: double-click a token (with VTT on) to open its health bar control, with buttons to raise or lower the value.

## The token details panel

Select a token and its details appear in the VTT Sidebar. The GM sees:

- **Owner**: which connected player controls this token, or **Unassigned**.
- **Vision Source (PC)**: lets this token light up the fog around it.
- **Add to Initiative**: puts it in the turn order.
- **Open in Zen Mode** for a linked entity.
- A button to show the token's image to players.
- **Remove Token**.

## Who can do what

- **The GM** can move, edit, hide and remove any token.
- **A player** can move only tokens assigned to them. Assign a token with **Owner** in its details. A player's own token is never blocked by the layer you are currently editing, but a **locked** token or a **locked layer** stops everyone, including the GM.
- **Players only see tokens that are shown to them.** Use **Hide from Guests** and **Show to All** to control that.
- A linked entity can be opened from the token details, or from the book button on an initiative row, when the person looking is allowed to see that token.

## Vision

Tokens marked as **Vision Source (PC)** reveal the fog around them as they move. **VISION: PARTY** combines every vision source, and **VISION: SELECTED** uses only the selected token. **Vision Range** sets how far they see. See [Fog, Player View & Solo Play](/help#help/vtt-fog-player-view).
