/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

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

import { uiStore } from "$lib/stores/ui.svelte";
import GuestSessionBootstrap from "./GuestSessionBootstrap.svelte";

describe("GuestSessionBootstrap", () => {
  beforeEach(() => {
    window.localStorage.clear();
    uiStore.guestUsername = null;
    uiStore.isGuestMode = false;
  });

  it("shows the guest login modal when opening a shared map link", () => {
    render(GuestSessionBootstrap);

    expect(screen.getByText("Shared Campaign")).toBeTruthy();
    expect(screen.getByRole("button", { name: "JOIN" })).toBeTruthy();
  });
});
