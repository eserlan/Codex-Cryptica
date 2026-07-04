const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Svelte action: traps Tab/Shift-Tab focus within `node`, auto-focuses the
 * first focusable child on mount, and restores focus to the triggering element
 * on destroy. Apply to the dialog/modal root element.
 */
export function focusTrap(node: HTMLElement) {
  const triggerEl = document.activeElement as HTMLElement | null;
  let destroyed = false;

  // Walks the ancestor chain checking computed display/visibility rather than
  // offsetParent: offsetParent is null both for display:none ancestors AND for
  // position:fixed/sticky elements (a false negative for genuinely-visible
  // content), and is always null under jsdom (no layout engine), which made
  // this check unreliable in unit tests. Computed style resolution works
  // consistently in both real browsers and jsdom.
  const isVisible = (el: HTMLElement): boolean => {
    let current: HTMLElement | null = el;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  };

  const focusable = () =>
    [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
      if (el.closest("[inert]")) return false;
      return isVisible(el);
    });

  // Defer one tick so transitions don't fight focus, and so content rendered
  // into `node` via a cross-component snippet/slot (which may not be in the
  // DOM yet at action-mount time) has a chance to attach first. Skip if a
  // consumer already moved focus somewhere inside `node` in the meantime
  // (e.g. a form field it wants focused instead of the first focusable
  // element) rather than clobbering it.
  requestAnimationFrame(() => {
    if (destroyed || !node.isConnected) return;
    if (document.activeElement && node.contains(document.activeElement)) {
      return;
    }
    const first = focusable()[0];
    if (first) {
      first.focus();
    } else {
      node.tabIndex = -1;
      node.focus();
    }
  });

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
      destroyed = true;
      node.removeEventListener("keydown", handleKeydown);
      triggerEl?.focus();
    },
  };
}
