import type { AdventureJsonV1 } from "../../src/adventure-json/schema";

export function makePackage(
  overrides: Partial<AdventureJsonV1> = {},
): AdventureJsonV1 {
  return {
    formatVersion: "adventure-json/v1",
    id: "retrieval-fixture",
    title: "Retrieval fixture",
    version: "1.0.0",
    premise: { background: "Background", hook: "Hook" },
    source: { title: "Retrieval fixture" },
    locations: [],
    actors: [],
    factions: [],
    scenes: [],
    encounters: [],
    clues: [],
    rumours: [],
    items: [],
    secrets: [],
    endings: [],
    unresolved: [],
    ...overrides,
  };
}
