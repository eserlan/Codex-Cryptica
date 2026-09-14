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

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
};

export interface GraphActionShortcutDependencies {
  isGuest: boolean;
  selectedCount: number;
  isConnecting: boolean;
  toggleTimeline: () => void;
  applyTimelineLayout: () => void;
  toggleConnectMode: () => void;
  toggleSelectionConnector: () => void;
  toggleLabels: () => void;
  toggleImages: () => void;
}

export function handleGraphActionShortcut(
  event: KeyboardEvent,
  deps: GraphActionShortcutDependencies,
): boolean {
  if (!event.key) return false;
  if (isEditableTarget(document.activeElement)) return false;

  const target = document.activeElement;
  if (
    target instanceof HTMLElement &&
    target.closest(
      "dialog, [role='dialog'], [role='tabpanel'], aside, [aria-modal='true']",
    )
  ) {
    return false;
  }

  const key = event.key.toLowerCase();
  const isPlainKey = !event.ctrlKey && !event.metaKey && !event.altKey;

  if (isPlainKey && key === "t") {
    deps.toggleTimeline();
    deps.applyTimelineLayout();
    return true;
  }

  if (isPlainKey && key === "c") {
    if (!deps.isGuest) {
      if (deps.selectedCount === 2) {
        deps.toggleSelectionConnector();
      } else {
        deps.toggleConnectMode();
      }
    }
    return true;
  }

  if (isPlainKey && key === "l") {
    deps.toggleLabels();
    return true;
  }

  if (isPlainKey && key === "i") {
    deps.toggleImages();
    return true;
  }

  if (event.key === "Escape" && deps.isConnecting) {
    deps.toggleConnectMode();
    return true;
  }

  return false;
}

export async function handleGraphDeleteShortcut(
  event: KeyboardEvent,
  deps: GraphDeleteShortcutDependencies,
) {
  if (!event.key || (event.key !== "Delete" && event.key !== "Backspace"))
    return false;
  if (isEditableTarget(document.activeElement)) return false;

  // Prevent accidental deletes when keyboard focus is within a sidebar, modal, or overlay.
  // This ensures 'Backspace' used for navigation or UI interaction doesn't delete graph nodes.
  // We still allow 'Delete' so users can explicitly delete open entities using their keyboard.
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    const inSidebar = active.closest(
      "aside, dialog, [role='dialog'], [role='complementary'], section[aria-label='Entity Explorer workspace']",
    );
    if (inSidebar && event.key === "Backspace") {
      return false;
    }
  }

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
