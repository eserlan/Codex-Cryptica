const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Svelte action: traps Tab/Shift-Tab focus within `node`, auto-focuses the
 * first focusable child on mount, and restores focus to the triggering element
 * on destroy. Apply to the dialog/modal root element.
 */
export function focusTrap(node: HTMLElement) {
  const triggerEl = document.activeElement as HTMLElement | null;

  const focusable = () =>
    [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
      if (el.closest("[inert]")) return false;
      // offsetParent is null for display:none but also for position:fixed — use
      // getComputedStyle for the latter so fixed-position children aren't skipped.
      if (el.offsetParent === null) {
        const style = window.getComputedStyle(el);
        if (style.position !== "fixed" && style.position !== "sticky")
          return false;
      }
      return true;
    });

  // Auto-focus first focusable element
  const first = focusable()[0];
  if (first) {
    // Defer one tick so transitions don't fight focus
    requestAnimationFrame(() => first.focus());
  } else {
    node.tabIndex = -1;
    requestAnimationFrame(() => node.focus());
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    const items = focusable();
    if (!items.length) return;
    const firstEl = items[0];
    const lastEl = items[items.length - 1];

    if (e.shiftKey) {
      if (
        document.activeElement === firstEl ||
        document.activeElement === node
      ) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      if (
        document.activeElement === lastEl ||
        document.activeElement === node
      ) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }

  node.addEventListener("keydown", handleKeydown);

  return {
    destroy() {
      node.removeEventListener("keydown", handleKeydown);
      triggerEl?.focus();
    },
  };
}
