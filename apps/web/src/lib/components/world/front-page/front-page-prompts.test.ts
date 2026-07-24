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
    it("includes the theme name and description but never the world name", () => {
      const result = createWorldCoverPrompt(
        "Moonfall",
        "Neon Night",
        "Cyberpunk neon-noir",
        "A broken moon.",
        "Extra context",
      );
      expect(result).toContain("Neon Night");
      expect(result).toContain("Cyberpunk neon-noir");
      // Art Direction v2: proper names carry no visual information and are
      // stripped before the prompt reaches the provider.
      expect(result).not.toContain("Moonfall");
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

    it("composes without a world name", () => {
      const result = createWorldCoverPrompt(
        "",
        "Theme",
        "Desc",
        "Briefing",
        "Context",
      );
      expect(result).toContain("Create cover art");
      expect(result).toContain("Briefing");
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

    it("applies the cover category framing, camera, and negatives", () => {
      const result = createWorldCoverPrompt(
        "World",
        "Theme",
        "Desc",
        "Briefing",
        "Context",
      );
      expect(result).toContain("atmospheric cover art");
      // Portrait framing and the reserved title space come from the cover
      // camera preset rather than being restated in prose.
      expect(result).toContain("2:3 portrait framing");
      expect(result).toContain("negative space");
      expect(result).toContain("Do not render the world's name");
      expect(result).toContain("Avoid:");
      expect(result).toContain("generated text");
    });

    it("applies the theme medium when a theme id is given", () => {
      const result = createWorldCoverPrompt(
        "World",
        "Neon Night",
        "Desc",
        "Briefing",
        "Context",
        "cyberpunk",
      );
      expect(result).toContain("dense signage");
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
      expect(result).toContain("exactly three paragraphs of evocative prose");
      expect(result).toContain("Do not use bullet points");
      expect(result).toContain("Do not mention that you are an AI");
    });
  });
});
