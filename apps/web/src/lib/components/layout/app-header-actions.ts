import { vault } from "$lib/stores/vault.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";

export const openFrontPage = () => {
  layoutUIStore.closeSidebar();
  modalUIStore.closeZenMode();
  vault.selectedEntityId = null;
  onboardingStore.toggleWelcomeScreen(true);
  onboardingStore.dismissedLandingPage = true;
  onboardingStore.restoreWorldPage();
};
