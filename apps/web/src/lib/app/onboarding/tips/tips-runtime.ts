import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { helpStore } from "$lib/stores/help.svelte";
import { vault } from "$lib/stores/vault.svelte";
import {
  cifPopout,
  helpAssistant,
  helpContext,
} from "$lib/stores/help-assistant/help-runtime";
import { isHelpAssistantAvailable } from "$lib/services/help-assistant/help-availability";
import { generatorsAvailable } from "$lib/services/help-assistant/generator-availability";
import { isEditable } from "$lib/components/onboarding/focus";
import { browserSessionStorage, browserStorage } from "$lib/utils/runtime-deps";
import { journeyStore } from "$lib/app/onboarding/journey/journey-runtime";
import { askCifPrompt } from "$lib/stores/help-assistant/ask-cif";
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
