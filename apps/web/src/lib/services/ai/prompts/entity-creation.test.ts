import { describe, it, expect } from "vitest";
import {
  buildCreationLoreSynthesisPrompt,
  buildStructuredDraftingPrompt,
} from "./entity-creation";

describe("entity-creation prompts", () => {
  describe("buildCreationLoreSynthesisPrompt", () => {
    it("should incorporate vault context and user query", () => {
      const result = buildCreationLoreSynthesisPrompt(
        "New NPC",
        "Old World Context",
      );
      expect(result).toContain("New NPC");
      expect(result).toContain("Old World Context");
      expect(result).toContain("Canonical Synthesis Summary");
    });
  });

  describe("buildStructuredDraftingPrompt", () => {
    it("should include synthesis summary and format requirements", () => {
      const result = buildStructuredDraftingPrompt(
        "Synthesis Data",
        "User Request",
      );
      expect(result).toContain("Synthesis Data");
      expect(result).toContain("User Request");
      expect(result).toContain("**Chronicle:**");
      expect(result).toContain("**Lore:**");
    });

    it("should handle custom categories correctly", () => {
      const result = buildStructuredDraftingPrompt("Syn", "Req", [
        "wizard",
        "spell",
      ]);
      expect(result).toContain("wizard | spell");
    });

    it("should use fallback categories if none provided", () => {
      const result = buildStructuredDraftingPrompt("Syn", "Req", []);
      expect(result).toContain("npc | faction | location");
    });
  });
});
