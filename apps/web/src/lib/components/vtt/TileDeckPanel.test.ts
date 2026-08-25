/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const mapSessionMock = vi.hoisted(() => ({
  tileDecks: [] as any[],
  createTileDeck: vi.fn(),
  drawAnyTile: vi.fn(),
}));

const vaultMock = vi.hoisted(() => ({
  importFileToVault: vi.fn(),
  resolveImageUrl: vi.fn(),
}));

const tileDeckPanelUIStoreMock = vi.hoisted(() => ({
  catalogCollapsed: false,
  toggleCatalog: vi.fn(),
  isGridExpanded: vi.fn(() => false),
  toggleGrid: vi.fn(),
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mapSessionMock,
}));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: vaultMock }));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: vi.fn(), confirm: vi.fn() },
}));
vi.mock("$lib/stores/ui/tile-deck-panel-ui.svelte", () => ({
  tileDeckPanelUIStore: tileDeckPanelUIStoreMock,
}));

import TileDeckPanel from "./TileDeckPanel.svelte";

describe("TileDeckPanel image import", () => {
  it("accepts both PNG and JPEG in the file picker", () => {
    render(TileDeckPanel);

    const input = screen.getByLabelText(
      "Tile images (PNG or JPG)",
    ) as HTMLInputElement;

    expect(input.accept).toBe("image/png,image/jpeg");
  });

  it("selects a JPEG tile image for the deck being created", async () => {
    render(TileDeckPanel);

    const input = screen.getByLabelText(
      "Tile images (PNG or JPG)",
    ) as HTMLInputElement;
    const jpeg = new File(["fake"], "corridor.jpg", { type: "image/jpeg" });
    await fireEvent.change(input, { target: { files: [jpeg] } });

    expect(screen.getByText("1 image selected")).not.toBeNull();
  });
});
