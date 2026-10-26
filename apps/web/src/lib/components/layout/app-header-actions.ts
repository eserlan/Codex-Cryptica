import { vault } from "#lib/stores/vault.svelte.js";
import { layoutUIStore } from "#lib/stores/ui/layout-ui.svelte.js";
import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
import { onboardingStore } from "#lib/stores/ui/onboarding.svelte.js";

export const openFrontPage = () => {
  layoutUIStore.closeSidebar();
  modalUIStore.closeZenMode();
  vault.selectedEntityId = null;
  onboardingStore.toggleWelcomeScreen(true);
  onboardingStore.dismissedLandingPage = true;
  onboardingStore.restoreWorldPage();
};
