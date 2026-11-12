import { describe, expect, it } from "vitest";
import { entityDetailTabLabels } from "./detail-tabs";

describe("entityDetailTabLabels", () => {
  it("holds the plain labels", () => {
    expect(entityDetailTabLabels).toEqual({
      status: "Overview",
      overview: "Overview",
      connections: "Connections",
      lore: "GM notes",
      map: "Map",
      chats: "Chats",
      family: "Family",
      stats: "Stats",
      timeline: "Timeline",
    });
  });

  it("has no all upper case label", () => {
    for (const label of Object.values(entityDetailTabLabels)) {
      expect(label).not.toBe(label.toUpperCase());
    }
  });
});
