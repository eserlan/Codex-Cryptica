/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { openZenMode } = vi.hoisted(() => ({
  openZenMode: vi.fn(),
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    showCanvasSelector: false,
    openZenMode,
  },
}));

vi.mock("$lib/stores/canvas-registry.svelte", () => ({
  canvasRegistry: {
    status: "idle",
  },
}));

vi.mock("$lib/components/labels/CategoryFilter.svelte", () => ({
  default: function CategoryFilterMock() {
    return {};
  },
}));

import CanvasHUD from "./CanvasHUD.svelte";

describe("CanvasHUD", () => {
  beforeEach(() => {
    openZenMode.mockClear();
  });

  it("opens the delve's source Location from the canvas header", async () => {
    render(CanvasHUD, {
      props: {
        canvasName: "The Hollowed Citadel",
        sourceEntityId: "location-bruneth",
        sourceEntityTitle: "The Hollowed Citadel of Bruneth",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
      },
    });

    const link = screen.getByRole("button", {
      name: "Open Location: The Hollowed Citadel of Bruneth",
    });
    await fireEvent.click(link);

    expect(openZenMode).toHaveBeenCalledWith("location-bruneth");
  });

  it("does not show a source Location link on an unlinked canvas", () => {
    render(CanvasHUD, {
      props: {
        canvasName: "Loose Notes",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
      },
    });

    expect(screen.queryByRole("button", { name: /Open Location/ })).toBeNull();
  });

  it("finalizes a linked delve dossier", async () => {
    const onFinalizeDossier = vi.fn();
    render(CanvasHUD, {
      props: {
        canvasName: "The Hollowed Citadel",
        sourceEntityId: "location-bruneth",
        sourceEntityTitle: "The Hollowed Citadel of Bruneth",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
        onFinalizeDossier,
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Finalize Dossier" }),
    );
    expect(onFinalizeDossier).toHaveBeenCalledOnce();
  });

  it("opens and updates an existing dossier without creating another action", async () => {
    const onFinalizeDossier = vi.fn();
    render(CanvasHUD, {
      props: {
        canvasName: "The Hollowed Citadel",
        sourceEntityId: "location-bruneth",
        dossierEntityId: "dossier-bruneth",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
        onFinalizeDossier,
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Open Dossier" }));
    expect(openZenMode).toHaveBeenCalledWith("dossier-bruneth");

    await fireEvent.click(
      screen.getByRole("button", { name: "Update delve dossier" }),
    );
    expect(onFinalizeDossier).toHaveBeenCalledOnce();
  });
});
