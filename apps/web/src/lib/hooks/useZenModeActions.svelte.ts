import { uiStore as defaultUiStore } from "$lib/stores/ui.svelte";
import { vault as defaultVault } from "$lib/stores/vault.svelte";
import { base } from "$app/paths";
import { openEntityPopout } from "$lib/utils/zen-popout";
import type { Entity } from "schema";

export interface ZenModeActionsDependencies {
  uiStore?: typeof defaultUiStore;
  vault?: typeof defaultVault;
}

export function createZenModeActions(
  editStateOrGetter: any | (() => any),
  deps: ZenModeActionsDependencies = {},
) {
  const uiStore = deps.uiStore ?? defaultUiStore;
  const vault = deps.vault ?? defaultVault;

  const getEditState = () =>
    typeof editStateOrGetter === "function"
      ? editStateOrGetter()
      : editStateOrGetter;

  let isSaving = $state(false);

  const saveChanges = async (entityId: string) => {
    isSaving = true;
    const editState = getEditState();
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
      await uiStore.confirm({
        title: "Delete Entity",
        message: `Are you sure you want to permanently delete "${entity.title}"? This cannot be undone.`,
        isDangerous: true,
      })
    ) {
      try {
        await vault.deleteEntity(entity.id);
        uiStore.notify(`"${entity.title}" deleted.`, "success");
        getEditState().isEditing = false;
        onDeleted();
      } catch (err: any) {
        console.error("[ZenModeActions] Failed to delete entity", err);
        uiStore.notify(`Error: ${err.message}`, "error");
      }
    }
  };

  const handleClose = async (onClose: () => void) => {
    const editState = getEditState();
    if (editState.isEditing) {
      if (
        !(await uiStore.confirm({
          title: "Discard Changes",
          message: "Discard unsaved changes?",
          isDangerous: true,
        }))
      ) {
        return;
      }
    }
    onClose();
    editState.isEditing = false;
  };

  const handlePopOut = async (entityId: string) => {
    const entity = vault.entities[entityId];
    if (!entity) return;

    let entityForPopout = entity;

    if (vault.isGuest && !entity.content) {
      await vault.loadEntityContent(entityId);
      entityForPopout = vault.entities[entityId] ?? entityForPopout;
    }

    // Convert blob URL → data URL so the image survives cross-tab
    if (entityForPopout.image) {
      try {
        const resolvedImageUrl = await vault.resolveImageUrl(
          entityForPopout.image,
        );
        const resp = await fetch(resolvedImageUrl);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        entityForPopout = { ...entityForPopout, image: dataUrl };
      } catch {
        // silently skip
      }
    }

    openEntityPopout(
      vault.activeVaultId ?? "guest",
      entityForPopout,
      base,
      vault.isGuest,
    );

    // Close whatever view we're in
    if (uiStore.showZenMode) {
      uiStore.closeZenMode();
    } else if (uiStore.mainViewMode === "focus") {
      uiStore.focusEntity(null);
    }
  };

  return {
    get isSaving() {
      return isSaving;
    },
    saveChanges,
    handleDelete,
    handleClose,
    handlePopOut,
  };
}
