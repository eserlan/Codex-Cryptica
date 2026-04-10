import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EncounterManager from "./EncounterManager.svelte";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

if (!HTMLElement.prototype.animate) {
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(() => ({ onfinish: null, cancel: vi.fn() })),
  });
}

const mocks = vi.hoisted(() => ({
  refreshEncounterSnapshots: vi.fn().mockResolvedValue([]),
  saveEncounterSnapshot: vi.fn().mockResolvedValue(undefined),
  deleteEncounterSnapshot: vi.fn().mockResolvedValue(undefined),
  loadEncounterSnapshot: vi.fn().mockResolvedValue(undefined),
  startNewEncounter: vi.fn(),
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {
    mapId: "map-1",
    name: "Goblin Ambush",
    snapshots: [
      {
        id: "enc-1",
        name: "Ruined Gate",
        mapId: "map-1",
        savedAt: 123,
        tokenCount: 2,
        round: 3,
        mode: "combat",
      },
    ],
    refreshEncounterSnapshots: mocks.refreshEncounterSnapshots,
    saveEncounterSnapshot: mocks.saveEncounterSnapshot,
    deleteEncounterSnapshot: mocks.deleteEncounterSnapshot,
    loadEncounterSnapshot: mocks.loadEncounterSnapshot,
    startNewEncounter: mocks.startNewEncounter,
  },
}));

describe("EncounterManager", () => {
  const close = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("saves and loads encounters", async () => {
    render(EncounterManager, { close });

    expect(
      (screen.getByLabelText("Encounter Name") as HTMLInputElement).value,
    ).toBe("Goblin Ambush");
    expect(screen.getByText("Ruined Gate")).toBeTruthy();
    expect(screen.queryByText("enc-1")).toBeNull();

    await fireEvent.click(
      screen.getByRole("button", { name: "Save Current Encounter" }),
    );

    await waitFor(() =>
      expect(mocks.saveEncounterSnapshot).toHaveBeenCalledWith(),
    );
    expect(mocks.refreshEncounterSnapshots).toHaveBeenCalled();

    await fireEvent.click(
      screen.getByRole("button", { name: "New Encounter" }),
    );
    expect(mocks.startNewEncounter).toHaveBeenCalledWith();

    await fireEvent.click(screen.getByRole("button", { name: "Load" }));
    await waitFor(() =>
      expect(mocks.loadEncounterSnapshot).toHaveBeenCalledWith("enc-1"),
    );
    expect(close).toHaveBeenCalled();
  });

  it("deletes encounters after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(EncounterManager, { close });

    await fireEvent.click(
      screen.getByRole("button", { name: "Delete Ruined Gate" }),
    );

    await waitFor(() =>
      expect(mocks.deleteEncounterSnapshot).toHaveBeenCalledWith("enc-1"),
    );
    expect(mocks.refreshEncounterSnapshots).toHaveBeenCalled();
  });

  it("closes on Escape and backdrop click", async () => {
    render(EncounterManager, { close });

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);

    close.mockClear();
    const backdrop = screen.getByTestId("encounter-manager-backdrop");
    await fireEvent.click(backdrop);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
