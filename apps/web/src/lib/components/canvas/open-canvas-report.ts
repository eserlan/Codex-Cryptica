import type { Edge, Node } from "@xyflow/svelte";
import type { Canvas } from "@codex/canvas-engine";
import { vault } from "$lib/stores/vault.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { reportPanelStore } from "$lib/stores/ui/report-panel.svelte";
import { useCanvasReportGeneration } from "./canvas-report-generation";

const getEntity = (id: string) => vault.entities[id];

export function canGenerateCanvasReport(
  canvas: Canvas | undefined,
  nodes: Node[],
): boolean {
  if (!canvas || canvas.metadata?.kind === "adventure" || vault.isGuest) {
    return false;
  }
  return nodes.some((n) => {
    const data = (n.data ?? {}) as Record<string, unknown>;
    return (
      (n.type ?? "entity") === "entity" && typeof data.entityId === "string"
    );
  });
}

export function openCanvasReport(
  canvas: Canvas,
  getNodes: () => Node[],
  getEdges: () => Edge[],
) {
  const run = (selection: "entire" | "selected") =>
    useCanvasReportGeneration(
      canvas,
      getNodes(),
      getEdges(),
      selection,
      getEntity,
    );

  const result = run("entire");
  if (!result.input) {
    notificationStore.notify(
      "There are no entities on this canvas to report on.",
      "info",
    );
    return;
  }
  reportPanelStore.open({
    input: result.input,
    source: result.source,
    defaultTitle: `${canvas.name || "Canvas"} report`,
    rescope: run,
  });
}
