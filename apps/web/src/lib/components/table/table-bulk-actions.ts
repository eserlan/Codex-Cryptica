import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { openSelectionReport } from "$lib/components/reports/open-selection-report";
import type { Entity } from "schema";

// Single pass over the selection, no intermediate array.
export function withoutIds(
  ids: Set<string>,
  removed: Set<string>,
): Set<string> {
  const remaining = new Set<string>();
  for (const id of ids) {
    if (!removed.has(id)) remaining.add(id);
  }
  return remaining;
}

export async function handleChangeType(
  type: string,
  targetIds: string[],
  isCommitting: boolean,
  setCommitting: (state: boolean) => void,
) {
  if (isCommitting) return;
  if (!targetIds || targetIds.length === 0) return;

  const confirmed = await notificationStore.confirm({
    title: "Change Entity Type",
    message: `Are you sure you want to change the type of ${
      targetIds.length > 1 ? `${targetIds.length} entities` : "this entity"
    } to "${type}"? This may result in some type-specific metadata layout updates.`,
    confirmLabel: "Change type",
    cancelLabel: "Cancel",
    isDangerous: false,
  });

  if (confirmed) {
    setCommitting(true);
    try {
      // ⚡ Bolt Optimization: Replace Object.fromEntries(array.map(...)) with an imperative loop
      const updates: Record<string, { type: string }> = Object.create(null);
      for (let i = 0; i < targetIds.length; i++) {
        updates[targetIds[i]] = { type };
      }
      const result = await vault.bulkUpdate(updates);
      if (result.failedIds.length > 0 || result.skippedIds.length > 0) {
        notificationStore.notify(
          `Changed ${result.succeededIds.length} entities; ${
            result.failedIds.length + result.skippedIds.length
          } could not be changed.`,
          "error",
        );
      }
    } catch (err: any) {
      console.error("Failed to change type", err);
      notificationStore.notify(`Error: ${err.message}`, "error");
    } finally {
      setCommitting(false);
    }
  }
}

export async function handleDeleteSelected(
  targetIds: string[],
  isCommitting: boolean,
  setCommitting: (state: boolean) => void,
  updateSelection: (succeededIds: string[]) => void,
) {
  if (isCommitting) return;
  if (!targetIds || targetIds.length === 0) return;

  const confirmed = await notificationStore.confirm({
    title: targetIds.length > 1 ? "Delete Selected Entities" : "Delete Entity",
    message: `Are you sure you want to permanently delete ${
      targetIds.length > 1
        ? `these ${targetIds.length} entities`
        : "this entity"
    }? This action cannot be undone.`,
    confirmLabel: "Delete permanently",
    cancelLabel: "Cancel",
    isDangerous: true,
  });

  if (confirmed) {
    setCommitting(true);
    try {
      const result = await vault.bulkDelete(targetIds);
      updateSelection(result.succeededIds);
      if (result.failedIds.length > 0 || result.cancelledIds.length > 0) {
        notificationStore.notify(
          `Deleted ${result.succeededIds.length} entities; ${
            result.failedIds.length + result.cancelledIds.length
          } remain selected for retry.`,
          "error",
        );
      }
    } catch (err: any) {
      console.error("Failed to delete", err);
      notificationStore.notify(`Error: ${err.message}`, "error");
    } finally {
      setCommitting(false);
    }
  }
}

export function openBulkReport(selectedVisible: Entity[]) {
  openSelectionReport(
    "table",
    selectedVisible.map((e) => e.id),
  );
}

export function openBulkLabels(selectedVisible: Entity[]) {
  if (selectedVisible.length === 0) return;
  modalUIStore.openBulkLabelDialog(selectedVisible.map((e) => e.id));
}

export function handleManageLabels(targetIds: string[]) {
  if (!targetIds || targetIds.length === 0) return;
  modalUIStore.openBulkLabelDialog(targetIds);
}
