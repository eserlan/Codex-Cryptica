/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mapStore: {
    pins: [
      { id: "pin-1", entityId: "e1", coordinates: { x: 10, y: 10 } },
    ] as unknown[],
    showFog: true,
    fogOpaque: true,
    fogRevision: 0,
    showLabels: true,
    canvasSize: { width: 800, height: 600 },
    project: (p: { x: number; y: number }) => ({ x: p.x + 100, y: p.y + 100 }),
    getEntitySubMap: () => null,
    gridType: "square",
    pendingPinCoords: null,
  },
  mapSession: { armedTile: null, tokens: {} },
  vault: { entities: { e1: { title: "The Red Hand" } } },
}));

vi.mock("$lib/stores/map.svelte", () => ({ mapStore: mocks.mapStore }));
vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mocks.mapSession,
}));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: mocks.vault }));
vi.mock("./PinLinker.svelte", () => ({ default: () => ({}) }));
vi.mock("./MapPinPopover.svelte", () => ({ default: () => ({}) }));
vi.mock("./TokenHealthBarPopover.svelte", () => ({ default: () => ({}) }));

import MapOverlays from "./MapOverlays.svelte";

let revealed = true;
const interactions = {
  selectedPinId: null,
  healthBarPopoverTokenId: null,
  gridFitStart: null,
  gridFitEnd: null,
  boxSelectStart: null,
  boxSelectEnd: null,
  painter: { isRevealedAt: vi.fn(() => revealed) },
} as never;

const labelShown = (container: HTMLElement) =>
  container.textContent?.includes("The Red Hand") ?? false;

beforeEach(() => {
  revealed = true;
  mocks.mapStore.showFog = true;
  mocks.mapStore.fogOpaque = true;
});

describe("MapOverlays pin labels under fog", () => {
  it("shows a label where the map is revealed", () => {
    const { container } = render(MapOverlays, { interactions });

    expect(labelShown(container)).toBe(true);
  });

  it("hides a label whose spot is under solid fog, so its name does not leak", () => {
    revealed = false;
    const { container } = render(MapOverlays, { interactions });

    expect(labelShown(container)).toBe(false);
  });

  it("keeps the label hidden while the mask is unavailable, then shows it after reveal", async () => {
    revealed = false;
    const view = render(MapOverlays, { interactions });
    expect(labelShown(view.container)).toBe(false);

    revealed = true;
    mocks.mapStore.fogRevision++;
    const currentInteractions = interactions as Record<string, unknown>;
    await view.rerender({
      interactions: {
        ...currentInteractions,
        painter: { isRevealedAt: vi.fn(() => revealed) },
      } as never,
    });
    expect(labelShown(view.container)).toBe(true);
  });

  it("keeps the label when the GM sees translucent fog and can see the spot anyway", () => {
    revealed = false;
    mocks.mapStore.fogOpaque = false;
    const { container } = render(MapOverlays, { interactions });

    expect(labelShown(container)).toBe(true);
  });

  it("keeps the label when fog is off", () => {
    revealed = false;
    mocks.mapStore.showFog = false;
    const { container } = render(MapOverlays, { interactions });

    expect(labelShown(container)).toBe(true);
  });
});
