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
    openIntentCreateMenu: vi.fn(),
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

  it("forwards selected files through the accessible upload control", async () => {
    const onUploadFiles = vi.fn();
    render(CanvasHUD, {
      props: {
        canvasName: "Loose Notes",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
        onUploadFiles,
      },
    });

    const input = screen.getByLabelText("Choose files to upload to canvas");
    const file = new File(["map"], "map.pdf", { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: [file] });

    await fireEvent.change(input);

    expect(onUploadFiles).toHaveBeenCalledWith([file]);
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("opens the native picker from the mobile upload action", async () => {
    render(CanvasHUD, {
      props: {
        canvasName: "Loose Notes",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
        onUploadFiles: vi.fn(),
      },
    });

    const input = screen.getByLabelText("Choose files to upload to canvas");
    const openPicker = vi.spyOn(input, "click");

    await fireEvent.click(screen.getByTestId("canvas-fab-upload"));

    expect(openPicker).toHaveBeenCalledOnce();
  });

  it("does not show the mobile upload action when uploading is unavailable", () => {
    render(CanvasHUD, {
      props: {
        canvasName: "Guest Canvas",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
      },
    });

    expect(screen.queryByTestId("canvas-fab-upload")).toBeNull();
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

  it("exposes a drawing toggle and color picker", async () => {
    const onToggleDrawing = vi.fn();
    const onDrawingColorChange = vi.fn();

    render(CanvasHUD, {
      props: {
        canvasName: "Test Canvas",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
        onToggleDrawing,
        onDrawingColorChange,
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Draw on canvas" }),
    );
    expect(onToggleDrawing).toHaveBeenCalledOnce();

    const colorInput = screen.getByLabelText("Drawing color");
    await fireEvent.input(colorInput, { target: { value: "#00ff00" } });
    expect(onDrawingColorChange).toHaveBeenCalledWith("#00ff00");
  });

  it("communicates active mode and keeps the color input keyboard reachable", () => {
    render(CanvasHUD, {
      props: {
        canvasName: "Test Canvas",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
        isDrawingMode: true,
        drawingColor: "#123456",
        onToggleDrawing: vi.fn(),
        onDrawingColorChange: vi.fn(),
      },
    });

    expect(
      screen
        .getByRole("button", { name: "Exit drawing mode" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      (screen.getByLabelText("Drawing color") as HTMLInputElement).value,
    ).toBe("#123456");
  });

  it("exposes an exclusive eraser control with active-state semantics", async () => {
    const onToggleErasing = vi.fn();
    render(CanvasHUD, {
      props: {
        canvasName: "Test Canvas",
        activeCategories: new Set<string>(),
        onToggleCategory: vi.fn(),
        onClearCategories: vi.fn(),
        onToggleDrawing: vi.fn(),
        onToggleErasing,
        isErasingMode: true,
      },
    });

    const eraser = screen.getByRole("button", { name: "Exit eraser mode" });
    expect(eraser.getAttribute("aria-pressed")).toBe("true");
    await fireEvent.click(eraser);
    expect(onToggleErasing).toHaveBeenCalledOnce();
  });
});
