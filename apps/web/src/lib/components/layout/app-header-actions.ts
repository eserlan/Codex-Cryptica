import { uiStore } from "$lib/stores/ui.svelte";
import { vault } from "$lib/stores/vault.svelte";

export const openFrontPage = () => {
  uiStore.closeSidebar();
  uiStore.closeZenMode();
  vault.selectedEntityId = null;
  uiStore.toggleWelcomeScreen(true);
  uiStore.dismissedLandingPage = true;
  uiStore.dismissedCampaignPage = false;
};
