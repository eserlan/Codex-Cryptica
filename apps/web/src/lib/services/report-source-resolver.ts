import type { Canvas } from "@codex/canvas-engine";
import type { Entity, ReportProvenance } from "schema";
import type { ReportInput } from "entity-report-engine";
import {
  resolveCanvasReportInput,
  type CanvasReportEdge,
  type CanvasReportNode,
} from "$lib/components/canvas/canvas-report-generation";
import { resolveSelectionReportInput } from "./report-selection-input";

export interface ReportSourceDeps {
  getEntity: (id: string) => Entity | undefined;
  getCanvas: (id: string) => Canvas | undefined;
}

/** Rebuilds a report's input from its saved provenance alone. */
export function resolveReportSource(
  provenance: ReportProvenance,
  deps: ReportSourceDeps,
): { input: ReportInput | null; error?: "source-missing" | "no-entities" } {
  if (provenance.origin === "canvas") {
    const canvas = provenance.canvasId
      ? deps.getCanvas(provenance.canvasId)
      : undefined;
    if (!canvas || !provenance.canvasId) {
      return { input: null, error: "source-missing" };
    }
    const nodes: CanvasReportNode[] = (canvas.nodes ?? []).flatMap((n) => {
      const entityId = (n as { entityId?: string }).entityId;
      return n.type === "entity" && entityId ? [{ id: n.id, entityId }] : [];
    });
    const edges: CanvasReportEdge[] = (canvas.edges ?? []).map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
    }));
    const result = resolveCanvasReportInput({
      canvasId: provenance.canvasId,
      nodes,
      edges,
      selection: provenance.selection ?? "entire",
      getEntity: deps.getEntity,
      entityIds:
        provenance.selection === "selected" ? provenance.entityIds : undefined,
    });
    return result.input
      ? { input: result.input }
      : { input: null, error: "no-entities" };
  }

  const result = resolveSelectionReportInput(
    provenance.origin,
    provenance.entityIds ?? [],
    deps.getEntity,
  );
  return result.input
    ? { input: result.input }
    : { input: null, error: "source-missing" };
}
