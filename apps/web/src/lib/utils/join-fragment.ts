interface JoinWindow {
  __codexTakeJoinFragment?: () => string | null;
}

/**
 * The group link's fragment, once. `app.html` takes it and clears it from the
 * address bar before anything else runs; without that script (unit tests) the
 * fragment is read from `location` and cleared the same way.
 */
export function takeJoinFragment(): string | null {
  const take = (window as unknown as JoinWindow).__codexTakeJoinFragment;
  if (typeof take === "function") return take();
  const { hash, pathname, search } = window.location;
  if (hash)
    window.history.replaceState(window.history.state, "", pathname + search);
  return hash || null;
}
