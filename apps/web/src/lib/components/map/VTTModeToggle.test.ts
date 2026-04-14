/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

const mapStoreMock = vi.hoisted(() => ({
  gridColor: null as string | null,
}));

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: mapStoreMock,
}));

import { mapSession } from "$lib/stores/map-session.svelte";
import VTTModeToggle from "./VTTModeToggle.svelte";
import VTTGridColorMenu from "./VTTGridColorMenu.svelte";

describe("VTTModeToggle", () => {
  beforeEach(() => {
    mapSession.clearSession();
    mapSession.setVttEnabled(false);
    mapStoreMock.gridColor = null;
  });

  it("toggles VTT mode from the bottom bar", async () => {
    render(VTTModeToggle);

    const toggle = screen.getByRole("button", { name: "Toggle VTT mode" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle.getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("opens a grid color menu on right click and updates the grid color", async () => {
    render(VTTModeToggle);
    render(VTTGridColorMenu);

    const toggle = screen.getByRole("button", { name: "Toggle VTT mode" });
    await fireEvent.mouseDown(toggle, {
      button: 2,
      clientX: 120,
      clientY: 200,
    });

    expect(screen.getByRole("menu", { name: "Grid color menu" })).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("menuitem", { name: "Set grid color to Amber" }),
    );
    expect(mapStoreMock.gridColor).toBe("#fbbf24");
    expect(screen.queryByRole("menu", { name: "Grid color menu" })).toBeNull();
  });

  it("closes the grid color menu with Escape", async () => {
    render(VTTModeToggle);
    render(VTTGridColorMenu);

    const toggle = screen.getByRole("button", { name: "Toggle VTT mode" });
    await fireEvent.mouseDown(toggle, {
      button: 2,
      clientX: 120,
      clientY: 200,
    });

    expect(screen.getByRole("menu", { name: "Grid color menu" })).toBeTruthy();
    await fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("menu", { name: "Grid color menu" }),
      ).toBeNull();
    });
  });
});
