import { onboardingStore } from "#lib/stores/ui/onboarding.svelte.js";
import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { helpStore } from "#lib/stores/help.svelte.js";
import { vault } from "#lib/stores/vault.svelte.js";
import {
  cifPopout,
  helpAssistant,
  helpContext,
} from "#lib/stores/help-assistant/help-runtime.js";
import { isHelpAssistantAvailable } from "#lib/services/help-assistant/help-availability.js";
import { generatorsAvailable } from "#lib/services/help-assistant/generator-availability.js";
import { isEditable } from "#lib/components/onboarding/focus.js";
import {
  browserSessionStorage,
  browserStorage,
} from "#lib/utils/runtime-deps.js";
import { journeyStore } from "#lib/app/onboarding/journey/journey-runtime.js";
import { askCifPrompt } from "#lib/stores/help-assistant/ask-cif.js";
import { TipsStore } from "./tips-store.svelte";
import { tipContextFrom } from "./tips-context";

/**
 * Production wiring for Cif contextual tips (spec 176). Every input is read
 * from state the app already holds: nothing here reads vault content, and no
 * keystrokes or clicks are recorded (FR-011, FR-012).
 */
export const tipsStore = new TipsStore({
  storage: browserStorage,
  sessionStorage: browserSessionStorage,
  aiAvailable: () => isHelpAssistantAvailable(),
  context: () =>
    tipContextFrom({
      chosenGoal: onboardingStore.chosenGoal,
      goalInvitation: onboardingStore.goalInvitation,
      setupEnded: journeyStore.setupEnded,
      area: helpContext.current.area,
      generatorsOffered: generatorsAvailable(vault, sessionModeStore),
      typing: isEditable(document.activeElement),
      anyModalOpen: modalUIStore.isAnyModalOpen,
      zenMode: modalUIStore.showZenMode,
      tourActive: !!helpStore.activeTour,
      firstRunGuidanceActive: onboardingStore.firstRunGuidanceActive,
      cifPanelOpen: helpAssistant.isOpen,
      cifPopoutConnected: cifPopout.connected,
      vaultInitialized: vault.isInitialized,
      skipWelcomeScreen: onboardingStore.skipWelcomeScreen,
      worldPageDismissed: onboardingStore.dismissedWorldPage,
      entitySelected: !!vault.selectedEntityId,
    }),
  askCif: (prompt) => askCifPrompt(prompt),
});
