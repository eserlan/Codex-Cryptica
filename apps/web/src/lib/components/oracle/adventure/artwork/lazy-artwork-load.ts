import type { ArtworkBlobHandle } from "#lib/services/adventure/artwork/ports.js";

/**
 * Loads an artwork handle once `element` is near the viewport (immediately
 * when IntersectionObserver is missing). Returns a teardown that aborts a
 * running load and releases the handle.
 */
export function loadWhenVisible(
  element: HTMLElement,
  loader: (signal: AbortSignal) => Promise<ArtworkBlobHandle | null>,
  onSettled: (handle: ArtworkBlobHandle | null) => void,
): () => void {
  const controller = new AbortController();
  let active = true;
  let started = false;
  let owned: ArtworkBlobHandle | null = null;
  function start() {
    if (started) return;
    started = true;
    void Promise.resolve()
      .then(() =>
        controller.signal.aborted ? null : loader(controller.signal),
      )
      .then((result) => {
        if (!active || controller.signal.aborted) {
          result?.release();
          return;
        }
        if (result) {
          let released = false;
          owned = {
            url: result.url,
            release: () => {
              if (!released) {
                released = true;
                result.release();
              }
            },
          };
        }
        onSettled(owned);
      })
      .catch(() => {
        if (active) onSettled(null);
      });
  }
  function isDisplayed(): boolean {
    let current: HTMLElement | null = element;
    while (current) {
      if (getComputedStyle(current).display === "none") return false;
      current = current.parentElement;
    }
    return true;
  }
  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer?.disconnect();
              start();
            }
          },
          { rootMargin: "200px" },
        );
  if (observer) observer.observe(element);
  else if (isDisplayed()) start();
  return () => {
    active = false;
    controller.abort();
    observer?.disconnect();
    owned?.release();
    owned = null;
  };
}
