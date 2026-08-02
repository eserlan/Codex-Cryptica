/**
 * Browsers only allow requestFullscreen() from within a user-gesture event
 * handler, so true auto-fullscreen on page load isn't possible. This requests
 * fullscreen on the first click/keydown/touchstart instead, and gives up
 * silently if the browser denies it (e.g. iOS Safari has no Fullscreen API).
 */
export function initFullscreenOnFirstInteraction(
  doc: Document = document,
): () => void {
  const events = ["pointerdown", "keydown", "touchstart"] as const;

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
      doc.removeEventListener(event, requestFullscreen),
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
