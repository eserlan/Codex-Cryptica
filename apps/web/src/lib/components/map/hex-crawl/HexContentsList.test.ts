/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HexContentsList from "./HexContentsList.svelte";

const HEX = { q: 1, r: 2 };

const pins = [
  { id: "p1", entityId: "e-tavern", hexCoordinates: { q: 1, r: 2 } },
  { id: "p2", entityId: "e-far", hexCoordinates: { q: 5, r: 5 } },
  { id: "p3", entityId: "e-gone", hexCoordinates: { q: 1, r: 2 } },
  { id: "p4", entityId: undefined, hexCoordinates: { q: 1, r: 2 } },
];

const entities = [
  { id: "e-tavern", title: "The Gilded Hound", type: "location" },
  { id: "e-far", title: "Far Keep", type: "location" },
  { id: "e-smith", title: "Smith Brann", type: "npc" },
];

function setup() {
  const handlers = {
    onOpen: vi.fn(),
    onAttach: vi.fn(),
    onCreate: vi.fn(),
  };
  render(HexContentsList, { pins, hex: HEX, entities, ...handlers });
  return handlers;
}

describe("HexContentsList", () => {
  it("lists only the linked entities pinned to this hex", () => {
    setup();

    expect(screen.getByText("The Gilded Hound")).toBeTruthy();
    expect(screen.queryByText("Far Keep")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("opens an entity from its row", async () => {
    const { onOpen } = setup();

    await fireEvent.click(
      screen.getByRole("button", { name: "Open The Gilded Hound" }),
    );
    expect(onOpen).toHaveBeenCalledWith("e-tavern");
  });

  it("attaches a searched entity", async () => {
    const { onAttach } = setup();

    await fireEvent.input(screen.getByLabelText("Search entities"), {
      target: { value: "smith" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Attach Smith Brann" }),
    );

    expect(onAttach).toHaveBeenCalledWith("e-smith");
  });

  it("creates an entity with the chosen type and a trimmed title", async () => {
    const { onCreate } = setup();

    await fireEvent.change(screen.getByLabelText("Entity type"), {
      target: { value: "event" },
    });
    await fireEvent.input(screen.getByLabelText("New entity title"), {
      target: { value: "  Ambush  " },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Create entity here" }),
    );

    expect(onCreate).toHaveBeenCalledWith("event", "Ambush");
  });

  it("does not create anything from a blank title", async () => {
    const { onCreate } = setup();

    await fireEvent.input(screen.getByLabelText("New entity title"), {
      target: { value: "   " },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Create entity here" }),
    );

    expect(onCreate).not.toHaveBeenCalled();
  });
});
