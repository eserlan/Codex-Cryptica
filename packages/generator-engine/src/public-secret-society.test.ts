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
  });

  it("keeps useful default labels when an AI response omits them", () => {
    const prompt = buildSecretSocietyPrompt({}, "", fixedRng);
    const output = parseSecretSocietyResponse("{}", prompt.resolved);

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

  it("separates session context from the preceding prompt sentence", () => {
    const prompt = buildSecretSocietyPrompt(
      {},
      "Existing campaign elements: Saltwatch.",
      fixedRng,
    );
    expect(prompt.userMessage).toContain(
      "\nExisting campaign elements: Saltwatch.",
    );
  });
});
