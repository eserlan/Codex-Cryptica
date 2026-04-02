<script lang="ts">
  import { browser } from "$app/environment";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { helpStore } from "$lib/stores/help.svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import SearchModal from "$lib/components/search/SearchModal.svelte";
  import SettingsModal from "$lib/components/settings/SettingsModal.svelte";
  import MobileMenu from "$lib/components/layout/MobileMenu.svelte";

  let {
    isMobileMenuOpen = $bindable(false),
  }: {
    isMobileMenuOpen: boolean;
  } = $props();

  const isLoginRoute = $derived(page.url.pathname === `${base}/login`);

  const isSpecialEnv =
    import.meta.env.DEV ||
    (typeof window !== "undefined" && (window as any).__E2E__) ||
    import.meta.env.VITE_STAGING === "true";

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
</script>

<SearchModal />

{#if !isLoginRoute}
  {#await loadModal(() => import("$lib/components/oracle/OracleWindow.svelte"), "OracleWindow") then OracleWindow}
    {#if OracleWindow}
      <OracleWindow />
    {/if}
  {/await}

  {#if browser}
    <SettingsModal />

    {#if uiStore.showZenMode}
      {#await loadModal(() => import("./ZenModeModal.svelte"), "ZenModeModal") then ZenModeModal}
        {#if ZenModeModal}
          <ZenModeModal />
        {/if}
      {/await}
    {/if}

    {#if helpStore.activeTour}
      {#await loadModal(() => import("$lib/components/help/TourOverlay.svelte"), "TourOverlay") then TourOverlay}
        {#if TourOverlay}
          <TourOverlay />
        {/if}
      {/await}
    {/if}

    <MobileMenu bind:isOpen={isMobileMenuOpen} />

    {#if uiStore.mergeDialog.open}
      {#await loadModal(() => import("$lib/components/dialogs/MergeNodesDialog.svelte"), "MergeNodesDialog") then MergeNodesDialog}
        {#if MergeNodesDialog}
          <MergeNodesDialog
            isOpen={uiStore.mergeDialog.open}
            sourceNodeIds={uiStore.mergeDialog.sourceIds}
            onClose={() => uiStore.closeMergeDialog()}
          />
        {/if}
      {/await}
    {/if}

    {#if uiStore.bulkLabelDialog.open}
      {#await loadModal(() => import("$lib/components/dialogs/BulkLabelDialog.svelte"), "BulkLabelDialog") then BulkLabelDialog}
        {#if BulkLabelDialog}
          <BulkLabelDialog
            isOpen={uiStore.bulkLabelDialog.open}
            entityIds={uiStore.bulkLabelDialog.entityIds}
            onClose={() => uiStore.closeBulkLabelDialog()}
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
  {/if}
{/if}
