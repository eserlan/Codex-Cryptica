import { helpStore } from "#lib/stores/help.svelte.js";
import { categories } from "#lib/stores/categories.svelte.js";
import {
  helpActionRunner,
  helpContext,
} from "#lib/stores/help-assistant/help-runtime.js";
import { askCifPrompt } from "#lib/stores/help-assistant/ask-cif.js";
import { isHelpAssistantAvailable } from "#lib/services/help-assistant/help-availability.js";
import {
  browserSessionStorage,
  browserStorage,
  systemClock,
} from "#lib/utils/runtime-deps.js";
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
  askCif: (prompt) => askCifPrompt(prompt),
  tour: helpStore,
});
