import { describe, expect, it } from "vitest";
import {
  buildSecretSocietyPrompt,
  generateSecretSocietyLocal,
  parseSecretSocietyResponse,
} from "./public-secret-society";

const fixedRng = () => 0.25;

describe("Secret Society generator", () => {
  it("honours its selected campaign inputs and creates the required campaign material", () => {
    const output = generateSecretSocietyLocal(
      {
        theme: "Cyberpunk / Corporate",
        tone: "Grounded",
        scale: "City-wide sect",
        publicFace: "Wellness group",
        dangerLevel: "Criminal",
        truthRelationship: "Partial truth",
      },
      fixedRng,
    );

    expect(output.title).toBeTruthy();
    expect(output.content).toContain("### What they believe");
    expect(output.content).toContain("### Adventure hooks");
    expect(output.lore).toContain("**Leader**");
    expect(output.lore).toContain("**Sacred Object**");
    expect(output.labels).toContain("secret-society");
  });

  it("makes the prompt require internally consistent beliefs, rituals, public cover, secrets, and hooks", () => {
    const prompt = buildSecretSocietyPrompt(
      {
        theme: "Cosmic Horror",
        campaignContext: "A coastal archive has vanished.",
      },
      "",
      fixedRng,
    );

    expect(prompt.userMessage).toContain("Cosmic Horror");
    expect(prompt.userMessage).toContain("coastal archive has vanished");
    expect(prompt.userMessage).toContain(
      "belief, ritual, public face, secret truth, conflict, and adventure hooks",
    );
    expect(prompt.userMessage).toContain("internally consistent");
    expect(prompt.systemInstruction).toContain(
      "selected theme's genre conventions",
    );
    expect(prompt.systemInstruction).toContain("modern terminology");
  });

  it("keeps an existing food cult as relationship context rather than reusing its conceit", () => {
    const prompt = buildSecretSocietyPrompt(
      {
        theme: "Classic Fantasy",
        campaignContext:
          "The Gilded Alimentary Concord is a food-harvesting cult.",
      },
      "Existing campaign entities: The Gilded Alimentary Concord, a food-harvesting cult.",
      fixedRng,
    );

    expect(prompt.userMessage).toContain("The Gilded Alimentary Concord");
    expect(prompt.systemInstruction).toContain("distinct central conceit");
    expect(prompt.systemInstruction).toContain("optional relationship context");
    expect(prompt.systemInstruction).toContain(
      "do not reuse their central domain",
    );
  });

  it("keeps useful default labels when a complete AI response omits them", () => {
    const prompt = buildSecretSocietyPrompt({}, "", fixedRng);
    const output = parseSecretSocietyResponse(
      JSON.stringify({
        content: "### Belief\nA complete doctrine.",
        lore: "### Leader\nA complete reference.",
      }),
      prompt.resolved,
    );

    expect(output.title).toBe(prompt.resolved.title);
    expect(output.labels).toEqual([
      "secret-society",
      "faction-generator",
      "imported-draft",
    ]);
    expect(output.status).toBe("active");
  });

  it("throws for malformed AI output so the caller can use local fallback", () => {
    const prompt = buildSecretSocietyPrompt({}, "", fixedRng);
    expect(() =>
      parseSecretSocietyResponse("not json", prompt.resolved),
    ).toThrow();
  });

  it("rejects a title-and-summary-only AI response so the caller can use local fallback", () => {
    const prompt = buildSecretSocietyPrompt({}, "", fixedRng);
    expect(() =>
      parseSecretSocietyResponse(
        JSON.stringify({
          title: "The Empty Circle",
          summary: "A thin result.",
        }),
        prompt.resolved,
      ),
    ).toThrow("substantive content and lore");
  });

  it("separates session context from the preceding prompt sentence", () => {
    const prompt = buildSecretSocietyPrompt(
      {},
      "Existing campaign elements: Saltwatch.",
      fixedRng,
    );
    expect(prompt.userMessage).toContain(
      "\nExisting campaign elements: Saltwatch.",
    );
    expect(prompt.userMessage).toContain("title-and-summary-only");
  });
});
