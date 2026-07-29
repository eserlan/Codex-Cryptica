import { z } from "zod";
import type { Entity } from "schema";
import { CanvasSchema, type Canvas } from "@codex/canvas-engine";
import { AdventureFlowLayout } from "generator-engine";
import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";
import { ImportDraftSchema, type ImportDraft } from "./import-handler";

export const PENDING_DELVE_CANVAS_KEY = "__codex_pending_canvas";

const PendingDelveTransferSchema = z.object({
  version: z.literal(1),
  canvas: z.record(z.string(), z.unknown()),
  sourceEntity: ImportDraftSchema,
  sourceEntityId: z.string().optional(),
});

export type PendingDelveTransfer = z.infer<typeof PendingDelveTransferSchema>;

interface DelveEntityStore {
  allEntities: Entity[];
  createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity>,
  ): Promise<string>;
}

interface DelveCanvasImporter {
  importCanvas(doc: Canvas | Record<string, unknown>): Promise<string>;
}

function isGeneratedDelve(entity: Entity): boolean {
  if (entity.type !== "location") return false;

  const labels = (entity.labels ?? []).map((label) => label.toLowerCase());
  return (
    entity.kind?.toLowerCase() === "dungeon" ||
    labels.includes("dungeon") ||
    labels.includes("delve")
  );
}

function prepareTransferredCanvas(
  input: unknown,
  sourceEntityId?: string,
): Canvas {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("The transferred canvas is invalid.");
  }
  const canvas = input as Record<string, unknown>;
  const metadata =
    canvas.metadata &&
    typeof canvas.metadata === "object" &&
    !Array.isArray(canvas.metadata)
      ? (canvas.metadata as Record<string, unknown>)
      : {};
  const title =
    typeof canvas.name === "string"
      ? canvas.name
      : typeof canvas.title === "string"
        ? canvas.title
        : undefined;

  const rawNodes = Array.isArray(canvas.nodes) ? canvas.nodes : [];
  const hasAdventureNodes = rawNodes.some(
    (n: any) =>
      n &&
      typeof n === "object" &&
      ["situation", "npc", "clue", "threat", "outcome"].includes(n.type),
  );
  const inferredKind = hasAdventureNodes ? "adventure" : "delve";

  const kind =
    typeof metadata.kind === "string"
      ? metadata.kind
      : typeof (canvas as Record<string, unknown>).kind === "string"
        ? (canvas as Record<string, unknown>).kind
        : inferredKind;

  let processedNodes = rawNodes;
  if (hasAdventureNodes) {
    const rawDoc: any = {
      id: "temp",
      title: title || "Adventure",
      summary: "",
      genre: "Fantasy",
      nodes: rawNodes,
      edges: Array.isArray(canvas.edges) ? canvas.edges : [],
    };
    const layoutEngine = new AdventureFlowLayout();
    const positioned = layoutEngine.applyLayout(rawDoc);
    processedNodes = positioned.nodes;
  }

  return CanvasSchema.parse({
    ...canvas,
    name: title,
    nodes: processedNodes,
    metadata: {
      ...metadata,
      kind,
      ...(sourceEntityId ? { sourceEntityId } : {}),
    },
  });
}

export function createPendingDelveTransfer(
  canvas: unknown,
  sourceEntity: ImportDraft,
): PendingDelveTransfer {
  return PendingDelveTransferSchema.parse({
    version: 1,
    canvas,
    sourceEntity: {
      ...sourceEntity,
      type: sourceEntity.type || "location",
      kind: sourceEntity.kind || "dungeon",
    },
  });
}

export class PendingDelveTransferService {
  constructor(
    private entityStore: DelveEntityStore = vault,
    private canvasImporter: DelveCanvasImporter = canvasRegistry,
    private storage: StorageLike = browserStorage,
  ) {}

  hasPending(): boolean {
    return this.storage.getItem(PENDING_DELVE_CANVAS_KEY) !== null;
  }

  async importPending(): Promise<string | null> {
    const serialized = this.storage.getItem(PENDING_DELVE_CANVAS_KEY);
    if (!serialized) return null;

    const raw = JSON.parse(serialized) as unknown;
    const parsedTransfer = PendingDelveTransferSchema.safeParse(raw);

    if (!parsedTransfer.success) {
      // Canvases created before the source-entity handoff remain importable.
      const slug = await this.canvasImporter.importCanvas(
        raw as Record<string, unknown>,
      );
      this.storage.removeItem(PENDING_DELVE_CANVAS_KEY);
      return slug;
    }

    const transfer = parsedTransfer.data;
    // Validate and migrate the canvas before creating the Entity. This
    // prevents an unimportable public payload from leaving an orphan entity.
    const preparedCanvas = prepareTransferredCanvas(transfer.canvas);
    const entityId =
      transfer.sourceEntityId ??
      (await this.findOrCreateSourceEntity(transfer.sourceEntity));

    const retryableTransfer: PendingDelveTransfer = {
      ...transfer,
      sourceEntityId: entityId,
    };
    this.storage.setItem(
      PENDING_DELVE_CANVAS_KEY,
      JSON.stringify(retryableTransfer),
    );

    const linkedCanvas = prepareTransferredCanvas(preparedCanvas, entityId);

    const slug = await this.canvasImporter.importCanvas(linkedCanvas);
    this.storage.removeItem(PENDING_DELVE_CANVAS_KEY);
    return slug;
  }

  private async findOrCreateSourceEntity(draft: ImportDraft): Promise<string> {
    const normalizedTitle = draft.title.trim().toLowerCase();
    const targetType = (draft.type as Entity["type"]) || "location";
    const targetKind = draft.kind || "dungeon";

    const existing = this.entityStore.allEntities.find(
      (entity) =>
        entity.title.trim().toLowerCase() === normalizedTitle &&
        (entity.type === targetType || isGeneratedDelve(entity)),
    );
    if (existing) return existing.id;

    return this.entityStore.createEntity(targetType, draft.title, {
      content: draft.content,
      lore: draft.lore ?? "",
      labels: draft.labels,
      status: draft.status,
      kind: targetKind,
    });
  }
}

export const pendingDelveTransferService = new PendingDelveTransferService();
