/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import PresetLayoutActions from "./PresetLayoutActions.svelte";
import PresetLayoutToggle from "./PresetLayoutToggle.svelte";
import type { ViewPreset } from "$lib/stores/view-presets";

const preset = (layout = false): ViewPreset => ({
  id: "p1",
  name: "Faction map",
  createdAt: 1,
  updatedAt: 1,
  state: {
    activeLabels: [],
    labelFilterMode: "OR",
    activeCategories: [],
    ...(layout ? { layout: { positions: { a: { x: 1, y: 1 } } } } : {}),
  },
});

const mount = (over: Record<string, unknown> = {}) => {
  const onSave = vi.fn();
  const onRemove = vi.fn();
  render(PresetLayoutActions, {
    props: { preset: preset(true), isOpen: true, onSave, onRemove, ...over },
  });
  return { onSave, onRemove };
};

describe("PresetLayoutActions", () => {
  it("marks a view that has a layout, with a text alternative", () => {
    mount();
    const marker = screen.getByTestId("view-preset-has-layout");
    expect(marker.getAttribute("aria-label")).toContain("has a saved layout");
  });

  it("shows no marker and no remove button for a filter-only view", () => {
    mount({ preset: preset(false) });
    expect(screen.queryByTestId("view-preset-has-layout")).toBeNull();
    expect(screen.queryByTestId("view-preset-remove-layout")).toBeNull();
  });

  it("updates the layout of a view that has one, naming it in the label", async () => {
    const { onSave } = mount();
    const button = screen.getByRole("button", {
      name: 'Update layout snapshot for "Faction map"',
    });

    await fireEvent.click(button);

    expect(onSave).toHaveBeenCalledWith(preset(true));
  });

  it("offers to save a layout to a view that has none", () => {
    mount({ preset: preset(false) });
    expect(
      screen.getByRole("button", {
        name: 'Save current layout to "Faction map"',
      }),
    ).toBeTruthy();
  });

  it("removes the layout on request", async () => {
    const { onRemove } = mount();

    await fireEvent.click(
      screen.getByRole("button", {
        name: 'Remove saved layout from "Faction map"',
      }),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("cannot update a view that is not the open one, and says to open it (negative)", async () => {
    const { onSave } = mount({ isOpen: false });
    const button = screen.getByTestId(
      "view-preset-update-layout",
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.title).toMatch(/open this view first/i);
    await fireEvent.click(button);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cannot update when a layout is unavailable, and gives the reason (negative)", () => {
    mount({ unavailableReason: "Nothing is shown on the graph yet." });
    const button = screen.getByTestId(
      "view-preset-update-layout",
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.title).toBe("Nothing is shown on the graph yet.");
  });

  it("gives every button a text name", () => {
    mount();
    for (const button of screen.getAllByRole("button")) {
      expect(button.getAttribute("aria-label")).toBeTruthy();
      expect(button.getAttribute("type")).toBe("button");
    }
  });
});

describe("PresetLayoutToggle", () => {
  it("is off by default", () => {
    render(PresetLayoutToggle);
    const box = screen.getByTestId(
      "view-preset-save-layout",
    ) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.disabled).toBe(false);
  });

  it("can be turned on and off", async () => {
    render(PresetLayoutToggle);
    const box = screen.getByLabelText(
      "Save current layout",
    ) as HTMLInputElement;

    await fireEvent.click(box);
    expect(box.checked).toBe(true);
    await fireEvent.click(box);
    expect(box.checked).toBe(false);
  });

  it("is disabled with the reason shown when a layout cannot be saved (negative)", () => {
    render(PresetLayoutToggle, {
      props: { unavailableReason: "Nothing is shown on the graph yet." },
    });

    expect(
      (screen.getByTestId("view-preset-save-layout") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(
      screen.getByTestId("view-preset-layout-reason").textContent,
    ).toContain("Nothing is shown");
  });
});
