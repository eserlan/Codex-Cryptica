import type { JourneyDefinition } from "../types";

export const worldbuilder: JourneyDefinition = {
  id: "worldbuilder",
  goal: "world",
  version: 1,
  title: "Build a world",
  steps: [
    {
      id: "add-place",
      instruction:
        "Add a place to your world, such as a town, a forest or a castle.",
      completeOn: { kind: "entry-created", categories: ["location"] },
      showMe: { type: "highlight", target: "create-entry", label: "Create" },
      fallback:
        "Use the Create button (the round + button on a phone), choose Place, then save it.",
      anyEntryCopy:
        "Add your first entry: anything in your world, such as a place or a person.",
    },
    {
      id: "add-character",
      instruction: "Add a character who lives in your world.",
      completeOn: { kind: "entry-created", categories: ["character"] },
      showMe: { type: "highlight", target: "create-entry", label: "Create" },
      fallback: "Use Create again, choose Character, then save it.",
      anyEntryCopy: "Add a second entry, such as someone who lives there.",
    },
    {
      id: "connect",
      instruction:
        "Connect your character to the place, for example “lives in”.",
      completeOn: { kind: "connection-added" },
      showMe: {
        type: "openPanel",
        panel: "status-tab",
        label: "Open the Status tab",
        then: {
          type: "highlight",
          target: "add-connection-button",
          label: "Add connection",
        },
      },
      fallback:
        "Open one of the two entries, use Add connection on its Status tab, and pick the other one.",
      quickPrompt: "Where do I add a connection?",
    },
    {
      id: "see-graph",
      instruction:
        "Close the open entry and look at the Graph: your two entries are now joined.",
      completeOn: { kind: "screen", area: "graph" },
      after: ["add-place", "add-character", "connect"],
      // Navigating works in Guided Mode too, where there is no activity bar.
      showMe: { type: "navigate", to: "graph", label: "Open the Graph" },
      fallback:
        "Close the entry panel, then open the Graph from the activity bar or the menu.",
    },
  ],
  finish: {
    message:
      "You added a place and a character, connected them, and saw them on the Graph.",
    next: { type: "navigate", to: "map", label: "Put your world on a map" },
  },
};
