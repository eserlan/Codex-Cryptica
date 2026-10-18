/** A reactive stand-in for helpStore, so effects re-run when a test starts a tour. */
export const reactiveHelp = $state<{ activeTour: unknown }>({
  activeTour: null,
});
