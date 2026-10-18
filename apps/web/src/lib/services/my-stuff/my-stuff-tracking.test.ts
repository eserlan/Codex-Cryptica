import { describe, expect, it, vi } from "vitest";
import {
  trackMyStuffOpened,
  trackMyStuffItemOpened,
  trackMyStuffShareLinkCopied,
  trackMyStuffShareRevoked,
  trackMyStuffLikedRemoved,
} from "./my-stuff-tracking";

describe("my-stuff-tracking", () => {
  it("emits my_stuff_opened with selected tab", () => {
    const track = vi.fn();
    const win = { zaraz: { track } };

    trackMyStuffOpened("shared", win);
    expect(track).toHaveBeenCalledWith(
      "my_stuff_opened",
      expect.objectContaining({ tab: "shared" }),
    );
  });

  it("emits my_stuff_item_opened with item kind and id", () => {
    const track = vi.fn();
    const win = { zaraz: { track } };

    trackMyStuffItemOpened("answer", "mystery-slug", win);
    expect(track).toHaveBeenCalledWith(
      "my_stuff_item_opened",
      expect.objectContaining({ kind: "answer", id: "mystery-slug" }),
    );
  });

  it("emits my_stuff_share_link_copied with share_id", () => {
    const track = vi.fn();
    const win = { zaraz: { track } };

    trackMyStuffShareLinkCopied("share-123", win);
    expect(track).toHaveBeenCalledWith(
      "my_stuff_share_link_copied",
      expect.objectContaining({ share_id: "share-123" }),
    );
  });

  it("emits my_stuff_share_revoked with share_id", () => {
    const track = vi.fn();
    const win = { zaraz: { track } };

    trackMyStuffShareRevoked("share-123", win);
    expect(track).toHaveBeenCalledWith(
      "my_stuff_share_revoked",
      expect.objectContaining({ share_id: "share-123" }),
    );
  });

  it("emits my_stuff_liked_removed with slug", () => {
    const track = vi.fn();
    const win = { zaraz: { track } };

    trackMyStuffLikedRemoved("mystery-slug", win);
    expect(track).toHaveBeenCalledWith(
      "my_stuff_liked_removed",
      expect.objectContaining({ slug: "mystery-slug" }),
    );
  });

  it("fails silently when zaraz is not present", () => {
    expect(() => trackMyStuffOpened("liked", {})).not.toThrow();
  });
});
