import { searchStore } from "$lib/stores/search.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { oracle } from "$lib/stores/oracle.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

const isTypingTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable ||
    Boolean(element.closest("[contenteditable]"))
  );
};

export const createGlobalShortcutHandler = () => {
  return (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      searchStore.open();
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    const isUndo =
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "z" &&
      !event.shiftKey;

    const isRedo =
      (event.metaKey || event.ctrlKey) &&
      (event.key.toLowerCase() === "y" ||
        (event.key.toLowerCase() === "z" && event.shiftKey));

    if (isUndo) {
      event.preventDefault();
      oracle.undo();
      return;
    }

    if (isRedo) {
      event.preventDefault();
      oracle.redo();
      return;
    }

    const isZenShortcut =
      ((event.ctrlKey || event.metaKey) && event.key === "ArrowUp") ||
      (event.altKey && event.key.toLowerCase() === "z");

    if (isZenShortcut && vault.selectedEntityId) {
      event.preventDefault();
      modalUIStore.openZenMode(vault.selectedEntityId);
      return;
    }

    const isSharedModeToggle =
      event.key.toLowerCase() === "p" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey;

    if (isSharedModeToggle) {
      sessionModeStore.sharedMode = !sessionModeStore.sharedMode;
    }
  };
};
