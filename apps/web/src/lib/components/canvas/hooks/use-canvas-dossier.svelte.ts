import { tick } from "svelte";
import type { Canvas } from "@codex/canvas-engine";
import type { DelveCanvasEdge, DelveCanvasNode } from "generator-engine";
import type { vault as VaultStore } from "$lib/stores/vault.svelte";
import { delveDossierService } from "$lib/services/delve-dossier-service";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { getDelveTerm } from "$lib/utils/delve-terminology";
import {
  flowEdgeToCanvasEdge,
  flowNodesToCanvasNodes,
} from "../canvas-workspace-helpers";
import { exportCanvasImage } from "../canvas-image-export";
import { finalizeCanvasDossier } from "../finalize-canvas-dossier";
import type { CanvasLogic } from "./canvas-logic-type";

/** Exports the canvas and finalizes the GM dossier for its source entity. */
export function useCanvasDossier(deps: {
  logic: CanvasLogic;
  vault: typeof VaultStore;
  getCanvas: () => Canvas | undefined;
  getSourceEntity: () =>
    Parameters<typeof finalizeCanvasDossier>[1] | undefined;
  getExportElement: () => HTMLElement | undefined;
}) {
  const { logic, vault, getCanvas, getSourceEntity, getExportElement } = deps;

  let isFinalizing = $state(false);
  let isExporting = $state(false);

  async function finalizeDossier() {
    const canvas = getCanvas();
    const sourceEntity = getSourceEntity();
    if (!canvas || !sourceEntity || isFinalizing) return;
    isFinalizing = true;
    isExporting = true;
    try {
      await finalizeCanvasDossier(canvas, sourceEntity, {
        loadEntityContent: (entityId) => vault.loadEntityContent(entityId),
        getEntity: (entityId) => vault.entities[entityId],
        exportImage: async () => {
          const exportElement = getExportElement();
          if (!exportElement) {
            throw new Error("The canvas is not ready to export.");
          }
          await tick();
          return exportCanvasImage(exportElement, logic.fitGraphForExport);
        },
        finalize: (request) => delveDossierService.finalize(request),
        dossierTerm: getDelveTerm(themeStore.activeTheme.id),
        getGraph: () => ({
          nodes: flowNodesToCanvasNodes(
            logic.nodes,
          ) as unknown as DelveCanvasNode[],
          edges: logic.edges.map((edge) =>
            flowEdgeToCanvasEdge(edge),
          ) as unknown as DelveCanvasEdge[],
        }),
        notify: (message, level) => notificationStore.notify(message, level),
        openEntity: (entityId) => modalUIStore.openZenMode(entityId),
      });
    } finally {
      isExporting = false;
      isFinalizing = false;
    }
  }

  return {
    finalizeDossier,
    get isFinalizing() {
      return isFinalizing;
    },
    get isExporting() {
      return isExporting;
    },
  };
}
