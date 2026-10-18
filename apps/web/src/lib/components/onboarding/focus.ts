/** True when the user is typing somewhere a prompt must not take focus from. */
export function isEditable(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return true;
  }
  if (el instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "submit", "reset"].includes(
      el.type,
    );
  }
  return false;
}

/** Focus goes back where it was, or to the main content when that is gone. */
export function restoreFocus(previous: Element | null): void {
  if (previous instanceof HTMLElement && previous.isConnected) {
    previous.focus({ preventScroll: true });
    return;
  }
  document
    .querySelector<HTMLElement>('[data-testid="layout-route-content"]')
    ?.focus({ preventScroll: true });
}

/**
 * First-run cards (goal invitation, tips question) take focus on open, unless
 * someone is typing. Returns the text to announce instead, or "" when focus moved.
 */
export function enterCard(
  heading: HTMLElement | undefined,
  previous: Element | null,
  announcement: string,
): string {
  if (isEditable(previous)) return announcement;
  heading?.focus({ preventScroll: true });
  return "";
}

/** Escape belongs to a first-run card only when focus is inside it, or nowhere. */
export function escapeBelongsToCard(root: HTMLElement | undefined): boolean {
  const active = document.activeElement;
  return !active || active === document.body || !!root?.contains(active);
}
