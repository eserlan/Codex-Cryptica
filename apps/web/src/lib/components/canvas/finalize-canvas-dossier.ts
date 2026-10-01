import type { Canvas } from "@codex/canvas-engine";
import type { DelveCanvasEdge, DelveCanvasNode } from "generator-engine";
import type { Entity } from "schema";

export interface FinalizeCanvasDossierDeps {
  loadEntityContent: (entityId: string) => Promise<unknown>;
  getEntity: (entityId: string) => Entity | undefined;
  exportImage: () => Promise<Blob>;
  getGraph: () => { nodes: DelveCanvasNode[]; edges: DelveCanvasEdge[] };
  finalize: (request: {
    canvas: Canvas;
    sourceEntity: Entity;
    dossierTerm: string;
    nodes: DelveCanvasNode[];
    edges: DelveCanvasEdge[];
    canvasImage: Blob;
  }) => Promise<{ entityId: string; created: boolean }>;
  dossierTerm: string;
  notify: (message: string, level: "success" | "error") => void;
  openEntity: (entityId: string) => void;
}

export async function finalizeCanvasDossier(
  canvas: Canvas,
  sourceEntity: Entity,
  deps: FinalizeCanvasDossierDeps,
): Promise<void> {
  try {
    await deps.loadEntityContent(sourceEntity.id);
    const loadedSourceEntity = deps.getEntity(sourceEntity.id) ?? sourceEntity;
    const canvasImage = await deps.exportImage();
    const { nodes, edges } = deps.getGraph();
    const result = await deps.finalize({
      canvas,
      sourceEntity: loadedSourceEntity,
      dossierTerm: deps.dossierTerm,
      nodes,
      edges,
      canvasImage,
    });
    deps.notify(
      result.created
        ? "Created the GM dossier."
        : "Updated the GM dossier from the current canvas.",
      "success",
    );
    deps.openEntity(result.entityId);
  } catch (error) {
    deps.notify(
      error instanceof Error
        ? error.message
        : "The GM dossier could not be finalized.",
      "error",
    );
  }
}
