/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import RegionSettings from "./RegionSettings.svelte";

describe("RegionSettings", () => {
  it("lists the five landscapes with the current one chosen", () => {
    render(RegionSettings, {
      settings: { preset: "temperate", levels: {} },
      onPreset: vi.fn(),
      onLevel: vi.fn(),
    });
    const select = screen.getByLabelText("Landscape") as HTMLSelectElement;
    expect([...select.options].map((o) => o.text)).toEqual([
      "Temperate",
      "Coastal",
      "Highlands",
      "Arid",
      "Frozen",
    ]);
    expect(select.value).toBe("temperate");
  });

  it("reports a landscape change and a level change", async () => {
    const onPreset = vi.fn();
    const onLevel = vi.fn();
    render(RegionSettings, {
      settings: { preset: "temperate", levels: { forest: "less" } },
      onPreset,
      onLevel,
    });
    await fireEvent.change(screen.getByLabelText("Landscape"), {
      target: { value: "arid" },
    });
    expect(onPreset).toHaveBeenCalledWith("arid");
    const forest = screen.getByLabelText("Forest amount") as HTMLSelectElement;
    expect(forest.value).toBe("less");
    await fireEvent.change(forest, { target: { value: "none" } });
    expect(onLevel).toHaveBeenCalledWith("forest", "none");
  });
});
