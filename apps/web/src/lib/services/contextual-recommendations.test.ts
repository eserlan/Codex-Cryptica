import { describe, it, expect } from "vitest";
import {
  evaluateEntityRecommendations,
  type RecommendableEntity,
} from "./contextual-recommendations";

function entity(overrides: Partial<RecommendableEntity>): RecommendableEntity {
  return {
    id: "e1",
    type: "note",
    title: "Untitled",
    connections: [],
    ...overrides,
  };
}

describe("evaluateEntityRecommendations", () => {
  it("recommends a leader for a faction with no character leader", () => {
    const faction = entity({
      id: "f1",
      type: "faction",
      title: "Iron Syndicate",
    });
    const all = { f1: faction };

    const recs = evaluateEntityRecommendations(faction, all);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      parentEntityId: "f1",
      targetCategory: "character",
      actionLabel: "Add Leader",
    });
    expect(recs[0].promptText).toContain("Iron Syndicate");
  });

  it("does not recommend a leader when a character already leads the faction", () => {
    const faction = entity({
      id: "f1",
      type: "faction",
      title: "Iron Syndicate",
      connections: [{ target: "c1", type: "leads", label: "Leader" }],
    });
    const character = entity({ id: "c1", type: "character", title: "Mira" });
    const all = { f1: faction, c1: character };

    expect(evaluateEntityRecommendations(faction, all)).toHaveLength(0);
  });

  it("recommends a settlement for a location with no child settlement", () => {
    const region = entity({
      id: "r1",
      type: "location",
      title: "The Silverwood Vale",
    });
    const all = { r1: region };

    const recs = evaluateEntityRecommendations(region, all);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      parentEntityId: "r1",
      targetCategory: "place",
      actionLabel: "Add Settlement",
    });
  });

  it("does not recommend a settlement when one is already located in the region", () => {
    const region = entity({
      id: "r1",
      type: "location",
      title: "The Silverwood Vale",
    });
    const settlement = entity({
      id: "s1",
      type: "location",
      title: "Oakhaven",
      connections: [{ target: "r1", type: "located_in" }],
    });
    const all = { r1: region, s1: settlement };

    expect(evaluateEntityRecommendations(region, all)).toHaveLength(0);
  });

  it("does not recommend a settlement for a settlement that is itself a child location", () => {
    const region = entity({
      id: "r1",
      type: "location",
      title: "The Silverwood Vale",
    });
    const settlement = entity({
      id: "s1",
      type: "location",
      title: "Oakhaven",
      connections: [{ target: "r1", type: "located_in" }],
    });
    const all = { r1: region, s1: settlement };

    expect(evaluateEntityRecommendations(settlement, all)).toHaveLength(0);
  });

  it("recommends a response for an unassigned threat", () => {
    const threat = entity({ id: "t1", type: "threat", title: "Raider convoy" });
    const recs = evaluateEntityRecommendations(threat, { t1: threat });

    expect(recs).toHaveLength(1);
    expect(recs[0].actionLabel).toBe("Add Character");
  });

  it("does not recommend a response for a threat that already has connections", () => {
    const threat = entity({
      id: "t1",
      type: "threat",
      title: "Raider convoy",
      connections: [{ target: "s1", type: "threatens" }],
    });
    expect(evaluateEntityRecommendations(threat, { t1: threat })).toHaveLength(
      0,
    );
  });

  it("returns no recommendations for entity types with no structural rules", () => {
    const note = entity({ id: "n1", type: "note", title: "Random Note" });
    expect(evaluateEntityRecommendations(note, { n1: note })).toHaveLength(0);
  });
});
