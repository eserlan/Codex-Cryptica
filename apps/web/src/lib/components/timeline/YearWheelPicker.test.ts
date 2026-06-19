/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import YearWheelPicker from "./YearWheelPicker.svelte";

describe("YearWheelPicker", () => {
  it("renders the Go and Cancel buttons", () => {
    render(YearWheelPicker, { year: 2030, onClose: vi.fn() });
    expect(screen.getByText("Go")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("Cancel button calls onClose without changing year", async () => {
    const onClose = vi.fn();
    let year = 2030;
    render(YearWheelPicker, {
      get year() {
        return year;
      },
      set year(v) {
        year = v;
      },
      onClose,
    });

    await fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(year).toBe(2030);
  });

  it("Go button calls onClose and updates year to selectedYear", async () => {
    const onClose = vi.fn();
    let year = 2030;
    render(YearWheelPicker, {
      get year() {
        return year;
      },
      set year(v) {
        year = v;
      },
      onClose,
    });

    await fireEvent.click(screen.getByText("Go"));
    expect(onClose).toHaveBeenCalledOnce();
    // selectedYear starts as the initial year value
    expect(year).toBe(2030);
  });

  it("Escape key calls onClose without changing year", async () => {
    const onClose = vi.fn();
    let year = 2030;
    const { container } = render(YearWheelPicker, {
      get year() {
        return year;
      },
      set year(v) {
        year = v;
      },
      onClose,
    });

    await fireEvent.keyDown(container.querySelector("[role=dialog]")!, {
      key: "Escape",
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(year).toBe(2030);
  });

  it("Enter key confirms selection and calls onClose", async () => {
    const onClose = vi.fn();
    let year = 2030;
    const { container } = render(YearWheelPicker, {
      get year() {
        return year;
      },
      set year(v) {
        year = v;
      },
      onClose,
    });

    await fireEvent.keyDown(container.querySelector("[role=dialog]")!, {
      key: "Enter",
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clicking the currently-selected year button confirms and closes", async () => {
    const onClose = vi.fn();
    let year = 2030;
    render(YearWheelPicker, {
      get year() {
        return year;
      },
      set year(v) {
        year = v;
      },
      onClose,
    });

    // The currently-selected year button should be visible (2030 is in the list)
    const yearButtons = screen.getAllByRole("button");
    const yearBtn = yearButtons.find((b) => b.textContent?.trim() === "2030");
    expect(yearBtn).toBeTruthy();

    await fireEvent.click(yearBtn!);
    expect(onClose).toHaveBeenCalledOnce();
    expect(year).toBe(2030);
  });
});
