<script lang="ts">
  import { browser } from "$app/environment";
  import { helpStore } from "$lib/stores/help.svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import ZenModeModal from "./ZenModeModal.svelte";

  let {
    isMobileMenuOpen = $bindable(false),
  }: {
    isMobileMenuOpen: boolean;
  } = $props();

  const isLoginRoute = $derived(page.url.pathname === `${base}/login`);

  const isSpecialEnv =
    import.meta.env.DEV || import.meta.env.VITE_STAGING === "true";

  const loadModal = async (
    loader: () => Promise<{ default: any }>,
    name: string,
  ) => {
    try {
      const module = await loader();
      return module.default;
    } catch (err) {
      console.error(`[GlobalModalProvider] Failed to load ${name}:`, err);
      return null;
    }
  };

  let hasOpenedLightbox = $state(false);
  $effect(() => {
    if (modalUIStore.lightbox.show) {
      hasOpenedLightbox = true;
    }
  });
</script>

{#if searchStore.isOpen}
  {#await loadModal(() => import("$lib/components/search/SearchModal.svelte"), "SearchModal") then SearchModal}
    {#if SearchModal}
      <SearchModal />
    {/if}
  {/await}
{/if}

{#if onboardingStore.showChangelog}
  {#await loadModal(() => import("./ChangelogModal.svelte"), "ChangelogModal") then ChangelogModal}
    {#if ChangelogModal}
      <ChangelogModal />
    {/if}
  {/await}
{/if}

{#if !isLoginRoute}
  {#if oracle.isOpen}
    {#await loadModal(() => import("$lib/components/oracle/OracleWindow.svelte"), "OracleWindow") then OracleWindow}
      {#if OracleWindow}
        <OracleWindow />
      {/if}
    {/await}
  {/if}

  {#if browser}
    {#if modalUIStore.showSettings}
      {#await loadModal(() => import("$lib/components/settings/SettingsModal.svelte"), "SettingsModal") then SettingsModal}
        {#if SettingsModal}
          <SettingsModal />
        {/if}
      {/await}
    {/if}

    <ZenModeModal />

    {#if helpStore.activeTour}
      {#await loadModal(() => import("$lib/components/help/TourOverlay.svelte"), "TourOverlay") then TourOverlay}
        {#if TourOverlay}
          <TourOverlay />
        {/if}
      {/await}
    {/if}

    {#if isMobileMenuOpen}
      {#await loadModal(() => import("$lib/components/layout/MobileMenu.svelte"), "MobileMenu") then MobileMenu}
        {#if MobileMenu}
          <MobileMenu bind:isOpen={isMobileMenuOpen} />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.showMobileCreateSheet}
      {#await loadModal(() => import("./MobileCreateEntitySheet.svelte"), "MobileCreateEntitySheet") then MobileCreateEntitySheet}
        {#if MobileCreateEntitySheet}
          <MobileCreateEntitySheet />
        {/if}
      {/await}
    {/if}

    {#if notificationStore.confirmationDialog.open}
      {#await loadModal(() => import("./ConfirmationModal.svelte"), "ConfirmationModal") then ConfirmationModal}
        {#if ConfirmationModal}
          <ConfirmationModal />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.mergeDialog.open}
      {#await loadModal(() => import("$lib/components/dialogs/MergeNodesDialog.svelte"), "MergeNodesDialog") then MergeNodesDialog}
        {#if MergeNodesDialog}
          <MergeNodesDialog
            isOpen={modalUIStore.mergeDialog.open}
            sourceNodeIds={modalUIStore.mergeDialog.sourceIds}
            onClose={() => modalUIStore.closeMergeDialog()}
          />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.bulkLabelDialog.open}
      {#await loadModal(() => import("$lib/components/dialogs/BulkLabelDialog.svelte"), "BulkLabelDialog") then BulkLabelDialog}
        {#if BulkLabelDialog}
          <BulkLabelDialog
            isOpen={modalUIStore.bulkLabelDialog.open}
            entityIds={modalUIStore.bulkLabelDialog.entityIds}
            onClose={() => modalUIStore.closeBulkLabelDialog()}
          />
        {/if}
      {/await}
    {/if}

    {#await loadModal(() => import("$lib/components/dice/DiceModal.svelte"), "DiceModal") then DiceModal}
      {#if DiceModal}
        <DiceModal />
      {/if}
    {/await}

    {#await loadModal(() => import("$lib/components/canvas/CanvasSelectionModal.svelte"), "CanvasSelectionModal") then CanvasSelectionModal}
      {#if CanvasSelectionModal}
        <CanvasSelectionModal />
      {/if}
    {/await}

    {#if isSpecialEnv}
      {#await loadModal(() => import("$lib/components/debug/DebugConsole.svelte"), "DebugConsole") then DebugConsole}
        {#if DebugConsole}
          <DebugConsole />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.soundBite?.show}
      {#await loadModal(() => import("$lib/components/modals/SoundBiteModal.svelte"), "SoundBiteModal") then SoundBiteModal}
        {#if SoundBiteModal}
          <SoundBiteModal />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.relatedEntityDialog.open}
      {#await loadModal(() => import("$lib/components/entity-detail/RelatedEntityModal.svelte"), "RelatedEntityModal") then RelatedEntityModal}
        {#if RelatedEntityModal}
          <RelatedEntityModal
            isOpen={modalUIStore.relatedEntityDialog.open}
            sourceEntityId={modalUIStore.relatedEntityDialog.sourceEntityId}
            onClose={() => modalUIStore.closeRelatedEntityDialog()}
          />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.showVaultSwitcher}
      {#await loadModal(() => import("$lib/components/vaults/VaultSwitcherModal.svelte"), "VaultSwitcherModal") then VaultSwitcherModal}
        {#if VaultSwitcherModal}
          <VaultSwitcherModal
            onClose={() => modalUIStore.closeVaultSwitcher()}
          />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.showShare}
      {#await loadModal(() => import("$lib/components/ShareModal.svelte"), "ShareModal") then ShareModal}
        {#if ShareModal}
          <ShareModal close={() => modalUIStore.closeShare()} />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.imagePromptReview.open}
      {#await loadModal(() => import("./ImagePromptReviewModal.svelte"), "ImagePromptReviewModal") then ImagePromptReviewModal}
        {#if ImagePromptReviewModal}
          <ImagePromptReviewModal />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.revisionDialog.open}
      {#await loadModal(() => import("./RevisionInstructionModal.svelte"), "RevisionInstructionModal") then RevisionInstructionModal}
        {#if RevisionInstructionModal}
          <RevisionInstructionModal />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.plotDialog.open}
      {#await loadModal(() => import("./PlotModal.svelte"), "PlotModal") then PlotModal}
        {#if PlotModal}
          <PlotModal />
        {/if}
      {/await}
    {/if}

    {#if modalUIStore.generatorWorkflow.open}
      {#await loadModal(() => import("$lib/components/generators/CampaignGeneratorModal.svelte"), "CampaignGeneratorModal") then CampaignGeneratorModal}
        {#if CampaignGeneratorModal}
          <CampaignGeneratorModal />
        {/if}
      {/await}
    {/if}

    <!-- Global Image Lightbox -->
    {#if hasOpenedLightbox}
      {#await loadModal(() => import("$lib/components/zen/ZenImageLightbox.svelte"), "ZenImageLightbox") then ZenImageLightbox}
        {#if ZenImageLightbox}
          <ZenImageLightbox
            bind:show={modalUIStore.lightbox.show}
            imageUrl={modalUIStore.lightbox.imageUrl}
            title={modalUIStore.lightbox.title}
          />
        {/if}
      {/await}
    {/if}

    <!-- Guest Character Chat Modal -->
    {#await loadModal(() => import("$lib/components/modals/GuestChatModal.svelte"), "GuestChatModal") then GuestChatModal}
      {#if GuestChatModal}
        <GuestChatModal />
      {/if}
    {/await}
  {/if}
{/if}
