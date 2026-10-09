import type { Edge, Node } from "@xyflow/svelte";
import type { Canvas } from "@codex/canvas-engine";
import type { Entity } from "schema";
import type { ReportInput, ReportSource } from "entity-report-engine";
import {
  assembleReportInput,
  connectionPairs,
  type RelationshipPair,
} from "$lib/services/report-input-mapper";

export type CanvasReportError =
  "no-selection" | "no-entities" | "unsupported-canvas";

export interface CanvasReportResult {
  input: ReportInput | null;
  source: ReportSource;
  error?: CanvasReportError;
}

export interface CanvasReportNode {
  id: string;
  entityId?: string;
  selected?: boolean;
}

export interface CanvasReportEdge {
  source: string;
  target: string;
  label?: string;
}

export function isReportableCanvas(canvas: Pick<Canvas, "metadata">): boolean {
  return canvas.metadata?.kind !== "adventure";
}

export function flowNodesToReportNodes(nodes: Node[]): CanvasReportNode[] {
  return nodes.flatMap((node) => {
    const data = (node.data ?? {}) as Record<string, unknown>;
    const isEntity = (node.type ?? "entity") === "entity";
    if (!isEntity || typeof data.entityId !== "string") return [];
    return [{ id: node.id, entityId: data.entityId, selected: node.selected }];
  });
}

export function flowEdgesToReportEdges(edges: Edge[]): CanvasReportEdge[] {
  return edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    label: typeof edge.label === "string" ? edge.label : undefined,
  }));
}

/**
 * Builds a report input from a canvas. Relationships combine the canvas's own
 * edges with each entity's stored connections (the ones the graph shows), kept
 * only where both ends are in scope; identical pairs collapse into one. When
 * `entityIds` is given
 * (regeneration of a "selected" report) it replaces live node selection.
 */
export function resolveCanvasReportInput(params: {
  canvasId: string;
  nodes: CanvasReportNode[];
  edges: CanvasReportEdge[];
  selection: "entire" | "selected";
  getEntity: (id: string) => Entity | undefined;
  entityIds?: string[];
}): CanvasReportResult {
  const { canvasId, nodes, edges, selection, getEntity, entityIds } = params;

  const wanted = entityIds ? new Set(entityIds) : null;
  const scoped = nodes.filter((node) => {
    if (!node.entityId) return false;
    if (wanted) return wanted.has(node.entityId);
    return selection === "entire" || Boolean(node.selected);
  });

  const source: ReportSource = { origin: "canvas", canvasId, selection };
  if (selection === "selected") {
    source.entityIds = [...new Set(scoped.map((n) => n.entityId as string))];
  }

  if (scoped.length === 0) {
    const hasEntities = nodes.some((n) => n.entityId);
    return {
      input: null,
      source,
      error:
        selection === "selected" && hasEntities && !wanted
          ? "no-selection"
          : "no-entities",
    };
  }

  const entityByNode = new Map<string, Entity>();
  for (const node of scoped) {
    const entity = getEntity(node.entityId as string);
    if (entity) entityByNode.set(node.id, entity);
  }
  const entities = [
    ...new Map([...entityByNode.values()].map((e) => [e.id, e])).values(),
  ];
  if (entities.length === 0)
    return { input: null, source, error: "no-entities" };

  const pairs: RelationshipPair[] = [];
  for (const edge of edges) {
    const from = entityByNode.get(edge.source);
    const to = entityByNode.get(edge.target);
    if (from && to) {
      pairs.push({
        sourceId: from.id,
        targetId: to.id,
        label: edge.label,
        source: "canvas",
      });
    }
  }
  pairs.push(...connectionPairs(entities));
  return { input: assembleReportInput(entities, pairs), source };
}

export function useCanvasReportGeneration(
  canvas: Canvas,
  nodes: Node[],
  edges: Edge[],
  selection: "entire" | "selected",
  getEntity: (id: string) => Entity | undefined,
): CanvasReportResult {
  if (!isReportableCanvas(canvas) || !canvas.id) {
    return {
      input: null,
      source: {
        origin: "canvas",
        canvasId: canvas.id ?? "",
        selection,
      },
      error: "unsupported-canvas",
    };
  }
  return resolveCanvasReportInput({
    canvasId: canvas.id,
    nodes: flowNodesToReportNodes(nodes),
    edges: flowEdgesToReportEdges(edges),
    selection,
    getEntity,
  });
}
