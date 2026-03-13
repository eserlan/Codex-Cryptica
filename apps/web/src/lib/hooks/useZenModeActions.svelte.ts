import { uiStore as defaultUiStore } from "$lib/stores/ui.svelte";
import { vault as defaultVault } from "$lib/stores/vault.svelte";
import type { Entity } from "schema";

export interface ZenModeActionsDependencies {
  uiStore?: typeof defaultUiStore;
  vault?: typeof defaultVault;
}

export function createZenModeActions(
  editState: any,
  deps: ZenModeActionsDependencies = {},
) {
  const uiStore = deps.uiStore ?? defaultUiStore;
  const vault = deps.vault ?? defaultVault;

  let isSaving = $state(false);

  const saveChanges = async (entityId: string) => {
    isSaving = true;
    try {
      await vault.updateEntity(entityId, {
        title: editState.title,
        content: editState.content,
        lore: editState.lore,
        image: editState.image,
        date: editState.date,
        start_date: editState.startDate,
        end_date: editState.endDate,
        type: editState.type,
      });
      editState.isEditing = false;
    } catch (err) {
      console.error("[ZenModeActions] Failed to save changes", err);
    } finally {
      isSaving = false;
    }
  };

  const handleDelete = async (entity: Entity, onDeleted: () => void) => {
    if (
      confirm(
        `Are you sure you want to permanently delete "${entity.title}"? This cannot be undone.`,
      )
    ) {
      try {
        await vault.deleteEntity(entity.id);
        uiStore.notify(`"${entity.title}" deleted.`, "success");
        editState.isEditing = false;
        onDeleted();
      } catch (err: any) {
        console.error("[ZenModeActions] Failed to delete entity", err);
        uiStore.notify(`Error: ${err.message}`, "error");
      }
    }
  };

  const handleClose = (onClose: () => void) => {
    if (editState.isEditing) {
      if (!confirm("Discard unsaved changes?")) return;
    }
    onClose();
    editState.isEditing = false;
  };

  return {
    get isSaving() {
      return isSaving;
    },
    saveChanges,
    handleDelete,
    handleClose,
  };
}
