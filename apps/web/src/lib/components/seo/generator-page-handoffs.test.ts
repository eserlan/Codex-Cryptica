import { describe, expect, it } from "vitest";
import { initializeHandoffState } from "./generator-page-handoffs";

describe("generator-page-handoffs", () => {
  describe("initializeHandoffState", () => {
    it("should initialize empty state for unknown slug", () => {
      const state = initializeHandoffState("npc");

      expect(state.questPremise).toBe("");
      expect(state.factionContext).toBe("");
      expect(state.npcContext).toBe("");
    });
  });
});
