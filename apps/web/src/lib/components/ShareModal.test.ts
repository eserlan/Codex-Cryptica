/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ShareModal from "./ShareModal.svelte";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/utils/guest-session", () => ({
  getGuestViewFromPathname: vi.fn(() => "campaign"),
  normalizeGuestView: vi.fn((view: string | null | undefined) => view ?? null),
}));

vi.mock("$lib/cloud-bridge/p2p/host-service.svelte", () => ({
  p2pHost: {
    isHosting: true,
    activePeerId: "peer-123",
    startHosting: vi.fn().mockResolvedValue("peer-123"),
  },
}));

describe("ShareModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/map");
  });

  it("shows the existing live session link without restarting hosting", async () => {
    const close = vi.fn();
    render(ShareModal, { close });

    const input = await screen.findByLabelText("Active Live Session");
    expect((input as HTMLInputElement).value).toBe(
      `${window.location.origin}/map?shareId=p2p-peer-123&view=campaign`,
    );

    const { p2pHost } =
      await import("$lib/cloud-bridge/p2p/host-service.svelte");
    expect(p2pHost.startHosting).not.toHaveBeenCalled();
  });
});
