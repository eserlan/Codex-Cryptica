import type { Core } from "cytoscape";

export interface GraphDeleteShortcutDependencies {
  cy?: Core;
  selectedId: string | null;
  isGuest: boolean;
  confirm: (params: {
    title: string;
    message: string;
    confirmLabel: string;
    isDangerous: boolean;
  }) => Promise<boolean>;
  deleteEntity: (id: string) => Promise<unknown>;
  clearSelectedId: () => void;
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
};

export async function handleGraphDeleteShortcut(
  event: KeyboardEvent,
  deps: GraphDeleteShortcutDependencies,
) {
  if (event.key !== "Delete" && event.key !== "Backspace") return false;
  if (isEditableTarget(document.activeElement)) return false;
  if (deps.isGuest) return false;

  const selectedNodes = deps.cy?.$("node:selected") ?? [];
  const selectedIds = selectedNodes.map((node: any) => node.id());
  const ids = [
    ...new Set(
      selectedIds.length > 0
        ? selectedIds
        : deps.selectedId
          ? [deps.selectedId]
          : [],
    ),
  ];

  if (ids.length === 0) return false;

  event.preventDefault();
  event.stopPropagation();

  const message =
    ids.length > 1
      ? `Are you sure you want to delete ${ids.length} selected nodes and all their connections? This cannot be undone.`
      : "Are you sure you want to delete this node and all its connections? This cannot be undone.";

  const confirmed = await deps.confirm({
    title: "Confirm Delete",
    message,
    confirmLabel: "Delete",
    isDangerous: true,
  });

  if (!confirmed) return true;

  for (const id of ids) {
    await deps.deleteEntity(id);
  }

  deps.clearSelectedId();
  deps.cy?.elements().unselect();
  return true;
}
