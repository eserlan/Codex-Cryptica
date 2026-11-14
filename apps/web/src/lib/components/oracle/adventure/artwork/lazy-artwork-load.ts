import type { ArtworkBlobHandle } from "#lib/services/adventure/artwork/ports.js";

/**
 * Loads an artwork handle once `element` is near the viewport. Without
 * IntersectionObserver, visible artwork loads immediately and hidden artwork
 * retries when its container or the viewport resizes. Teardown aborts the
 * load, removes listeners, and releases the handle.
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
  let resizeObserver: ResizeObserver | null = null;
  let resizeListener: (() => void) | null = null;
  function stopRetrying() {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (resizeListener) {
      window.removeEventListener("resize", resizeListener);
      resizeListener = null;
    }
  }

  if (observer) observer.observe(element);
  else if (isDisplayed()) start();
  else {
    const retry = () => {
      if (!active || started || !isDisplayed()) return;
      stopRetrying();
      start();
    };
    window.addEventListener("resize", retry);
    resizeListener = retry;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(retry);
      // The artwork itself may have no size until loaded. Observe ancestors
      // so a container-query breakpoint can wake up the hidden presentation.
      for (
        let ancestor = element.parentElement;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        resizeObserver.observe(ancestor);
      }
    }
  }
  return () => {
    active = false;
    controller.abort();
    observer?.disconnect();
    stopRetrying();
    owned?.release();
    owned = null;
  };
}
