import { describe, it, expect } from "vitest";
import {
  getContextSelection,
  computeProvenance,
  type SessionEntity,
} from "./session-hub-helpers.js";

describe("session-hub-helpers", () => {
  const createEntity = (
    id: string,
    title: string,
    createdOrder: number,
    pinned: boolean = false,
    reuseEnabled: boolean = true,
  ): SessionEntity => ({
    id,
    type: "character",
    title,
    content: "Some content",
    labels: [],
    status: "active",
    reuseEnabled,
    pinned,
    createdOrder,
  });

  describe("getContextSelection", () => {
    it("returns all active entities if within budget", () => {
      const entities = [
        createEntity("1", "One", 1),
        createEntity("2", "Two", 2),
      ];
      const result = getContextSelection(entities, 5);
      expect(result.trimmed).toBe(false);
      expect(result.entities).toHaveLength(2);
    });

    it("filters out entities with reuseEnabled = false", () => {
      const entities = [
        createEntity("1", "One", 1, false, true),
        createEntity("2", "Two", 2, false, false),
      ];
      const result = getContextSelection(entities, 5);
      expect(result.trimmed).toBe(false);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].id).toBe("1");
    });

    it("trims entities based on recency if budget is exceeded", () => {
      const entities = [
        createEntity("1", "One", 1),
        createEntity("2", "Two", 2),
        createEntity("3", "Three", 3),
      ];
      const result = getContextSelection(entities, 2);
      expect(result.trimmed).toBe(true);
      expect(result.entities).toHaveLength(2);
      // Should keep the most recent ones (2 and 3)
      expect(result.entities.map((e) => e.id)).toEqual(["2", "3"]);
    });

    it("prioritizes pinned entities over recent ones when trimming", () => {
      const entities = [
        createEntity("1", "One", 1, true), // pinned
        createEntity("2", "Two", 2),
        createEntity("3", "Three", 3),
      ];
      const result = getContextSelection(entities, 2);
      expect(result.trimmed).toBe(true);
      expect(result.entities).toHaveLength(2);
      // Should keep pinned (1) and most recent of the rest (3)
      expect(result.entities.map((e) => e.id)).toEqual(["1", "3"]);
    });

    it("handles more pinned entities than budget allows", () => {
      const entities = [
        createEntity("1", "One", 1, true),
        createEntity("2", "Two", 2, true),
        createEntity("3", "Three", 3, true),
      ];
      const result = getContextSelection(entities, 2);
      expect(result.trimmed).toBe(true);
      // Since all are pinned, they will all be returned
      expect(result.entities.map((e) => e.id)).toEqual(["1", "2", "3"]);
    });
  });

  describe("computeProvenance", () => {
    it("finds used entities based on whole word title matching", () => {
      const offered = [
        createEntity("1", "Goblin King", 1),
        createEntity("2", "Elara", 2),
        createEntity("3", "Not Mentioned", 3),
      ];
      const generatedText =
        "The brave Elara fought the evil Goblin King in the dark caves.";
      const result = computeProvenance(
        "result1",
        generatedText,
        offered,
        false,
      );
      expect(result.usedEntityIds).toEqual(["1", "2"]);
      expect(result.offeredEntityIds).toEqual(["1", "2", "3"]);
      expect(result.trimmed).toBe(false);
      expect(result.resultEntityId).toBe("result1");
    });

    it("is case-insensitive and ignores partial words", () => {
      const offered = [
        createEntity("1", "King", 1),
        createEntity("2", "Elara", 2),
      ];
      const generatedText = "ELARA met the kingdom's guards."; // kingdom should not match King
      const result = computeProvenance(
        "result1",
        generatedText,
        offered,
        false,
      );
      expect(result.usedEntityIds).toEqual(["2"]);
    });

    it("matches titles with special characters", () => {
      const offered = [createEntity("1", "King(dom)", 1)];
      const generatedText = "We arrived at King(dom) today.";
      const result = computeProvenance(
        "result1",
        generatedText,
        offered,
        false,
      );
      expect(result.usedEntityIds).toEqual(["1"]);
    });
  });
});
