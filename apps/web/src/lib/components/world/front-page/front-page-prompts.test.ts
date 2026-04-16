import { describe, expect, it } from "vitest";
import {
  createWorldCoverPrompt,
  createWorldBriefingPrompt,
} from "./front-page-prompts";

describe("front-page-prompts", () => {
  // -----------------------------------------------------------------------
  // createWorldCoverPrompt
  // -----------------------------------------------------------------------

  describe("createWorldCoverPrompt", () => {
    it("includes the world name, theme name, and theme description", () => {
      const result = createWorldCoverPrompt(
        "Moonfall",
        "Neon Night",
        "Cyberpunk neon-noir",
        "A broken moon.",
        "Extra context",
      );
      expect(result).toContain('"Moonfall"');
      expect(result).toContain("Neon Night");
      expect(result).toContain("Cyberpunk neon-noir");
    });

    it("includes the briefing text", () => {
      const result = createWorldCoverPrompt(
        "World",
        "Theme",
        "Desc",
        "A rich briefing.",
        "Context",
      );
      expect(result).toContain("A rich briefing.");
    });

    it("includes the retrieved world context", () => {
      const result = createWorldCoverPrompt(
        "World",
        "Theme",
        "Desc",
        "Briefing",
        "Sky-market politics.",
      );
      expect(result).toContain("Sky-market politics.");
    });

    it("uses fallbacks when world name is empty", () => {
      const result = createWorldCoverPrompt(
        "",
        "Theme",
        "Desc",
        "Briefing",
        "Context",
      );
      expect(result).toContain('"this world"');
    });

    it("uses fallback when briefing is empty", () => {
      const result = createWorldCoverPrompt(
        "World",
        "Theme",
        "Desc",
        "",
        "Context",
      );
      expect(result).toContain("An unexplored setting.");
    });

    it("uses fallback when world context is empty", () => {
      const result = createWorldCoverPrompt(
        "World",
        "Theme",
        "Desc",
        "Briefing",
        "",
      );
      expect(result).toContain("No additional context was retrieved.");
    });

    it("includes art-direction requirements", () => {
      const result = createWorldCoverPrompt(
        "World",
        "Theme",
        "Desc",
        "Briefing",
        "Context",
      );
      expect(result).toContain("Portrait composition");
      expect(result).toContain("2:3 aspect ratio");
      expect(result).toContain(
        "No text, no title lettering, no UI, no borders",
      );
    });
  });

  // -----------------------------------------------------------------------
  // createWorldBriefingPrompt
  // -----------------------------------------------------------------------

  describe("createWorldBriefingPrompt", () => {
    it("includes the world name, theme name, and description", () => {
      const result = createWorldBriefingPrompt(
        "Moonfall",
        "Neon Night",
        "Cyberpunk neon-noir",
        "Retrieved context",
      );
      expect(result).toContain('"Moonfall"');
      expect(result).toContain("Neon Night");
      expect(result).toContain("Cyberpunk neon-noir");
    });

    it("includes the retrieved context", () => {
      const result = createWorldBriefingPrompt(
        "World",
        "Theme",
        "Desc",
        "Sky-market politics.",
      );
      expect(result).toContain("Sky-market politics.");
    });

    it("uses fallback when world name is empty", () => {
      const result = createWorldBriefingPrompt("", "Theme", "Desc", "Context");
      expect(result).toContain('"this world"');
    });

    it("uses fallback when retrieved context is empty", () => {
      const result = createWorldBriefingPrompt("World", "Theme", "Desc", "");
      expect(result).toContain("No additional context was retrieved.");
    });

    it("includes briefing requirements", () => {
      const result = createWorldBriefingPrompt(
        "World",
        "Theme",
        "Desc",
        "Context",
      );
      expect(result).toContain("Write exactly 3 prose paragraphs");
      expect(result).toContain("Do not use bullet points");
      expect(result).toContain(
        "opening page of a campaign guide or prestige sourcebook",
      );
    });
  });
});
