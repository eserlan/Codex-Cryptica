/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HexTerrainPicker from "./HexTerrainPicker.svelte";

describe("HexTerrainPicker", () => {
  it("offers nine presets, and choosing one reports it", async () => {
    const onChoose = vi.fn();
    render(HexTerrainPicker, { terrain: undefined, onChoose });

    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(9);
    await fireEvent.click(screen.getByRole("button", { name: "Forest" }));

    expect(onChoose).toHaveBeenCalledWith({ kind: "preset", id: "forest" });
  });

  it("accepts a trimmed custom name", async () => {
    const onChoose = vi.fn();
    render(HexTerrainPicker, { terrain: undefined, onChoose });

    await fireEvent.click(screen.getByRole("button", { name: "Custom…" }));
    const field = screen.getByLabelText("Custom terrain name");
    await fireEvent.input(field, { target: { value: "  Ash fields  " } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Use custom terrain" }),
    );

    expect(onChoose).toHaveBeenCalledWith({
      kind: "custom",
      label: "Ash fields",
    });
  });

  it("rejects a blank or over-long custom name without choosing", async () => {
    const onChoose = vi.fn();
    render(HexTerrainPicker, { terrain: undefined, onChoose });

    await fireEvent.click(screen.getByRole("button", { name: "Custom…" }));
    const field = screen.getByLabelText("Custom terrain name");
    await fireEvent.input(field, { target: { value: "   " } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Use custom terrain" }),
    );
    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("1 to 40");

    await fireEvent.input(field, { target: { value: "x".repeat(41) } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Use custom terrain" }),
    );
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("clears the terrain with Clear", async () => {
    const onChoose = vi.fn();
    render(HexTerrainPicker, {
      terrain: { kind: "preset", id: "water" },
      onChoose,
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Clear terrain" }),
    );
    expect(onChoose).toHaveBeenCalledWith(null);
  });
});
