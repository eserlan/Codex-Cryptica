import type { Canvas } from "@codex/canvas-engine";
import type { vault as VaultStore } from "$lib/stores/vault.svelte";
import type { canvasRegistry as CanvasRegistryStore } from "$lib/stores/canvas-registry.svelte";
import type { modalUIStore as ModalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { openOrCreateSourceEntity } from "../canvas-source-entity";
import type { CanvasLogic } from "./canvas-logic-type";

/**
 * Resolves the active canvas from the route slug and the entities it is
 * linked to (source entity and GM dossier).
 */
export function useCanvasSource(deps: {
  logic: CanvasLogic;
  vault: typeof VaultStore;
  canvasRegistry: typeof CanvasRegistryStore;
  modalUIStore: typeof ModalUIStore;
  getSlug: () => string | undefined;
}) {
  const { logic, vault, canvasRegistry, modalUIStore, getSlug } = deps;

  const canvas = $derived(
    canvasRegistry.allCanvases.find(
      (c) => c.slug === getSlug() || c.id === getSlug(),
    ) as Canvas | undefined,
  );
  const canvasId = $derived(canvas?.id || getSlug());
  const sourceEntityId = $derived.by(() => {
    const id = canvas?.metadata?.sourceEntityId;
    return typeof id === "string" && id ? id : undefined;
  });
  const sourceEntity = $derived(
    sourceEntityId ? vault.entities[sourceEntityId] : undefined,
  );
  const dossierEntityId = $derived.by(() => {
    const id = canvas?.metadata?.dossierEntityId;
    return typeof id === "string" && id ? id : undefined;
  });
  const isAdventureCanvas = $derived(
    canvas?.metadata?.kind === "adventure" ||
      sourceEntity?.kind === "adventure" ||
      logic.nodes.some((n) => n.type === "adventureNode"),
  );

  let isCreatingSourceEntity = false;
  async function handleOpenOrCreateSourceEntity() {
    if (isCreatingSourceEntity) return;
    isCreatingSourceEntity = true;
    try {
      await openOrCreateSourceEntity({
        sourceEntityId,
        canvas,
        vault,
        canvasRegistry,
        modalUIStore,
        nodes: logic.nodes,
      });
    } finally {
      isCreatingSourceEntity = false;
    }
  }

  return {
    handleOpenOrCreateSourceEntity,
    get canvas() {
      return canvas;
    },
    get canvasId() {
      return canvasId;
    },
    get sourceEntityId() {
      return sourceEntityId;
    },
    get sourceEntity() {
      return sourceEntity;
    },
    get sourceEntityTitle() {
      return sourceEntity?.title;
    },
    get dossierEntityId() {
      return dossierEntityId;
    },
    get isAdventureCanvas() {
      return isAdventureCanvas;
    },
  };
}
