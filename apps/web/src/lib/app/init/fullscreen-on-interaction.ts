/**
 * Browsers only allow requestFullscreen() from within a user-gesture event
 * handler, so true auto-fullscreen on page load isn't possible. This requests
 * fullscreen on the first click/keydown instead, and gives up silently if the
 * browser denies it (e.g. iOS Safari has no Fullscreen API).
 *
 * Deliberately NOT pointerdown/touchstart: Chrome for Android does not treat
 * those as a valid activating gesture for requestFullscreen() — the call
 * fails immediately, and because `{ once: true }` tears down every listener
 * (including the later `click` for the same tap) on the first event to fire,
 * that failed attempt silently ate the interaction and nothing ever prompts
 * fullscreen again. `click` fires after touchend on mobile and after mouseup
 * on desktop, and is accepted by every major browser as a fullscreen-eligible
 * gesture in both cases.
 */
export function initFullscreenOnFirstInteraction(
  doc: Document = document,
): () => void {
  const events = ["click", "keydown"] as const;

  const requestFullscreen = () => {
    cleanup();

    if (doc.fullscreenElement) return;
    const el = doc.documentElement as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    el.requestFullscreen?.().catch(() => {
      // Denied or unsupported (e.g. iOS Safari) — stay windowed.
    });
  };

  const cleanup = () => {
    events.forEach((event) =>
      doc.removeEventListener(event, requestFullscreen, { capture: true }),
    );
  };

  events.forEach((event) =>
    doc.addEventListener(event, requestFullscreen, {
      once: true,
      capture: true,
    }),
  );

  return cleanup;
}
