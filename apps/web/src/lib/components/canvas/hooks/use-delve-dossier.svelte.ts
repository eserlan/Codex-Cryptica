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
import type { CanvasLogic } from "./canvas-logic-type";

export function useDelveDossier(deps: {
  logic: CanvasLogic;
  vault: typeof VaultStore;
  getCanvas: () => Canvas | undefined;
  getSourceEntity: () => { id: string } | undefined;
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
      await vault.loadEntityContent(sourceEntity.id);
      const loadedSourceEntity =
        vault.entities[sourceEntity.id] ?? sourceEntity;
      const exportElement = getExportElement();
      if (!exportElement) {
        throw new Error("The canvas is not ready to export.");
      }
      await tick();
      const canvasImage = await exportCanvasImage(
        exportElement as HTMLDivElement,
        logic.fitGraphForExport,
      );
      const result = await delveDossierService.finalize({
        canvas,
        sourceEntity: loadedSourceEntity as any,
        dossierTerm: getDelveTerm(themeStore.activeTheme.id),
        nodes: flowNodesToCanvasNodes(
          logic.nodes,
        ) as unknown as DelveCanvasNode[],
        edges: logic.edges.map((edge) =>
          flowEdgeToCanvasEdge(edge),
        ) as unknown as DelveCanvasEdge[],
        canvasImage,
      });
      notificationStore.notify(
        result.created
          ? "Created the GM dossier."
          : "Updated the GM dossier from the current canvas.",
        "success",
      );
      modalUIStore.openZenMode(result.entityId);
    } catch (error) {
      notificationStore.notify(
        error instanceof Error
          ? error.message
          : "The GM dossier could not be finalized.",
        "error",
      );
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
