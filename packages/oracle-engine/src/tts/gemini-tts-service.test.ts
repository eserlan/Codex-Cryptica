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

  it("uses the injected fetcher instead of the global fetch", async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
    const injected = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("boom"),
    });

    const svc = new GeminiTTSService(injected as any);
    const result = await svc.synthesize("hello", voice, "api-key");

    expect(injected).toHaveBeenCalledOnce();
    expect(globalFetch).not.toHaveBeenCalled();
    expect(result).toBeNull(); // non-ok response degrades to null

    vi.unstubAllGlobals();
  });
});
