/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HexCrawlModeToggle from "./HexCrawlModeToggle.svelte";

function fakeStore(enabled = false) {
  return {
    isEnabled: vi.fn(() => enabled),
    setEnabled: vi.fn(async () => true),
  };
}

describe("HexCrawlModeToggle", () => {
  it("shows the switch for a GM on a pointy hex grid and persists a change", async () => {
    const store = fakeStore(false);
    render(HexCrawlModeToggle, {
      store,
      mapId: "map-1",
      gridType: "hex-pointy",
      isGM: true,
      isGuest: false,
    });

    const toggle = screen.getByRole("switch", { name: "Hex Crawl mode" });
    expect((toggle as HTMLInputElement).checked).toBe(false);

    await fireEvent.click(toggle);
    expect(store.setEnabled).toHaveBeenCalledWith("map-1", true);
  });

  it("is offered on flat hex grids too", () => {
    render(HexCrawlModeToggle, {
      store: fakeStore(true),
      mapId: "map-1",
      gridType: "hex-flat",
      isGM: true,
      isGuest: false,
    });

    expect(
      (
        screen.getByRole("switch", {
          name: "Hex Crawl mode",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it("renders nothing on a square grid", () => {
    render(HexCrawlModeToggle, {
      store: fakeStore(),
      mapId: "map-1",
      gridType: "square",
      isGM: true,
      isGuest: false,
    });

    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("renders nothing for a guest or a non-GM", () => {
    const guest = render(HexCrawlModeToggle, {
      store: fakeStore(),
      mapId: "map-1",
      gridType: "hex-pointy",
      isGM: true,
      isGuest: true,
    });
    expect(screen.queryByRole("switch")).toBeNull();
    guest.unmount();

    render(HexCrawlModeToggle, {
      store: fakeStore(),
      mapId: "map-1",
      gridType: "hex-pointy",
      isGM: false,
      isGuest: false,
    });
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
