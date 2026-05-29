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
import GuestSessionBootstrap from "./GuestSessionBootstrap.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

describe("GuestSessionBootstrap", () => {
  beforeEach(() => {
    window.localStorage.clear();
    sessionModeStore.guestUsername = null;
    sessionModeStore.isGuestMode = false;
  });

  it("shows the guest login modal when opening a shared map link", () => {
    render(GuestSessionBootstrap);

    expect(screen.getByText("Shared Campaign")).toBeTruthy();
    expect(screen.getByRole("button", { name: "JOIN" })).toBeTruthy();
  });
});
