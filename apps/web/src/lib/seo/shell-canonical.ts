/**
 * The static SPA shell ships a fallback canonical for `/` (see
 * `scripts/inject-shell-og.mjs`, #4303). The shell is also the document for
 * every other client-rendered route, and some of those set their own canonical
 * once they hydrate. Two canonical links is ambiguous, so the page's own tag
 * wins and the shell's fallback is dropped.
 */
export const SHELL_CANONICAL_ATTR = "data-shell-canonical";

export function removeShellCanonicalWhenOverridden(doc: Document): void {
  const canonicals = doc.head.querySelectorAll('link[rel="canonical"]');
  if (canonicals.length < 2) return;
  for (const link of canonicals) {
    if (link.hasAttribute(SHELL_CANONICAL_ATTR)) link.remove();
  }
}

/** Watches the head for late-added canonicals; returns a stop function. */
export function watchShellCanonical(doc: Document): () => void {
  removeShellCanonicalWhenOverridden(doc);
  const observer = new MutationObserver(() =>
    removeShellCanonicalWhenOverridden(doc),
  );
  observer.observe(doc.head, { childList: true });
  return () => observer.disconnect();
}
