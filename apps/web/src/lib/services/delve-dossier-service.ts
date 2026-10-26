import type { Canvas } from "@codex/canvas-engine";
import {
  buildDelveDossier,
  type DelveCanvasEdge,
  type DelveCanvasNode,
} from "generator-engine";
import type { Entity } from "schema";
import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { systemClock } from "$lib/utils/runtime-deps";
import type { LocalEntity } from "$lib/stores/vault/types";

export interface FinalizeDelveDossierRequest {
  canvas: Canvas;
  nodes: DelveCanvasNode[];
  edges: DelveCanvasEdge[];
  sourceEntity: Entity;
  dossierTerm: string;
  canvasImage?: Blob;
}

export interface FinalizeDelveDossierResult {
  entityId: string;
  created: boolean;
}

export interface DelveDossierServiceDeps {
  getEntity: (id: string) => Entity | undefined;
  createNote: (title: string, initialData: Partial<Entity>) => Promise<string>;
  updateEntity: (id: string, updates: Partial<LocalEntity>) => Promise<boolean>;
  setCanvas: (canvas: Canvas) => void;
  saveCanvas: (id: string) => Promise<unknown>;
  saveImage: (
    blob: Blob,
    entityId: string,
    name: string,
  ) => Promise<{ image: string; thumbnail: string }>;
  now: () => number;
}

const defaultDeps: DelveDossierServiceDeps = {
  getEntity: (id) => vault.entities[id],
  createNote: (title, initialData) =>
    vault.createEntity("note", title, initialData),
  updateEntity: (id, updates) => vault.updateEntity(id, updates),
  setCanvas: (canvas) => {
    if (!canvas.id) return;
    vault.canvases[canvas.id] = canvas;
    canvasRegistry.canvases[canvas.id] = canvas;
  },
  saveCanvas: (id) => vault.saveCanvas(id),
  saveImage: (blob, entityId, name) =>
    vault.saveImageToVault(blob, entityId, name),
  now: () => systemClock.now(),
};

function dossierLabels(existing: Entity | undefined): string[] {
  return Array.from(
    new Set([...(existing?.labels ?? []), "delve-dossier", "gm-reference"]),
  );
}

export class DelveDossierService {
  constructor(private readonly deps: DelveDossierServiceDeps = defaultDeps) {}

  async finalize(
    request: FinalizeDelveDossierRequest,
  ): Promise<FinalizeDelveDossierResult> {
    if (!request.canvas.id) {
      throw new Error("The canvas must be saved before creating a dossier.");
    }

    const existingImagePath =
      typeof request.canvas.metadata?.dossierCanvasImagePath === "string"
        ? request.canvas.metadata.dossierCanvasImagePath
        : undefined;
    const savedImage = request.canvasImage
      ? await this.deps.saveImage(
          request.canvasImage,
          request.sourceEntity.id,
          `${request.canvas.slug || request.canvas.id}-delve-layout.png`,
        )
      : undefined;
    const canvasImagePath = savedImage?.image ?? existingImagePath;
    const dossier = buildDelveDossier({
      title: request.sourceEntity.title || request.canvas.name || "Untitled",
      dossierTerm: request.dossierTerm,
      canvasHref: `/canvas/${encodeURIComponent(
        request.canvas.slug || request.canvas.id,
      )}`,
      canvasImagePath,
      sourceContent: request.sourceEntity.content,
      sourceLore: request.sourceEntity.lore,
      nodes: request.nodes,
      edges: request.edges,
    });
    const linkedDossierId =
      typeof request.canvas.metadata?.dossierEntityId === "string"
        ? request.canvas.metadata.dossierEntityId
        : undefined;
    const existingDossier = linkedDossierId
      ? this.deps.getEntity(linkedDossierId)
      : undefined;
    let entityId = linkedDossierId;
    let created = false;

    if (entityId && existingDossier) {
      const updated = await this.deps.updateEntity(entityId, {
        title: dossier.title,
        content: dossier.summary,
        lore: dossier.markdown,
        labels: dossierLabels(existingDossier),
        kind: "delve-dossier",
      });
      if (!updated) {
        throw new Error("The existing delve dossier could not be updated.");
      }
    } else {
      entityId = await this.deps.createNote(dossier.title, {
        content: dossier.summary,
        lore: dossier.markdown,
        labels: dossierLabels(undefined),
        kind: "delve-dossier",
        connections: [
          {
            target: request.sourceEntity.id,
            type: "related_to",
            label: "Dossier for",
            strength: 1,
          },
        ],
      });
      created = true;
    }

    const updatedCanvas: Canvas = {
      ...request.canvas,
      metadata: {
        ...(request.canvas.metadata ?? {}),
        dossierEntityId: entityId,
        dossierFinalizedAt: this.deps.now(),
        ...(canvasImagePath ? { dossierCanvasImagePath: canvasImagePath } : {}),
      },
    };
    this.deps.setCanvas(updatedCanvas);
    await this.deps.saveCanvas(request.canvas.id);

    return { entityId, created };
  }
}

export const delveDossierService = new DelveDossierService();
