/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const finalizeCanvasDossier = vi.hoisted(() => vi.fn());

vi.mock("../finalize-canvas-dossier", () => ({ finalizeCanvasDossier }));
vi.mock("../canvas-image-export", () => ({
  exportCanvasImage: vi.fn(async () => new Blob(["img"])),
}));
vi.mock("$lib/services/delve-dossier-service", () => ({
  delveDossierService: { finalize: vi.fn() },
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: vi.fn() },
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openZenMode: vi.fn() },
}));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: { activeTheme: { id: "dark" } },
}));
vi.mock("$lib/utils/delve-terminology", () => ({
  getDelveTerm: vi.fn(() => "Dossier"),
}));

import { exportCanvasImage } from "../canvas-image-export";
import { useCanvasDossier } from "./use-canvas-dossier.svelte";

const canvas = { id: "c1" };
const sourceEntity = { id: "e1" };

function setup(
  options: {
    canvas?: unknown;
    sourceEntity?: unknown;
    exportElement?: HTMLElement;
  } = {},
) {
  const logic = {
    nodes: [],
    edges: [],
    fitGraphForExport: vi.fn(),
  };
  const dossier = useCanvasDossier({
    logic: logic as never,
    vault: {
      loadEntityContent: vi.fn(),
      entities: {},
    } as never,
    getCanvas: () => ("canvas" in options ? options.canvas : canvas) as never,
    getSourceEntity: () =>
      ("sourceEntity" in options
        ? options.sourceEntity
        : sourceEntity) as never,
    getExportElement: () => options.exportElement,
  });
  return { dossier, logic };
}

describe("useCanvasDossier", () => {
  beforeEach(() => {
    finalizeCanvasDossier.mockReset();
    vi.mocked(exportCanvasImage).mockClear();
  });

  it("raises the finalizing and exporting flags only while it runs", async () => {
    let during: { finalizing: boolean; exporting: boolean } | undefined;
    const { dossier } = setup({ exportElement: document.createElement("div") });
    finalizeCanvasDossier.mockImplementation(async () => {
      during = {
        finalizing: dossier.isFinalizing,
        exporting: dossier.isExporting,
      };
    });

    await dossier.finalizeDossier();

    expect(during).toEqual({ finalizing: true, exporting: true });
    expect(dossier.isFinalizing).toBe(false);
    expect(dossier.isExporting).toBe(false);
  });

  it("exports the canvas element through the injected image exporter", async () => {
    const element = document.createElement("div");
    const { dossier, logic } = setup({ exportElement: element });
    finalizeCanvasDossier.mockImplementation(async (_c, _s, deps) => {
      await deps.exportImage();
    });

    await dossier.finalizeDossier();

    expect(exportCanvasImage).toHaveBeenCalledWith(
      element,
      logic.fitGraphForExport,
    );
  });

  it("fails with a clear error and resets the flags when the canvas is not mounted", async () => {
    const { dossier } = setup({ exportElement: undefined });
    finalizeCanvasDossier.mockImplementation(async (_c, _s, deps) => {
      await deps.exportImage();
    });

    await expect(dossier.finalizeDossier()).rejects.toThrow(
      "The canvas is not ready to export.",
    );
    expect(dossier.isFinalizing).toBe(false);
    expect(dossier.isExporting).toBe(false);
  });

  it("does nothing without a canvas or a source entity", async () => {
    await setup({ canvas: undefined }).dossier.finalizeDossier();
    await setup({ sourceEntity: undefined }).dossier.finalizeDossier();

    expect(finalizeCanvasDossier).not.toHaveBeenCalled();
  });

  it("ignores a second request while one is already running", async () => {
    const { dossier } = setup({ exportElement: document.createElement("div") });
    let release!: () => void;
    finalizeCanvasDossier.mockImplementation(
      () => new Promise<void>((resolve) => (release = resolve)),
    );

    const first = dossier.finalizeDossier();
    await dossier.finalizeDossier();
    release();
    await first;

    expect(finalizeCanvasDossier).toHaveBeenCalledOnce();
  });
});
