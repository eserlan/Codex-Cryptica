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
    if (!event.key) return;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchStore.open();
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    const isUndo =
      (event.metaKey || event.ctrlKey) && key === "z" && !event.shiftKey;

    const isRedo =
      (event.metaKey || event.ctrlKey) &&
      (key === "y" || (key === "z" && event.shiftKey));

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
      (event.altKey && key === "z");

    if (isZenShortcut && vault.selectedEntityId) {
      event.preventDefault();
      modalUIStore.openZenMode(vault.selectedEntityId);
      return;
    }

    const isSharedModeToggle =
      key === "p" && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (isSharedModeToggle) {
      sessionModeStore.sharedMode = !sessionModeStore.sharedMode;
    }
  };
};
