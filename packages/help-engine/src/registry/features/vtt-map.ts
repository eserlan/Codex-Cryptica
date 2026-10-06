import type { FeatureEntry } from "../schema";

export const vttMap: FeatureEntry = {
  id: "vtt-map",
  title: "Maps and VTT",
  summary:
    "Pin your entities onto your own map images, reveal areas with fog of war, lay a hex grid over a map for overland travel, and run a tabletop session from a map with tokens, initiative and combat, tile decks, layers and notes, and live play with your group.",
  channel: "production",
  routes: ["/(app)/map"],
  areas: ["map"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "open-a-map",
      title: "Open your maps",
      steps: [
        "Open Maps from the activity bar.",
        "Choose a map, or add one with your own image.",
        "Pin entities to it. Start a VTT session from the map when you are ready to play.",
      ],
      actionIds: ["map.open"],
    },
    {
      id: "run-combat",
      title: "Run a combat",
      steps: [
        "Turn VTT on, then choose Combat at the top of the VTT Sidebar.",
        "Drag characters and creatures from Vault Entities onto the map, select each token and choose Add to Initiative.",
        "Type each Init value. Use Next Turn to move through the order; only the GM or the owner of the active token can press it.",
        "Use Encounters to save the fight as a snapshot you can load later.",
      ],
      actionIds: [
        "vtt.show-mode-switch",
        "vtt.show-initiative",
        "vtt.open-encounters",
      ],
    },
    {
      id: "host-a-session",
      title: "Play with your group online",
      steps: [
        "Turn VTT on, then choose Share Campaign at the bottom of the VTT Sidebar.",
        "Choose Start Live Session and copy the link to your players. Keep your tab open while you play.",
        "Select a token and use Owner to assign it to the player who controls it.",
      ],
      actionIds: ["vtt.show-share"],
    },
    {
      id: "reveal-the-map",
      title: "Reveal or hide parts of the map",
      steps: [
        "Choose Fog on in the map bar (GM view only).",
        "Hold Alt and drag to reveal, or Alt and Shift to hide. On a hex map, right-click a hex and choose Reveal hex or Hide hex.",
        "Use Player View to check what your players see; the fog controls are off while it is on.",
      ],
      actionIds: ["vtt.show-fog", "vtt.show-player-view"],
    },
    {
      id: "build-a-dungeon",
      title: "Build a map from tiles",
      steps: [
        "Open Tile Decks in the VTT Sidebar and add a starter deck or your own tile images.",
        "Draw a random tile or pick one, then drag or click it onto the map. Tiles snap edge to edge.",
        "Set Stock on draw on a deck to add a table roll or an encounter note to drawn tiles.",
        "Use the layer control to edit Terrain, Furniture and Tokens separately.",
      ],
      actionIds: ["vtt.show-tile-decks", "vtt.show-layers"],
    },
  ],
  helpIds: [
    "map-mode",
    "vtt-session",
    "vtt-tokens",
    "vtt-combat-initiative",
    "vtt-fog-player-view",
    "vtt-grids-measurement",
    "vtt-tiles-layers-notes",
    "vtt-multiplayer",
    "vtt-troubleshooting",
    "fog-of-war",
    "hexcrawl-maps",
  ],
  related: ["canvas"],
  actions: [
    {
      id: "map.open",
      action: { type: "navigate", to: "map", label: "Open Maps" },
    },
    // Opening and pointing only. Nothing here moves a token, reveals terrain,
    // advances initiative, changes an owner, starts or stops a session, or
    // deletes a snapshot: those stay ordinary actions the user takes.
    {
      id: "vtt.open-grid-settings",
      action: {
        type: "openPanel",
        panel: "vtt-grid-settings",
        label: "Open Grid Settings",
      },
    },
    {
      id: "vtt.open-encounters",
      action: {
        type: "openPanel",
        panel: "vtt-encounters",
        label: "Open Encounter Snapshots",
      },
    },
    {
      id: "vtt.show-mode-switch",
      action: {
        type: "openPanel",
        panel: "vtt-sidebar",
        label: "Show me the Explore and Combat buttons",
        then: {
          type: "highlight",
          target: "vtt-mode-switch",
          label: "Explore and Combat",
        },
      },
    },
    {
      id: "vtt.show-initiative",
      action: {
        type: "highlight",
        target: "vtt-initiative-panel",
        label: "Show me the initiative list",
      },
    },
    {
      id: "vtt.show-add-token",
      action: {
        type: "openPanel",
        panel: "vtt-sidebar",
        label: "Show me where to add a token",
        then: {
          type: "highlight",
          target: "vtt-add-token",
          label: "Add Token",
        },
      },
    },
    {
      id: "vtt.show-tile-decks",
      action: {
        type: "openPanel",
        panel: "vtt-sidebar",
        label: "Show me the tile decks",
        then: {
          type: "highlight",
          target: "vtt-tile-decks",
          label: "Tile Decks",
        },
      },
    },
    {
      id: "vtt.show-encounters-button",
      action: {
        type: "openPanel",
        panel: "vtt-sidebar",
        label: "Show me the Encounters button",
        then: {
          type: "highlight",
          target: "vtt-encounters-button",
          label: "Encounters",
        },
      },
    },
    {
      id: "vtt.show-share",
      action: {
        type: "openPanel",
        panel: "vtt-sidebar",
        label: "Show me where to share a live session",
        then: {
          type: "highlight",
          target: "vtt-share-button",
          label: "Share Campaign",
        },
      },
    },
    {
      id: "vtt.show-fog",
      action: {
        type: "openPanel",
        panel: "vtt-map-controls",
        label: "Show me the fog control",
        then: { type: "highlight", target: "vtt-fog-toggle", label: "Fog" },
      },
    },
    {
      id: "vtt.show-layers",
      action: {
        type: "openPanel",
        panel: "vtt-map-controls",
        label: "Show me the layer control",
        then: {
          type: "highlight",
          target: "vtt-layer-control",
          label: "Layers",
        },
      },
    },
    {
      id: "vtt.show-grid-button",
      action: {
        type: "openPanel",
        panel: "vtt-map-controls",
        label: "Show me the grid button",
        then: { type: "highlight", target: "vtt-grid-button", label: "Grid" },
      },
    },
    {
      id: "vtt.show-player-view",
      action: {
        type: "openPanel",
        panel: "vtt-map-controls",
        label: "Show me Player View",
        then: {
          type: "highlight",
          target: "vtt-player-view-toggle",
          label: "Player View",
        },
      },
    },
    {
      id: "vtt.show-vtt-toggle",
      action: {
        type: "openPanel",
        panel: "vtt-map-controls",
        label: "Show me the VTT switch",
        then: { type: "highlight", target: "vtt-mode-toggle", label: "VTT" },
      },
    },
    {
      id: "vtt.show-ruler",
      action: {
        type: "highlight",
        target: "vtt-ruler-toggle",
        label: "Show me the ruler",
      },
    },
  ],
};
