import { describe, expect, it } from "vitest";
import {
  PROVIDER_CAPABILITIES,
  formatForProvider,
  getProviderCapabilities,
} from "./art-direction-providers";

const composed = {
  prompt: "weary veteran officer in a patched coat. painterly oil rendering",
  negativeTerms: ["text", "watermark", "stiff A-pose"],
};

describe("provider adapters", () => {
  it("uses a dedicated negative field where the provider has one", () => {
    for (const provider of ["cloudflare", "custom"] as const) {
      const payload = formatForProvider(composed, provider);
      expect(payload.negativePrompt).toBe("text, watermark, stiff A-pose");
      expect(payload.prompt).toBe(composed.prompt);
      expect(payload.prompt).not.toContain("watermark");
    }
  });

  it("falls back to inline prose for providers without a negative field", () => {
    const payload = formatForProvider(composed, "gemini");
    expect(payload.negativePrompt).toBeUndefined();
    expect(payload.prompt).toContain("Avoid: text, watermark, stiff A-pose.");
  });

  it("defaults to gemini when no provider is given", () => {
    expect(getProviderCapabilities().id).toBe("gemini");
    expect(formatForProvider(composed).prompt).toContain("Avoid:");
  });

  it("emits no negative block when there are no terms", () => {
    const payload = formatForProvider(
      { prompt: "a plain subject", negativeTerms: [] },
      "gemini",
    );
    expect(payload.prompt).toBe("a plain subject");
    expect(payload.negativePrompt).toBeUndefined();
  });

  it("caps the prompt at the provider limit", () => {
    const long = { prompt: "x".repeat(5000), negativeTerms: [] };
    for (const provider of ["gemini", "cloudflare", "custom"] as const) {
      const payload = formatForProvider(long, provider);
      expect(payload.prompt.length).toBeLessThanOrEqual(
        PROVIDER_CAPABILITIES[provider].maxPromptLength,
      );
      expect(payload.truncated).toBe(true);
    }
  });

  it("never truncates the inline negative block itself", () => {
    // Budget is reserved for the suffix, so capping cuts the positive prompt.
    const payload = formatForProvider(
      { prompt: "y".repeat(5000), negativeTerms: composed.negativeTerms },
      "gemini",
    );
    expect(payload.prompt).toContain("Avoid: text, watermark, stiff A-pose.");
    expect(payload.prompt.length).toBeLessThanOrEqual(
      PROVIDER_CAPABILITIES.gemini.maxPromptLength,
    );
  });

  it("marks short prompts as untruncated", () => {
    expect(formatForProvider(composed, "gemini").truncated).toBe(false);
  });
});
