/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { DelveRoomNodeData } from "generator-engine";
import RoomStockingDrawer from "./RoomStockingDrawer.svelte";

const climaxRoom: DelveRoomNodeData = {
  id: "room-final",
  sectorId: "sector-final",
  sectorName: "The Last Hearth",
  name: "The Ember Reckoning",
  role: "climax",
  summary: "The delve reaches its turning point.",
  description: "Both factions converge on the dying flame.",
  stocking: {
    encounters: ["The rival faction leaders"],
  },
  climax: {
    stakes: "The mountain wakes if the flame is fed.",
    decision: "Extinguish, free, or claim the flame.",
    outcomes: ["The forge dies.", "The mountain wakes."],
  },
};

describe("RoomStockingDrawer", () => {
  it("edits and saves climax-only resolution details", async () => {
    const onSave = vi.fn();
    render(RoomStockingDrawer, {
      props: {
        isOpen: true,
        roomData: climaxRoom,
        onSave,
        onRegenerateAi: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await tick();

    expect(
      screen.getByRole("group", { name: "Climax Resolution" }),
    ).toBeTruthy();
    await fireEvent.input(screen.getByLabelText("Stakes"), {
      target: { value: "The mountain breaks if the flame is claimed." },
    });
    await fireEvent.input(
      screen.getByLabelText("Possible Outcomes (1 per line)"),
      {
        target: { value: "The forge dies.\nThe spirit escapes." },
      },
    );
    await fireEvent.click(screen.getByRole("button", { name: "Save Area" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        climax: {
          stakes: "The mountain breaks if the flame is claimed.",
          decision: "Extinguish, free, or claim the flame.",
          outcomes: ["The forge dies.", "The spirit escapes."],
        },
      }),
    );
  });

  it("omits climax fields and data for an ordinary Area", async () => {
    const onSave = vi.fn();
    render(RoomStockingDrawer, {
      props: {
        isOpen: true,
        roomData: {
          ...climaxRoom,
          role: "hazard",
        },
        onSave,
        onRegenerateAi: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await tick();

    expect(screen.queryByText("Climax Resolution")).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "Save Area" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ climax: undefined }),
    );
  });
});
