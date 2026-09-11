import { describe, expect, it } from "vitest";
import { soundBiteService } from "./SoundBiteService.svelte";

// Separate file so vitest gives it its own fresh module registry — the main
// SoundBiteService.test.ts calls initAudioEngine() in beforeEach, which would
// make this guard clause untestable if it shared that module instance.
describe("SoundBiteService before initAudioEngine()", () => {
  it("rejects with a clear error instead of silently doing nothing", async () => {
    // getDeps() throws both in the try body and again inside the catch
    // handler's own logging call, so the rejection propagates rather than
    // being absorbed into the reactive `error` field like other failures.
    await expect(
      soundBiteService.generate(
        { id: "e1", title: "T", content: "" } as any,
        "entity" as any,
        [],
      ),
    ).rejects.toThrow(
      "[AudioEngine] Not initialized. Call initAudioEngine() first.",
    );
  });
});
