import type { JourneyDefinition } from "../types";

export const writer: JourneyDefinition = {
  id: "writer",
  goal: "story",
  version: 1,
  title: "Write a story",
  steps: [
    {
      id: "add-character",
      instruction: "Add the main character of your story.",
      completeOn: { kind: "entry-created", categories: ["character"] },
      showMe: { type: "highlight", target: "create-entry", label: "Create" },
      fallback:
        "Use the Create button (the round + button on a phone), choose Character, then save it.",
      anyEntryCopy: "Add your first entry, such as your main character.",
    },
    {
      id: "add-place-or-note",
      instruction:
        "Add a place where the story happens, or a note about the plot.",
      completeOn: { kind: "entry-created", categories: ["location", "note"] },
      showMe: { type: "highlight", target: "create-entry", label: "Create" },
      fallback: "Use Create again, choose Place or Note, then save it.",
      anyEntryCopy: "Add a second entry, such as a place or a plot note.",
    },
    {
      id: "connect",
      instruction: "Link your character to the place or note.",
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
      id: "find-again",
      instruction: "Find one of them again with Search or the Explorer.",
      completeOn: { kind: "entry-found" },
      after: ["add-character", "add-place-or-note"],
      showMe: { type: "highlight", target: "open-search", label: "Search" },
      fallback:
        "Use Search at the top (the magnifying glass on a phone), or open the Explorer and pick the entry.",
      quickPrompt: "How do I find an entry in the graph?",
    },
  ],
  finish: {
    message:
      "You added a character and a setting, linked them, and found one again.",
    next: {
      type: "openHelp",
      helpId: "spatial-canvas",
      label: "Lay out your story on a canvas",
    },
  },
};
