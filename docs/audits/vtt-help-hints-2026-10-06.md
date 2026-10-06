# VTT and map inline help audit — 6 October 2026

Part of the work to make Cif the primary in-app help experience (#3823), and
the audit asked for by #3828. This pass **inventories and classifies**; it
removes nothing. Where it recommends removal, it says which of the rollout
gates are met and what evidence backs them.

## Finding

The premise that the VTT leans on `FeatureHint` cards is true for **one** card.

- Only `vtt-mode` is rendered in the working surface (`VTTControls.svelte`, at
  the top of the VTT sidebar, shown to everyone until they dismiss it).
- The other VTT and map entries in `FEATURE_HINTS` (`map-mode`, `fog-of-war`,
  `hexcrawl-maps`, `vtt-entity-list`, `vtt-tile-decks`, `vtt-layers`,
  `vtt-notes`, `voice-chat`) are not shown anywhere in the app. They feed the
  public Features page through `FEATURE_GROUPS`, which requires every hint to
  appear exactly once, so they are marketing copy and cannot be deleted
  without changing that page. They add no clutter to the workspace.
- The rest of the VTT's inline help is short text at the point of action:
  labels, dialog subtitles, empty states, and a few privacy and permission
  notes.

So the crowding comes from the one persistent card plus a handful of
subtitles, not from a wall of hints.

## The rule: what stays inline and what moves behind Cif

Keep guidance in the interface when it is needed **before** or **during** an
action, or it prevents an immediate mistake:

- destructive confirmations,
- privacy and sharing disclosures,
- permission and visibility warnings,
- one-line empty states,
- what an option does, next to the option,
- instructions for a gesture while the gesture is in progress (nobody can ask
  mid-drag),
- labels and tooltips.

Move guidance behind Cif (and keep it in the Help library) when it is an
introduction, a feature tour or a mini-manual that is present whether or not
the person needs it. The Help library stays complete without AI, because Cif
and offline readers use the same articles.

A hint is retired only when all three rollout gates hold:

1. authoritative Cif-readable knowledge exists (#3824),
2. the relevant context reaches Cif where needed (#3825),
3. representative questions pass the evaluation set (#3826).

The compact entry point is the **Cif** button in the map controls bar (#3821),
which stays available when the map is maximised, plus the pop-out window
(#3822).

## Inventory

| Item                                                                                                                    | Where                                                           | Kind                              | Classification                                                  |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------- |
| `vtt-mode` — "Turn the map into a lightweight tactical board…" (dismissible card)                                       | `VTTControls.svelte`, top of the VTT sidebar, desktop and phone | Persistent explanatory card       | **Move behind Cif** (gates met, see below)                      |
| `map-mode`, `fog-of-war`, `hexcrawl-maps`, `vtt-entity-list`, `vtt-tile-decks`, `vtt-layers`, `vtt-notes`, `voice-chat` | `FEATURE_HINTS`, Features page only                             | Marketing copy, not in the app    | **Keep as static reference** (no workspace cost)                |
| "Alt+Drag to Reveal / Alt+Shift+Drag to Hide"                                                                           | Map controls bar while fog is on, GM view                       | Gesture reminder                  | **Keep inline** (the gesture is made on the map, not in a menu) |
| "Brush Size", "Vision Range", "Layer: …" labels                                                                         | Map controls bar                                                | Control labels                    | **Keep inline**                                                 |
| Vault Entities: "Drag characters, creatures, and items onto the map."                                                   | `MapVTTSidebar.svelte`                                          | One-line subtitle                 | **Keep inline** (one line, states the action)                   |
| "Add tokens to the initiative list to start combat."                                                                    | `InitiativePanel.svelte`                                        | Empty state                       | **Keep inline**                                                 |
| "Guests can move only tokens assigned to their peer id."                                                                | `TokenDetail.svelte`, under Owner                               | Permission note                   | **Keep inline, reword** (replace "peer id" with plain language) |
| "Place a combat marker at the clicked map position."                                                                    | `TokenAddDialog.svelte`                                         | Dialog subtitle                   | **Keep inline**                                                 |
| "Draw room and corridor images as the map unfolds."                                                                     | `TileDeckPanel.svelte`, section subtitle                        | Permanent subtitle                | **Reduce** (a tooltip on the heading would do; low priority)    |
| Stock-on-draw option text ("Pins an empty encounter note…")                                                             | `TileDeckPanel.svelte`                                          | Option explanation                | **Keep inline** (sits next to the option it explains)           |
| "No random tables found in vault…"                                                                                      | `TileDeckPanel.svelte`                                          | Empty state                       | **Keep inline**                                                 |
| Starter pack description and licence line                                                                               | `TileDeckPanel.svelte`                                          | Attribution                       | **Keep inline** (licence information)                           |
| "Save the current combat state or restore a previous encounter."                                                        | `EncounterManager.svelte`                                       | Dialog subtitle                   | **Keep inline**                                                 |
| Fit Grid instructions (square and hex)                                                                                  | `VTTGridFitSection.svelte`                                      | Gesture instructions              | **Keep inline** (needed before and during the drag)             |
| "Display axial (q.r) labels in hex centers"                                                                             | `VTTGridSettings.svelte`                                        | Option explanation                | **Keep inline**                                                 |
| Share dialog: live link, "keep this tab open", what recipients can see                                                  | `ShareModal.svelte`                                             | Privacy and connection disclosure | **Keep inline**                                                 |
| "Uses P2P WebRTC. Bypass Google API limits."                                                                            | `ShareModal.svelte`                                             | Developer wording                 | **Keep inline, reword** (plain language, not a hint question)   |
| Blank-map text ("Start with an empty grid and build the map by placing tiles…")                                         | `MapUploadOverlay.svelte`                                       | Empty state                       | **Keep inline**                                                 |
| Grid move and fit notifications                                                                                         | `VTTGridFitSection.svelte`, notification store                  | Transient prompt                  | **Keep inline**                                                 |

## Gates for retiring the `vtt-mode` card

| Gate          | Evidence                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Knowledge  | Every claim in the card is in a Help article Cif reads: turning VTT on, tokens, snapping and the grid (`vtt-session`, `vtt-grids-measurement`); initiative and saving encounters (`vtt-combat-initiative`); measuring (`vtt-grids-measurement`); rotating and facing, `Alt` + arrow keys, circle or square base (`vtt-tokens`); and that VTT does not change the underlying map (`vtt-session`). |
| 2. Context    | The screen description reports VTT on or off, Explore or Combat, selected token and whether it can be moved, and the user's role (#3825). Cif can open the sidebar and point at the mode buttons, Add Token and Encounters (#3827).                                                                                                                                                              |
| 3. Evaluation | Retrieval questions pass for: switching on tokens, moving a token, **rotating a token**, **showing which way a token faces** (both added with this audit, because the card's rotation and facing text had no question), measuring distance, adding to initiative and saving an encounter. All hit an expected source in the current evaluation set.                                              |

The VTT questions sit in the shared evaluation files, not in a file of their
own. A dedicated VTT file would make these gates easier to read; that is a
tidy-up, not a blocker.

## Recommendation

1. **Retire the `vtt-mode` card from the VTT sidebar** in a follow-up change.
   Remove the one `FeatureHint` line in `VTTControls.svelte`. Leave the
   `FEATURE_HINTS` entry (the Features page needs it) and leave existing
   dismissal state alone. It is reversible by restoring that line. The card
   costs most on a phone, where the sidebar fills the screen.
2. **Do nothing to the Features-page hint entries.** They are not workspace
   clutter.
3. **Reword two strings**: "peer id" in the token Owner note, and the share
   dialog's "Bypass Google API limits". These are plain-language fixes, not
   help removal.
4. **Optionally reduce** the tile deck subtitle to a tooltip.
5. Keep every Help article. They are the source Cif retrieves from and the
   offline fallback.

Not done here: measuring the layout change on a phone, and a manual check that
a first-time user can find help without the card. Both belong with the
follow-up that removes it.
