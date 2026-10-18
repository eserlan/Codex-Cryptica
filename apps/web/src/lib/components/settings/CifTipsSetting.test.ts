/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CifTipsSetting from "./CifTipsSetting.svelte";

describe("CifTipsSetting (spec 176, FR-001 to FR-004)", () => {
  it("shows an unchecked switch labelled Show tips from Cif when off", () => {
    render(CifTipsSetting, {
      props: { aiAvailable: true, enabled: false, onToggle: vi.fn() },
    });
    const box = screen.getByRole("checkbox", {
      name: /Show tips from Cif/,
    }) as HTMLInputElement;
    expect(box.checked).toBe(false);
  });

  it("reports the new state when toggled", async () => {
    const onToggle = vi.fn();
    render(CifTipsSetting, {
      props: { aiAvailable: true, enabled: false, onToggle },
    });
    const box = screen.getByRole("checkbox", { name: /Show tips from Cif/ });
    await fireEvent.click(box);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("is hidden entirely when AI is unavailable, so it cannot be turned on (negative)", () => {
    const { container } = render(CifTipsSetting, {
      props: { aiAvailable: false, enabled: false, onToggle: vi.fn() },
    });
    expect(
      container.querySelector('[data-testid="cif-tips-setting"]'),
    ).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
