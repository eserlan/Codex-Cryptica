import type { JourneyDefinition } from "../types";

/**
 * Generate first, then add a related entry. Every Create goes through the
 * generator, so one save reports both a new entry and a generator save. In
 * this order the first save cannot also count for the second step, so the
 * journey always takes two real saves (data-model, "Why rpg-gm generates first").
 */
export const rpgGm: JourneyDefinition = {
  id: "rpg-gm",
  goal: "campaign",
  version: 1,
  title: "Prepare an RPG campaign",
  steps: [
    {
      id: "generate",
      instruction:
        "Prepare a non-player character or a location with a generator, then save it to your vault.",
      completeOn: { kind: "generator-saved" },
      showMe: { type: "openGenerator", label: "Open the generators" },
      fallback:
        "Use Create, choose Character or Place, and save what the generator makes. It works without AI.",
    },
    {
      id: "add-related",
      instruction:
        "Add a second character or location for your table, for example with Generate related on the one you saved.",
      completeOn: {
        kind: "entry-created",
        categories: ["character", "location"],
      },
      after: ["generate"],
      showMe: {
        type: "openPanel",
        panel: "status-tab",
        label: "Open the Status tab",
        then: {
          type: "highlight",
          target: "generate-related-button",
          label: "Generate related",
        },
      },
      fallback:
        "Open the entry you saved and use Generate related on its Status tab, or use Create again.",
      anyEntryCopy:
        "Add a second entry for your table, for example with Generate related.",
      quickPrompt: "How do I generate entries related to this one?",
    },
  ],
  finish: {
    message: "You prepared two entries for your table with the generators.",
    next: {
      type: "navigate",
      to: "map",
      label: "Prepare a map for your table",
    },
  },
};
