/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapStoreMock = vi.hoisted(() => ({
  showFog: true,
  brushRadius: 50,
}));

vi.mock("#lib/stores/map.svelte.js", () => ({
  mapStore: mapStoreMock,
}));

import MapBrushControls from "./MapBrushControls.svelte";

describe("MapBrushControls", () => {
  beforeEach(() => {
    mapStoreMock.showFog = true;
  });

  it("labels the brush radius slider", () => {
    render(MapBrushControls);

    expect(screen.getByRole("slider", { name: "Brush Size" })).toBeTruthy();
  });

  it("hides the slider when fog controls are disabled", () => {
    mapStoreMock.showFog = false;
    render(MapBrushControls);

    expect(screen.queryByRole("slider", { name: "Brush Size" })).toBeNull();
  });
});
