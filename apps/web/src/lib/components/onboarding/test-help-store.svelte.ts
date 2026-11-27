/** A reactive stand-in for helpStore, so effects re-run when a test starts a tour. */
export const reactiveHelp = $state<{ activeTour: unknown }>({
  activeTour: null,
});

/** Reactive route and selection inputs for public import handoff tests. */
export const reactiveImport = $state({
  route: { id: "/(app)" },
  selectedEntityId: null as string | null,
});
