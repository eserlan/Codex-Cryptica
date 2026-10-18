import { describe, expect, it, vi } from "vitest";
import {
  exitAdventureFullscreen,
  requestAdventureFullscreen,
} from "./adventure-fullscreen";

describe("adventure fullscreen helpers", () => {
  it("enters fullscreen when the browser accepts the user-triggered request", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);

    await expect(
      requestAdventureFullscreen({ requestFullscreen }),
    ).resolves.toBe(true);
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it("keeps the adventure usable when fullscreen is unavailable or denied", async () => {
    await expect(requestAdventureFullscreen({})).resolves.toBe(false);
    await expect(
      requestAdventureFullscreen({
        requestFullscreen: vi.fn().mockRejectedValue(new Error("denied")),
      }),
    ).resolves.toBe(false);
  });

  it("exits an active browser fullscreen view before leaving Focus Mode", async () => {
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);

    await exitAdventureFullscreen({
      fullscreenElement: document.createElement("div"),
      exitFullscreen,
    });

    expect(exitFullscreen).toHaveBeenCalledOnce();
  });
});
