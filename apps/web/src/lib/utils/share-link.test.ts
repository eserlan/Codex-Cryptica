import { describe, it, expect, vi } from "vitest";
import { buildP2PShareLink, copyTextToClipboard } from "./share-link";

describe("share-link helpers", () => {
  it("should build a p2p share link", () => {
    expect(
      buildP2PShareLink("https://example.com", "/campaign", "peer-123"),
    ).toBe("https://example.com/campaign?shareId=p2p-peer-123");
  });

  it("should return false when clipboard write fails", async () => {
    const clipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("denied")),
    };

    await expect(copyTextToClipboard("hello", clipboard)).resolves.toBe(false);
    expect(clipboard.writeText).toHaveBeenCalledWith("hello");
  });

  it("should return false when clipboard is unavailable", async () => {
    await expect(copyTextToClipboard("hello", undefined)).resolves.toBe(false);
  });
});
