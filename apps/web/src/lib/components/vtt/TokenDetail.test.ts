/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TokenDetail from "./TokenDetail.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { guestRoster } from "$lib/stores/guest";
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
  },
}));

describe("TokenDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guestRoster.set({});
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
        visibleTo: "all",
        color: "#f59e0b",
        imageUrl: null,
      } as any,
    };
    mapSession.setSelection("token-1");
  });

  it("shows a read-only view for guests", async () => {
    const { uiStore } = await import("$lib/stores/ui.svelte");
    uiStore.isGuestMode = true;
    mapStore.isGMMode = false;

    render(TokenDetail);

    await waitFor(() =>
      expect(screen.getByText("Read-only view for guests")).toBeTruthy(),
    );

    expect(screen.queryByRole("button", { name: "Remove Token" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Add to Initiative" }),
    ).toBeNull();
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
});
