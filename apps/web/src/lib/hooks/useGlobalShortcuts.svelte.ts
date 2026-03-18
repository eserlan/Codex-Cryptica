import { browser } from "$app/environment";

interface ShortcutContext {
  searchStore: {
    isOpen: boolean;
    toggle: () => void;
    close: () => void;
  };
  uiStore: {
    showSettings: boolean;
    closeSettings: () => void;
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
      !e.shiftKey
    ) {
      e.preventDefault();
      context.searchStore.toggle();
    }

    // Escape to close active modals/settings
    if (e.key === "Escape") {
      if (context.searchStore.isOpen) {
        context.searchStore.close();
      } else if (context.uiStore.showSettings) {
        context.uiStore.closeSettings();
      }
    }
  };

  // Svelte 5 will automatically handle the event listener attachment
  // when this is called inside a component scope.
  // However, since we want this to be global, we use svelte:window in the layout.
  // This hook just provides the logic.
  return handleKeydown;
}
