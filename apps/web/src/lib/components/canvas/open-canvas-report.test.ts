import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/svelte";
import type { Canvas } from "@codex/canvas-engine";

const { notify, vaultState } = vi.hoisted(() => ({
  notify: vi.fn(),
  vaultState: {
    isGuest: false,
    entities: {
      a: {
        id: "a",
        type: "character",
        title: "A",
        labels: [],
        connections: [],
        content: "",
      },
    } as Record<string, unknown>,
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({ vault: vaultState }));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify },
}));

import { reportPanelStore } from "$lib/stores/ui/report-panel.svelte";
import {
  canGenerateCanvasReport,
  openCanvasReport,
} from "./open-canvas-report";

const entityNode = (selected = false): Node => ({
  id: "n1",
  type: "entity",
  position: { x: 0, y: 0 },
  data: { entityId: "a" },
  selected,
});
const canvas = (metadata: Record<string, unknown> = {}) =>
  ({
    id: "cv",
    name: "Party",
    nodes: [],
    edges: [],
    metadata,
  }) as unknown as Canvas;

describe("canGenerateCanvasReport", () => {
  beforeEach(() => {
    vaultState.isGuest = false;
  });

  it("is true for an entity-linking canvas", () => {
    expect(canGenerateCanvasReport(canvas(), [entityNode()])).toBe(true);
  });

  it("is false for adventure canvases, guests and canvases without entities", () => {
    expect(
      canGenerateCanvasReport(canvas({ kind: "adventure" }), [entityNode()]),
    ).toBe(false);
    expect(canGenerateCanvasReport(canvas(), [])).toBe(false);
    vaultState.isGuest = true;
    expect(canGenerateCanvasReport(canvas(), [entityNode()])).toBe(false);
  });
});

describe("openCanvasReport", () => {
  beforeEach(() => {
    reportPanelStore.close();
    notify.mockClear();
  });

  it("opens the panel with a rescope for the selected scope", () => {
    openCanvasReport(
      canvas(),
      () => [entityNode(true)],
      () => [],
    );
    expect(reportPanelStore.request?.source).toMatchObject({
      origin: "canvas",
      selection: "entire",
    });
    expect(
      reportPanelStore.request?.rescope?.("selected").source,
    ).toMatchObject({
      selection: "selected",
      entityIds: ["a"],
    });
  });

  it("explains and opens nothing when the canvas has no entities", () => {
    openCanvasReport(
      canvas(),
      () => [],
      () => [],
    );
    expect(reportPanelStore.request).toBeNull();
    expect(notify).toHaveBeenCalled();
  });
});
