/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/cloud-bridge/p2p/host-service.svelte", () => ({
  p2pHost: {
    startHosting: vi.fn().mockResolvedValue("peer-123"),
  },
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    isGuestMode: false,
    openLightbox: vi.fn(),
    closeLightbox: vi.fn(),
    lightbox: { show: false, imageUrl: "", title: "" },
  },
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {
    vttEnabled: true,
  },
}));

import VTTShareButton from "./VTTShareButton.svelte";
import { uiStore } from "$lib/stores/ui.svelte";

describe("VTTShareButton", () => {
  beforeEach(() => {
    uiStore.isGuestMode = false;
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
    uiStore.isGuestMode = true;

    render(VTTShareButton);

    expect(screen.queryByRole("button", { name: "Share Campaign" })).toBeNull();
  });
});
