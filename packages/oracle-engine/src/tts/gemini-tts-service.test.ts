import { describe, it, expect, vi } from "vitest";
import { GeminiTTSService } from "./gemini-tts-service";
import type { VoiceProfile } from "schema";

const voice: VoiceProfile = {
  gender: "female",
  ageRange: "middle-aged",
  accent: null,
  tone: "warm",
};

describe("GeminiTTSService", () => {
  it("returns null without calling fetch when no API key is provided", async () => {
    const injected = vi.fn();
    const svc = new GeminiTTSService(injected as any);
    const result = await svc.synthesize("hello", voice, "");
    expect(result).toBeNull();
    expect(injected).not.toHaveBeenCalled();
  });

  it("routes the synth request through the injected fetcher", async () => {
    const injected = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("boom"),
    });

    const svc = new GeminiTTSService(injected as any);
    const result = await svc.synthesize("hello", voice, "api-key");

    expect(injected).toHaveBeenCalledOnce();
    // The service only references `this.fetcher`, so the global is never used.
    const [url, init] = injected.mock.calls[0];
    expect(String(url)).toContain("generativelanguage.googleapis.com");
    expect((init as RequestInit).method).toBe("POST");
    expect(result).toBeNull(); // non-ok response degrades to null
  });
});
