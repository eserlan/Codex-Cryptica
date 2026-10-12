import { appEventBus } from "@codex/events";
import { vaultEventBus } from "$lib/stores/vault/events.svelte";
import { systemClock } from "$lib/utils/runtime-deps";
import { JourneyMilestones } from "./journey-milestones";

/** Production milestone sources. Kept apart from the store so the Explorer can report without loading Cif. */
export const journeyMilestones = new JourneyMilestones({
  vaultBus: vaultEventBus,
  appBus: {
    subscribe: (filter, listener) => appEventBus.subscribe(filter, listener),
  },
  target: typeof window === "undefined" ? null : window,
  clock: systemClock,
});

/** The Explorer opened an entry: counts as finding it again (Writer journey). */
export function recordEntryFound(): void {
  journeyMilestones.recordEntryFound();
}
