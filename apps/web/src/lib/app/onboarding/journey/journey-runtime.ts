import { helpStore } from "$lib/stores/help.svelte";
import { categories } from "$lib/stores/categories.svelte";
import {
  cifPopout,
  helpActionRunner,
  helpAssistant,
  helpContext,
} from "$lib/stores/help-assistant/help-runtime";
import { isHelpAssistantAvailable } from "$lib/services/help-assistant/help-availability";
import {
  browserSessionStorage,
  browserStorage,
  systemClock,
} from "$lib/utils/runtime-deps";
import { JourneyStore } from "./journey-store.svelte";

/** Production wiring for guided-setup journeys (spec 175). */
export const journeyStore = new JourneyStore({
  storage: browserStorage,
  sessionStorage: browserSessionStorage,
  clock: systemClock,
  area: () => helpContext.current.area,
  runGuide: (action, options) => helpActionRunner.run(action, options),
  categoryIds: () => categories.list.map((c) => c.id),
  askCifAvailable: () => isHelpAssistantAvailable(),
  askCif: (prompt) => {
    if (cifPopout.connected) cifPopout.open();
    else helpAssistant.open();
    void helpAssistant.ask(prompt);
  },
  tour: helpStore,
});
