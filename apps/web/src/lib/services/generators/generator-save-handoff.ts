import { focusEntity } from "$lib/stores/ui/navigation";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

export interface SavedEntityHandoffDeps {
  /** Zen/mobile surfaces navigate via focusEntity; others just select. */
  isFocusMode: boolean;
  selectEntity: (id: string) => void;
}

/**
 * Navigate to a just-saved generator entity, surfacing a persistent error
 * toast instead of throwing if navigation fails. Must run BEFORE the caller
 * dismisses the generator modal (#2742) — once the modal is gone, a thrown
 * error has nowhere visible left to land.
 */
export function openSavedEntityInEditor(
  entityId: string,
  entityTitle: string,
  deps: SavedEntityHandoffDeps,
): void {
  try {
    if (deps.isFocusMode) {
      focusEntity(entityId);
    } else {
      deps.selectEntity(entityId);
    }
  } catch (err) {
    console.error("Failed to open generated entity in editor:", err);
    notificationStore.notify(
      `"${entityTitle}" was saved, but couldn't be opened automatically. Find it in the vault to continue editing.`,
      "error",
      true,
    );
  }
}
