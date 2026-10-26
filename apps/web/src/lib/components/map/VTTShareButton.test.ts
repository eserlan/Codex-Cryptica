/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

vi.mock("#lib/cloud-bridge/p2p/host-service.svelte.js", () => ({
  p2pHost: {
    startHosting: vi.fn().mockResolvedValue("peer-123"),
  },
}));

vi.mock("#lib/stores/map-session.svelte.js", () => ({
  mapSession: {
    vttEnabled: true,
  },
}));

import VTTShareButton from "./VTTShareButton.svelte";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";

describe("VTTShareButton", () => {
  beforeEach(() => {
    sessionModeStore.isGuestMode = false;
  });

  it("emits a share request", async () => {
    const onShare = vi.fn();
    render(VTTShareButton, { onShare });

    await fireEvent.click(
      screen.getByRole("button", { name: "Share Campaign" }),
    );

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("hides for guests", async () => {
    sessionModeStore.isGuestMode = true;

    render(VTTShareButton);

    expect(screen.queryByRole("button", { name: "Share Campaign" })).toBeNull();
  });
});
