import type { JourneyDefinition, Milestone } from "../src/types";

/** A small journey shaped like the worldbuilder, used by the reducer tests. */
export const fixture: JourneyDefinition = {
  id: "worldbuilder",
  goal: "world",
  version: 2,
  title: "Build a world",
  steps: [
    {
      id: "add-place",
      instruction: "Add a place.",
      completeOn: { kind: "entry-created", categories: ["location"] },
      fallback: "Use Create to add a place.",
      anyEntryCopy: "Add any entry.",
    },
    {
      id: "add-character",
      instruction: "Add a character.",
      completeOn: { kind: "entry-created", categories: ["character"] },
      fallback: "Use Create to add a character.",
      anyEntryCopy: "Add another entry.",
    },
    {
      id: "connect",
      instruction: "Connect them.",
      completeOn: { kind: "connection-added" },
      fallback: "Open an entry and use Add connection.",
    },
    {
      id: "see-graph",
      instruction: "Open the Graph.",
      completeOn: { kind: "screen", area: "graph" },
      after: ["add-place", "add-character", "connect"],
      fallback: "Open the Graph from the activity bar.",
    },
  ],
  finish: { message: "You built the start of a world." },
};

export const defaults = {
  availableCategories: new Set(["character", "location", "note"]),
};

export const created = (category: string, at = 200): Milestone => ({
  kind: "entry-created",
  category,
  at,
});
export const connected = (at = 200): Milestone => ({
  kind: "connection-added",
  at,
});
export const graph = (at = 200): Milestone => ({
  kind: "screen",
  area: "graph",
  at,
});
