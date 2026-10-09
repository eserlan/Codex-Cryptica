/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => {
  const tables: any[] = [
    {
      id: "t1",
      name: "Tavern patrons",
      kind: "table",
      entries: [{ weight: 1, text: "a smuggler" }],
    },
    {
      id: "t2",
      name: "Road encounters",
      kind: "table",
      entries: [{ weight: 1, text: "bandits" }],
    },
    { id: "t3", name: "Empty table", kind: "table", entries: [] },
    {
      id: "t4",
      name: "Weather",
      kind: "table",
      entries: [{ weight: 1, text: "rain" }],
    },
  ];
  return {
    tables,
    randomSources: {
      get tables() {
        return tables;
      },
      roll: vi.fn((source: any) => ({
        finalText: `${source.name} result`,
        chain: [{ dieValue: 1 }],
      })),
    },
    recordTableRoll: vi.fn(async () => {}),
    pins: { pins: [] as string[], pin: vi.fn(() => true), unpin: vi.fn() },
  };
});
vi.mock("$lib/features/random", () => ({ randomSources: env.randomSources }));
vi.mock("$lib/services/record-table-roll", () => ({
  recordTableRoll: env.recordTableRoll,
  tableDie: (_source: any) => ({ sides: 6, label: "d6" }),
}));
vi.mock("$lib/stores/dice-history.svelte", () => ({ diceHistory: {} }));
vi.mock("$lib/stores/solo-session-instance", () => ({
  soloTablePins: env.pins,
}));

import SoloPinnedTables from "./SoloPinnedTables.svelte";

beforeEach(() => {
  env.pins.pins = [];
  env.pins.pin.mockClear();
  env.pins.unpin.mockClear();
  env.randomSources.roll.mockClear();
  env.recordTableRoll.mockClear();
});

describe("SoloPinnedTables", () => {
  it("rolls a pinned table inline and records it like a table-screen roll", async () => {
    env.pins.pins = ["t1"];
    render(SoloPinnedTables);
    await fireEvent.click(screen.getByTestId("solo-pinned-table"));
    await waitFor(() =>
      expect(screen.getByTestId("solo-table-result").textContent).toContain(
        "Tavern patrons result",
      ),
    );
    expect(env.randomSources.roll).toHaveBeenCalledWith(env.tables[0]);
    expect(env.recordTableRoll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("still shows the result, and says so, when the roll cannot be recorded", async () => {
    env.pins.pins = ["t1"];
    env.recordTableRoll.mockRejectedValueOnce(new Error("storage full"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(SoloPinnedTables);
    await fireEvent.click(screen.getByTestId("solo-pinned-table"));
    await waitFor(() =>
      expect(screen.getByTestId("solo-table-result").textContent).toContain(
        "Tavern patrons result",
      ),
    );
    expect(screen.getByTestId("solo-table-note").textContent).toContain(
      "could not be saved",
    );
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("records nothing and says so for a table with no entries", async () => {
    env.pins.pins = ["t3"];
    render(SoloPinnedTables);
    await fireEvent.click(screen.getByTestId("solo-pinned-table"));
    expect(screen.getByText(/has no entries yet/i)).toBeTruthy();
    expect(env.randomSources.roll).not.toHaveBeenCalled();
    expect(env.recordTableRoll).not.toHaveBeenCalled();
  });

  it("lists the vault's tables to pin, and disables the list when 3 are pinned", async () => {
    render(SoloPinnedTables);
    await fireEvent.click(screen.getByTestId("solo-pin-table"));
    const list = screen.getByTestId("solo-pin-table-list");
    expect(within(list).getAllByRole("menuitem")).toHaveLength(4);

    env.pins.pins = ["t1", "t2", "t4"];
    cleanup();
    render(SoloPinnedTables);
    await fireEvent.click(screen.getByTestId("solo-pin-table"));
    expect(
      (screen.getByTestId("solo-pin-table") as HTMLButtonElement).textContent,
    ).toMatch(/Pin a table/);
    expect(screen.getByText(/already pinned three tables/i)).toBeTruthy();
  });

  it("explains how to create a table when the vault has none", async () => {
    env.tables.splice(0, env.tables.length);
    render(SoloPinnedTables);
    await fireEvent.click(screen.getByTestId("solo-pin-table"));
    expect(screen.getByText(/create a random table/i)).toBeTruthy();
    env.tables.push({
      id: "t1",
      name: "Tavern patrons",
      kind: "table",
      entries: [{ weight: 1, text: "a smuggler" }],
    });
  });

  it("unpins a table from the bar", async () => {
    env.pins.pins = ["t1"];
    render(SoloPinnedTables);
    await fireEvent.click(screen.getByTestId("solo-unpin-table"));
    expect(env.pins.unpin).toHaveBeenCalledWith("t1");
  });
});
