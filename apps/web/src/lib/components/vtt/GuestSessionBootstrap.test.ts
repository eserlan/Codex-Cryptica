/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
  building: false,
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$app/state", () => ({
  page: {
    url: new URL("https://example.com/map?shareId=p2p-guest-123&view=map"),
  },
}));

let capturedOnGraphData: ((graph: unknown) => void) | null = null;

vi.mock("$lib/cloud-bridge/p2p/guest-service", () => ({
  p2pGuestService: {
    connectToHost: vi.fn((_hostId, onGraphData) => {
      capturedOnGraphData = onGraphData;
      return new Promise(() => {});
    }),
    leaveSession: vi.fn(),
    updateGuestStatus: vi.fn(),
  },
}));

import GuestSessionBootstrap from "./GuestSessionBootstrap.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { vault } from "$lib/stores/vault.svelte";

describe("GuestSessionBootstrap", () => {
  beforeEach(() => {
    window.localStorage.clear();
    sessionModeStore.guestUsername = null;
    sessionModeStore.isGuestMode = false;
    capturedOnGraphData = null;
  });

  it("shows the guest login modal when opening a shared map link", () => {
    render(GuestSessionBootstrap);

    expect(screen.getByText("Shared Campaign")).toBeTruthy();
    expect(screen.getByRole("button", { name: "JOIN" })).toBeTruthy();
  });

  it("normalizes entity ids and _path when syncing a valid graph payload", async () => {
    sessionModeStore.guestUsername = "Tester";
    render(GuestSessionBootstrap);

    expect(capturedOnGraphData).toBeTruthy();

    capturedOnGraphData?.({
      entities: {
        "entity-1": { title: "Foo", _path: "root/entity-1" },
        "entity-2": { title: "Bar", _path: ["root", "entity-2"] },
      },
    });

    expect(vault.repository.entities["entity-1"]).toMatchObject({
      id: "entity-1",
      title: "Foo",
      _path: ["root/entity-1"],
    });
    expect(vault.repository.entities["entity-2"]).toMatchObject({
      id: "entity-2",
      title: "Bar",
      _path: ["root", "entity-2"],
    });
    expect(vault.status).toBe("idle");
  });

  it("sets an error state instead of clearing the vault on a malformed graph payload", async () => {
    sessionModeStore.guestUsername = "Tester";
    render(GuestSessionBootstrap);

    vault.repository.entities = {
      "existing-entity": { id: "existing-entity", title: "Existing" },
    } as unknown as typeof vault.repository.entities;

    capturedOnGraphData?.({});

    expect(vault.status).toBe("error");
    expect(vault.errorMessage).toBeTruthy();
    expect(vault.repository.entities["existing-entity"]).toBeTruthy();
  });
});
