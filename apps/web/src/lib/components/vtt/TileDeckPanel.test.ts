/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const mapSessionMock = vi.hoisted(() => ({
  tileDecks: [] as any[],
  createTileDeck: vi.fn(),
  drawAnyTile: vi.fn(),
  setTileDeckStocking: vi.fn(),
}));

const randomSourcesMock = vi.hoisted(() => ({
  tables: [] as any[],
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
vi.mock("$lib/features/random", () => ({
  randomSources: randomSourcesMock,
  ensureRandomSourcesLoaded: vi.fn(async () => {}),
}));
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

describe("TileDeckPanel stocking", () => {
  function setUpDeck(stocking?: any) {
    mapSessionMock.setTileDeckStocking.mockClear();
    mapSessionMock.tileDecks = [
      {
        id: "deck-1",
        name: "Rooms",
        hardEdges: false,
        tiles: [{ id: "tile-1", name: "Crypt", imagePath: "crypt.png" }],
        stocking,
      },
    ];
    randomSourcesMock.tables = [
      { id: "table-1", name: "Dungeon dressing" },
      { id: "table-2", name: "Wandering monsters" },
    ];
  }

  it("defaults a deck with no setting to placing the tile only", () => {
    setUpDeck(undefined);
    render(TileDeckPanel);

    const noneBtn = screen.getByRole("button", { name: "None" });
    expect(noneBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByLabelText("Source Table")).toBeNull();
  });

  it("preselects the first table when the GM switches to rolling one", async () => {
    setUpDeck(undefined);
    render(TileDeckPanel);

    const tableRollBtn = screen.getByRole("button", { name: "Table Roll" });
    await fireEvent.click(tableRollBtn);

    expect(mapSessionMock.setTileDeckStocking).toHaveBeenCalledWith("deck-1", {
      mode: "table",
      tableId: "table-1",
    });
  });

  it("shows the deck's table and changes which one it rolls", async () => {
    setUpDeck({ mode: "table", tableId: "table-1" });
    render(TileDeckPanel);

    const picker = screen.getByLabelText("Source Table") as HTMLSelectElement;
    expect(picker.value).toBe("table-1");

    await fireEvent.change(picker, { target: { value: "table-2" } });
    expect(mapSessionMock.setTileDeckStocking).toHaveBeenCalledWith("deck-1", {
      mode: "table",
      tableId: "table-2",
    });
  });

  it("says so when the vault has no tables to roll", () => {
    setUpDeck({ mode: "table", tableId: "table-1" });
    randomSourcesMock.tables = [];
    render(TileDeckPanel);

    expect(screen.getByText(/No random tables found in vault/)).not.toBeNull();
  });

  it("hides the table picker for the encounter mode and explains the pinned note", async () => {
    setUpDeck({ mode: "encounter" });
    render(TileDeckPanel);

    expect(screen.queryByLabelText("Source Table")).toBeNull();
    expect(
      screen.getByText(/Pins an empty encounter note on placed tiles/),
    ).not.toBeNull();
  });

  it("keeps the chosen table when the frequency changes", async () => {
    setUpDeck({ mode: "table", tableId: "table-2", frequency: 1 });
    render(TileDeckPanel);

    const freqBtn = screen.getByRole("button", {
      name: "On 1 drawn tile in 3",
    });
    expect(freqBtn).not.toBeNull();

    await fireEvent.click(freqBtn);
    expect(mapSessionMock.setTileDeckStocking).toHaveBeenCalledWith("deck-1", {
      mode: "table",
      tableId: "table-2",
      frequency: 3,
    });
  });

  it("offers no frequency until a deck stocks something", () => {
    setUpDeck(undefined);
    render(TileDeckPanel);

    expect(
      screen.queryByRole("group", { name: "Stocking frequency" }),
    ).toBeNull();
  });
});
