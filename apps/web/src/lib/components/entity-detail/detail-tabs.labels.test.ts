import { describe, expect, it } from "vitest";
import { entityDetailTabLabels } from "./detail-tabs";

describe("entityDetailTabLabels", () => {
  it("holds the plain labels", () => {
    expect(entityDetailTabLabels).toEqual({
      overview: "Overview",
      connections: "Connections",
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
