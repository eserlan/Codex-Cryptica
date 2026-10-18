import { describe, it, expect, vi, afterEach } from "vitest";
import { classifyApiError } from "./api-error-classifier";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("classifyApiError", () => {
  it("returns offline when navigator.onLine is false", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const result = classifyApiError(new Error("fetch failed"));
    expect(result.type).toBe("offline");
    expect(result.message).toContain("offline");
  });

  it("returns rate-limit for 429 errors", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const result = classifyApiError(new Error("429 Too Many Requests"));
    expect(result.type).toBe("rate-limit");
    expect(result.message).toContain("wait");
  });

  it("returns rate-limit for rate limit message", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const result = classifyApiError(new Error("API rate-limit exceeded"));
    expect(result.type).toBe("rate-limit");
  });

  it("preserves explicit proxy daily image limit guidance", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const result = classifyApiError(
      new Error(
        "Proxy Cloudflare Image Generation Error (@cf/model): Daily image generation limit exceeded. Please try again tomorrow, or configure your own Cloudflare Account ID and API Token in settings.",
      ),
    );

    expect(result.type).toBe("rate-limit");
    expect(result.message).toBe(
      "Daily image generation limit exceeded. Please try again tomorrow, or configure your own Cloudflare Account ID and API Token in settings.",
    );
  });

  it("returns quota for RESOURCE_EXHAUSTED errors", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const result = classifyApiError(
      new Error("RESOURCE_EXHAUSTED: quota exceeded"),
    );
    expect(result.type).toBe("quota");
    expect(result.message).toContain("quota");
  });

  it("returns quota for quota keyword", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const result = classifyApiError(new Error("Daily quota exceeded"));
    expect(result.type).toBe("quota");
  });

  it("returns safety for safety policy errors", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const result = classifyApiError(new Error("blocked for safety reasons"));
    expect(result.type).toBe("safety");
    expect(result.message).toContain("safety policies");
  });

  it("returns verification for a rejected session token, naming the likely cause", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const result = classifyApiError(
      new Error(
        "[OracleProxy] Request failed: A valid session token is required (code: SESSION_TOKEN_MISSING)",
      ),
    );
    expect(result.type).toBe("verification");
    expect(result.message).toContain("challenges.cloudflare.com");
    expect(result.message).toContain("TURNSTILE_BLOCKED");
  });

  it("returns verification for an invalid or expired session token too", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(
      classifyApiError(
        new Error(
          "[OracleProxy] Interaction failed: bad (code: SESSION_TOKEN_INVALID)",
        ),
      ).type,
    ).toBe("verification");
    expect(
      classifyApiError(
        new Error(
          "[OracleProxy] Request failed: expired (code: SESSION_TOKEN_EXPIRED)",
        ),
      ).type,
    ).toBe("verification");
  });

  it("returns unknown for generic errors with a generic message", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const result = classifyApiError(new Error("Internal server error"));
    expect(result.type).toBe("unknown");
    expect(result.message).toBe("Generation failed. Please try again.");
    expect(result.message).not.toContain("Internal server error");
  });

  it("handles non-Error values with a generic message", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const result = classifyApiError("something went wrong");
    expect(result.type).toBe("unknown");
    expect(result.message).toBe("Generation failed. Please try again.");
  });
});
