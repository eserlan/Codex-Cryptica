/**
 * Phone-width behaviour for the full-screen Adventure surface.
 *
 * - A `position: fixed` element inside a transformed ancestor (the centred
 *   Oracle window uses `translate`) is positioned against that ancestor, not
 *   the viewport. `bodyPortal` moves the surface to `<body>` while enabled.
 * - The opaque surface covers the app's navigation, so keyboard focus is kept
 *   inside it (`containTab`) and restored on exit.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.closest("[inert]") && !element.hidden,
  );
}

/**
 * Wraps Tab and Shift+Tab inside `container`. Only acts while focus is inside
 * it, so a global dialog that takes focus elsewhere is never blocked.
 * Returns true when it moved focus.
 */
export function containTab(
  event: KeyboardEvent,
  container: HTMLElement,
): boolean {
  if (event.key !== "Tab") return false;
  const active = container.ownerDocument.activeElement;
  if (!(active instanceof HTMLElement) || !container.contains(active)) {
    return false;
  }
  const focusable = focusableWithin(container);
  if (!focusable.length) return false;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

/**
 * Svelte action: while `enabled`, re-parent the node to `<body>`, leaving a
 * placeholder so it can move back when the viewport widens.
 */
export function bodyPortal(node: HTMLElement, enabled: boolean) {
  const placeholder = node.ownerDocument.createComment("adventure-surface");
  let moved = false;

  function apply(next: boolean) {
    if (next && !moved) {
      node.before(placeholder);
      node.ownerDocument.body.appendChild(node);
      moved = true;
    } else if (!next && moved) {
      placeholder.after(node);
      placeholder.remove();
      moved = false;
    }
  }

  apply(enabled);
  return {
    update: apply,
    destroy() {
      if (moved) {
        placeholder.remove();
        node.remove();
      }
    },
  };
}
