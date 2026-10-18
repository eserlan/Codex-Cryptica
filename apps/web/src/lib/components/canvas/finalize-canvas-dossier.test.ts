import { describe, expect, it, vi } from "vitest";
import type { Canvas } from "@codex/canvas-engine";
import type { Entity } from "schema";
import { finalizeCanvasDossier } from "./finalize-canvas-dossier";

const canvas = { id: "canvas-1", nodes: [], edges: [] } as unknown as Canvas;
const sourceEntity = { id: "source-1", title: "The Delve" } as Entity;

function setup() {
  const image = new Blob(["image"]);
  const loadedEntity = { ...sourceEntity, content: "Loaded content" };
  const deps = {
    loadEntityContent: vi.fn().mockResolvedValue(undefined),
    getEntity: vi.fn().mockReturnValue(loadedEntity),
    exportImage: vi.fn().mockResolvedValue(image),
    getGraph: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
    finalize: vi
      .fn()
      .mockResolvedValue({ entityId: "dossier-1", created: true }),
    dossierTerm: "Delve",
    nodes: [],
    edges: [],
    notify: vi.fn(),
    openEntity: vi.fn(),
  };
  return { deps, image, loadedEntity };
}

describe("finalizeCanvasDossier", () => {
  it("loads current source content, exports, finalizes, and opens the dossier", async () => {
    const { deps, image, loadedEntity } = setup();

    await finalizeCanvasDossier(canvas, sourceEntity, deps);

    expect(deps.loadEntityContent).toHaveBeenCalledWith("source-1");
    expect(deps.finalize).toHaveBeenCalledWith({
      canvas,
      sourceEntity: loadedEntity,
      dossierTerm: "Delve",
      nodes: [],
      edges: [],
      canvasImage: image,
    });
    expect(deps.notify).toHaveBeenCalledWith(
      "Created the GM dossier.",
      "success",
    );
    expect(deps.openEntity).toHaveBeenCalledWith("dossier-1");
  });

  it("reads graph data after the image export completes", async () => {
    const { deps, image } = setup();
    const events: string[] = [];
    const exportedNodes = [{ id: "node-after-export" }];
    const exportedEdges = [{ id: "edge-after-export" }];
    deps.exportImage.mockImplementation(async () => {
      events.push("export");
      return image;
    });
    deps.getGraph.mockImplementation(() => {
      events.push("graph");
      return {
        nodes: exportedNodes as never,
        edges: exportedEdges as never,
      };
    });
    deps.finalize.mockImplementation(async (request) => {
      events.push("finalize");
      expect(request.nodes).toBe(exportedNodes);
      expect(request.edges).toBe(exportedEdges);
      return { entityId: "dossier-1", created: true };
    });

    await finalizeCanvasDossier(canvas, sourceEntity, deps);

    expect(events).toEqual(["export", "graph", "finalize"]);
  });

  it("reports failures without opening a dossier", async () => {
    const { deps } = setup();
    deps.exportImage.mockRejectedValue(
      new Error("The canvas is not ready to export."),
    );

    await finalizeCanvasDossier(canvas, sourceEntity, deps);

    expect(deps.finalize).not.toHaveBeenCalled();
    expect(deps.notify).toHaveBeenCalledWith(
      "The canvas is not ready to export.",
      "error",
    );
    expect(deps.openEntity).not.toHaveBeenCalled();
  });
});
