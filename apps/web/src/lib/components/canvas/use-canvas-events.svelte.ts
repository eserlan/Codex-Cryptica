import { onMount } from "svelte";
import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";

export function useCanvasEvents(params: {
  onQuickSpawn: (
    entityId: string,
    position?: { x: number; y: number },
    screenPosition?: { x: number; y: number },
  ) => void;
  onEditLabel: (edgeId: string, currentLabel: string) => void;
  onFlushSave: () => void;
}) {
  onMount(() => {
    const handleDown = (e: KeyboardEvent) => {
      connectionModeStore.isModifierPressed = e.ctrlKey || e.metaKey;
    };
    const handleUp = (e: KeyboardEvent) => {
      connectionModeStore.isModifierPressed = e.ctrlKey || e.metaKey;
    };

    const handleQuickSpawn = (event: CustomEvent) => {
      const { entityId, position, screenPosition } = event.detail;
      params.onQuickSpawn(entityId, position, screenPosition);
    };

    const handleEditLabel = (event: CustomEvent) => {
      const { edgeId, currentLabel } = event.detail;
      params.onEditLabel(edgeId, currentLabel);
    };

    const handleBeforeUnload = () => params.onFlushSave();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") params.onFlushSave();
    };

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("add-to-canvas", handleQuickSpawn as any);
    window.addEventListener("edit-edge-label", handleEditLabel as any);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("add-to-canvas", handleQuickSpawn as any);
      window.removeEventListener("edit-edge-label", handleEditLabel as any);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      connectionModeStore.isModifierPressed = false;
    };
  });
}
