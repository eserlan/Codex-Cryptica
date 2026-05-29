/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ContextMenu from "./ContextMenu.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("$lib/stores/graph.svelte", () => ({
  graph: {
    setCentralNode: vi.fn(),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    entities: {},
    bulkAddLabel: vi.fn(),
    resolveImageUrl: vi.fn(),
  },
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    drawEntity: vi.fn(),
  },
}));

vi.mock("$lib/services/RegenerationService.svelte", () => ({
  regenerationService: {
    regenerate: vi.fn(),
  },
}));

vi.mock("$lib/stores/canvas-registry.svelte", () => ({
  canvasRegistry: {
    addEntities: vi.fn(),
    createCanvas: vi.fn(),
    canvases: {},
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [],
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openMergeDialog: vi.fn(),
    openBulkLabelDialog: vi.fn(),
    openCanvasSelection: vi.fn(),
    openLightbox: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/connection-mode.svelte", () => ({
  connectionModeStore: {
    startSelectionConnection: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
    confirm: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: {
    aiDisabled: false,
  },
}));

describe("ContextMenu", () => {
  let cxttapHandler: ((event: any) => void) | undefined;

  const createCy = () => ({
    on: vi.fn(
      (
        event: string,
        selectorOrHandler: string | (() => void),
        handler?: () => void,
      ) => {
        if (event === "cxttap" && selectorOrHandler === "node") {
          cxttapHandler = handler as (event: any) => void;
        }
      },
    ),
    off: vi.fn(),
    $: vi.fn().mockReturnValue({
      map: vi.fn().mockReturnValue(["node-1"]),
    }),
  });

  const openNodeMenu = async () => {
    cxttapHandler?.({
      target: {
        id: () => "node-1",
        selected: () => false,
      },
      renderedPosition: { x: 10, y: 20 },
    });

    await waitFor(() =>
      expect(screen.getByRole("menu", { name: "Node actions" })).toBeTruthy(),
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cxttapHandler = undefined;
    (vault as any).isGuest = false;
    (vault as any).entities = {};
  });

  it("shows Mark Important for editable graph sessions", async () => {
    render(ContextMenu, { cy: createCy() as any });

    await openNodeMenu();

    expect(
      screen.getByRole("menuitem", { name: "Mark Important" }),
    ).toBeTruthy();
  });

  it("hides Mark Important for guest graph sessions", async () => {
    (vault as any).isGuest = true;
    render(ContextMenu, { cy: createCy() as any });

    await openNodeMenu();

    expect(
      screen.queryByRole("menuitem", { name: "Mark Important" }),
    ).toBeNull();
  });
});
