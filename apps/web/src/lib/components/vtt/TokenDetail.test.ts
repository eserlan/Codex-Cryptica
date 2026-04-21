/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TokenDetail from "./TokenDetail.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { mapStore } from "$lib/stores/map.svelte";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: {},
  },
}));

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: {
    isGMMode: false,
    activeMapId: "map-1",
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

describe("TokenDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapSession.clearSession();
    mapSession.bindToMap("map-1");
    mapSession.setVttEnabled(true);
    mapSession.tokens = {
      "token-1": {
        id: "token-1",
        entityId: null,
        name: "Goblin",
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        rotation: 0,
        zIndex: 0,
        ownerPeerId: null,
        ownerGuestName: null,
        visibleTo: "all",
        color: "#f59e0b",
        imageUrl: null,
        statusEffects: [],
      } as any,
    };
    mapSession.setSelection("token-1");
  });

  it("hides management and metadata blocks for guests", async () => {
    const { uiStore } = await import("$lib/stores/ui.svelte");
    uiStore.isGuestMode = true;
    mapStore.isGMMode = false;
    mapSession.tokens["token-1"].entityId = "entity-1";

    render(TokenDetail);

    await waitFor(() => expect(screen.getByText("Goblin")).toBeTruthy());

    expect(screen.queryByRole("button", { name: "Remove Token" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Add to Initiative" }),
    ).toBeNull();
    expect(screen.queryByText("Linked Entity")).toBeNull();
    expect(screen.queryByText("Owner")).toBeNull();
    expect(screen.queryByText("Read-only view for guests")).toBeNull();
  });

  it("removes the token directly in GM mode", async () => {
    mapStore.isGMMode = true;
    const { uiStore } = await import("$lib/stores/ui.svelte");
    uiStore.isGuestMode = false;
    render(TokenDetail);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove Token" })).toBeTruthy(),
    );

    await fireEvent.click(screen.getByRole("button", { name: "Remove Token" }));

    await waitFor(() => expect(mapSession.tokens["token-1"]).toBeUndefined());
  });

  it("shows a host-only reveal button for tokens with an image", async () => {
    mapStore.isGMMode = true;
    const { uiStore } = await import("$lib/stores/ui.svelte");
    uiStore.isGuestMode = false;
    const revealSpy = vi.spyOn(mapSession, "showTokenImageToPlayers");
    mapSession.tokens["token-1"].imageUrl = "images/goblin.webp";

    render(TokenDetail);

    const button = await screen.findByRole("button", {
      name: "Show token image to players",
    });
    await fireEvent.click(button);

    expect(revealSpy).toHaveBeenCalledWith("token-1");
  });

  it("hides add to initiative when the token is already in initiative", async () => {
    mapStore.isGMMode = true;
    const { uiStore } = await import("$lib/stores/ui.svelte");
    uiStore.isGuestMode = false;
    mapSession.initiativeOrder = ["token-1"];
    mapSession.initiativeValues = { "token-1": 12 };

    render(TokenDetail);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove Token" })).toBeTruthy(),
    );

    expect(
      screen.queryByRole("button", { name: "Add to Initiative" }),
    ).toBeNull();
  });
});
