/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TemporalPickerEras from "./TemporalPickerEras.svelte";

describe("TemporalPickerEras", () => {
  it("selects an era", async () => {
    const onSelect = vi.fn();
    const era = {
      id: "golden",
      name: "Golden Age",
      start_year: 100,
      end_year: 200,
      color: "#ffd700",
    };
    render(TemporalPickerEras, { eras: [era], onSelect });
    await fireEvent.click(screen.getByRole("button", { name: /golden age/i }));
    expect(onSelect).toHaveBeenCalledWith(era);
  });

  it("shows an empty state when no eras exist", () => {
    render(TemporalPickerEras, { eras: [], onSelect: vi.fn() });
    expect(screen.getByText("No Eras Defined")).toBeTruthy();
  });
});
