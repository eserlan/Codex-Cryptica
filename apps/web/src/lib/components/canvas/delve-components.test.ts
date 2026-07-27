import { describe, it, expect } from "vitest";
import type { DungeonRoomRole, PassageType } from "generator-engine";
import {
  getPassageDirectionMarkers,
  getDelveRoomCardPreview,
  getRoleBadgeConfig,
  getPassageEdgeStyle,
} from "./delve-helpers";

describe("Delve Component Helpers", () => {
  it("uses AI-enhanced Area prose and its first playable detail on the card", () => {
    expect(
      getDelveRoomCardPreview({
        id: "area-1",
        sectorId: "sector-1",
        sectorName: "The Lightning Mound",
        name: "Temperate Battered Rift",
        role: "entrance",
        summary: "Area 1 within The Lightning Mound",
        description:
          "A shattered barrow mound split wide open by a violent tempest.",
        stocking: {
          hazards: ["Falling ribs of ancient beasts", "Sudden rockfall"],
          atmosphere: "Howling high-altitude winds",
        },
      }),
    ).toEqual({
      description:
        "A shattered barrow mound split wide open by a violent tempest.",
      detail: {
        icon: "icon-[lucide--alert-triangle]",
        label: "Hazard",
        text: "Falling ribs of ancient beasts",
        additionalCount: 1,
      },
    });
  });

  it("falls back through the mechanical summary and atmosphere safely", () => {
    expect(
      getDelveRoomCardPreview({
        id: "area-1",
        sectorId: "sector-1",
        sectorName: "The Lightning Mound",
        name: "Temperate Battered Rift",
        role: "entrance",
        summary: "Area 1 within The Lightning Mound",
        description: "",
        stocking: {
          atmosphere: "Howling high-altitude winds",
        },
      }),
    ).toEqual({
      description: "Area 1 within The Lightning Mound",
      detail: {
        icon: "icon-[lucide--wind]",
        label: "Atmosphere",
        text: "Howling high-altitude winds",
        additionalCount: 0,
      },
    });
  });

  it("puts climax stakes ahead of ordinary stocking details", () => {
    expect(
      getDelveRoomCardPreview({
        id: "area-final",
        sectorId: "sector-final",
        sectorName: "The Last Hearth",
        name: "The Ember Reckoning",
        role: "climax",
        summary: "",
        description: "Both factions converge on the dying flame.",
        stocking: {
          encounters: ["The Ashen Guild champion"],
        },
        climax: {
          stakes: "The mountain wakes if the flame is fed.",
          decision: "Extinguish, free, or claim the flame.",
          outcomes: ["The forge dies.", "The mountain wakes."],
        },
      }),
    ).toMatchObject({
      detail: {
        label: "Stakes",
        text: "The mountain wakes if the flame is fed.",
        additionalCount: 2,
      },
    });
  });

  it("returns role badge configuration for each room role", () => {
    const roles: DungeonRoomRole[] = [
      "entrance",
      "hazard",
      "encounter",
      "treasure",
      "secret",
      "lore",
      "faction",
      "climax",
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

  it("renders a Cairn-style undirected line for a two-way passage", () => {
    expect(getPassageDirectionMarkers(true, "passage-arrow")).toEqual({});
  });

  it("renders only a destination arrowhead for a one-way passage", () => {
    expect(getPassageDirectionMarkers(false, "passage-arrow")).toEqual({
      markerEnd: "url(#passage-arrow)",
    });
  });
});
