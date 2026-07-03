import { browser } from "$app/environment";

interface ShortcutContext {
  canUseSearch?: boolean;
  canUseQuickNote?: boolean;
  searchStore: {
    isOpen: boolean;
    toggle: () => void;
    close: () => void;
  };
  modalUIStore: {
    showSettings: boolean;
    closeSettings: () => void;
  };
  quickNoteStore: {
    isOpen: boolean;
    toggle: () => void;
    close: () => void;
  };
}

/**
 * Hook to manage global keyboard shortcuts.
 */
export function useGlobalShortcuts(context: ShortcutContext) {
  if (!browser) return;

  const handleKeydown = (e: KeyboardEvent) => {
    const target = document.activeElement;

    // Ignore shortcuts if user is typing in an input or textarea
    if (
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      (target as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    // Cmd+K or Ctrl+K for Search
    if (
      (e.key === "k" || e.key === "K") &&
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      context.canUseSearch !== false
    ) {
      e.preventDefault();
      context.searchStore.toggle();
    }

    // Cmd+I or Ctrl+I for QuickNote Scratchpad
    if (
      (e.key === "i" || e.key === "I") &&
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      context.canUseQuickNote !== false
    ) {
      e.preventDefault();
      context.quickNoteStore.toggle();
    }

    // Escape to close active modals/settings/scratchpads
    if (e.key === "Escape") {
      if (context.searchStore.isOpen) {
        context.searchStore.close();
      } else if (context.modalUIStore.showSettings) {
        context.modalUIStore.closeSettings();
      } else if (context.quickNoteStore.isOpen) {
        context.quickNoteStore.close();
      }
    }
  };

  // Svelte 5 will automatically handle the event listener attachment
  // when this is called inside a component scope.
  // However, since we want this to be global, we use svelte:window in the layout.
  // This hook just provides the logic.
  return handleKeydown;
}
