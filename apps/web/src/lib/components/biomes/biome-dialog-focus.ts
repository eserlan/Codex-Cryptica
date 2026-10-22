const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogFocusOptions {
  /** Called when the user presses Escape. */
  onEscape: () => void;
  /** The control to focus first. Defaults to the first focusable control. */
  initial?: string;
}

/**
 * Keeps keyboard focus inside a dialog: focus moves in when it opens, Tab and
 * Shift+Tab wrap around, Escape closes it, and focus returns to whatever had it
 * before when the dialog goes away.
 */
export function dialogFocus(node: HTMLElement, options: DialogFocusOptions) {
  let current = options;
  const opener =
    typeof document !== "undefined"
      ? (document.activeElement as HTMLElement | null)
      : null;

  const focusables = () =>
    Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));

  const first =
    (current.initial && node.querySelector<HTMLElement>(current.initial)) ||
    focusables()[0];
  first?.focus();

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      current.onEscape();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables();
    if (items.length === 0) return;
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === firstItem) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && active === lastItem) {
      event.preventDefault();
      firstItem.focus();
    } else if (!node.contains(active)) {
      event.preventDefault();
      firstItem.focus();
    }
  }

  node.addEventListener("keydown", onKeydown);
  return {
    update(next: DialogFocusOptions) {
      current = next;
    },
    destroy() {
      node.removeEventListener("keydown", onKeydown);
      if (opener?.isConnected) opener.focus();
    },
  };
}
