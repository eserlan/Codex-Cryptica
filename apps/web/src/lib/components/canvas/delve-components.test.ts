import { describe, it, expect } from "vitest";
import type { DungeonRoomRole, PassageType } from "generator-engine";
import { getRoleBadgeConfig, getPassageEdgeStyle } from "./delve-helpers";

describe("Delve Component Helpers", () => {
  it("returns role badge configuration for each room role", () => {
    const roles: DungeonRoomRole[] = [
      "entrance",
      "hazard",
      "encounter",
      "treasure",
      "secret",
      "lore",
      "faction",
      "special",
    ];

    roles.forEach((role) => {
      const config = getRoleBadgeConfig(role);
      expect(config.label).toBeDefined();
      expect(config.icon).toBeDefined();
      expect(config.colorClass).toBeDefined();
    });
  });

  it("returns appropriate edge styling for passage types", () => {
    const passageTypes: PassageType[] = [
      "standard",
      "hidden",
      "conditional",
      "vertical",
    ];

    passageTypes.forEach((type) => {
      const style = getPassageEdgeStyle(type);
      expect(style.strokeColor).toBeDefined();
      expect(style.badgeIcon).toBeDefined();
    });
  });
});
