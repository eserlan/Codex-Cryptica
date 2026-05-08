import { describe, it, expect, vi } from "vitest";
import {
  buildP2PShareLink,
  copyTextToClipboard,
  startShareSession,
} from "./share-link";

describe("share-link helpers", () => {
  it("should build a p2p share link", () => {
    expect(
      buildP2PShareLink("https://example.com", "/campaign", "peer-123", "map"),
    ).toBe("https://example.com/campaign?shareId=p2p-peer-123&view=map");
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

  it("should copy the share link before waiting for host readiness", async () => {
    const onLink = vi.fn();
    const onCopied = vi.fn();
    const copy = vi.fn().mockResolvedValue(true);
    let resolveHost: (peerId: string) => void = () => {};

    const startHosting = vi.fn((onPeerId?: (peerId: string) => void) => {
      onPeerId?.("peer-123");
      return new Promise<string>((resolve) => {
        resolveHost = resolve;
      });
    });

    const sessionPromise = startShareSession({
      origin: "https://example.com",
      pathname: "/campaign",
      view: "campaign",
      startHosting,
      clipboard: { writeText: copy },
      onLink,
      onCopied,
    });

    expect(startHosting).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledWith(
      "https://example.com/campaign?shareId=p2p-peer-123&view=campaign",
    );
    expect(onLink).toHaveBeenCalledWith(
      "https://example.com/campaign?shareId=p2p-peer-123&view=campaign",
    );

    resolveHost("peer-123");
    await expect(sessionPromise).resolves.toBe("peer-123");
    expect(onCopied).toHaveBeenCalledWith(true);
  });
});
