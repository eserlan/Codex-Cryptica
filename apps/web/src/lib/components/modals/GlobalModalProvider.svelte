<script lang="ts">
  import { browser } from "$app/environment";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { helpStore } from "$lib/stores/help.svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import SearchModal from "$lib/components/search/SearchModal.svelte";
  import SettingsModal from "$lib/components/settings/SettingsModal.svelte";
  import MobileMenu from "$lib/components/layout/MobileMenu.svelte";

  // Direct imports instead of lazy loading for better E2E reliability
  import ZenModeModal from "./ZenModeModal.svelte";
  import TourOverlay from "$lib/components/help/TourOverlay.svelte";
  import MergeNodesDialog from "$lib/components/dialogs/MergeNodesDialog.svelte";
  import BulkLabelDialog from "$lib/components/dialogs/BulkLabelDialog.svelte";
  import DiceModal from "$lib/components/dice/DiceModal.svelte";
  import OracleWindow from "$lib/components/oracle/OracleWindow.svelte";
  import DebugConsole from "$lib/components/debug/DebugConsole.svelte";
  import CanvasSelectionModal from "$lib/components/canvas/CanvasSelectionModal.svelte";

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
</script>

<SearchModal />

{#if !isLoginRoute}
  <OracleWindow />

  {#if browser}
    <SettingsModal />

    {#if uiStore.showZenMode}
      <ZenModeModal />
    {/if}

    {#if helpStore.activeTour}
      <TourOverlay />
    {/if}

    <MobileMenu bind:isOpen={isMobileMenuOpen} />

    {#if uiStore.mergeDialog.open}
      <MergeNodesDialog
        isOpen={uiStore.mergeDialog.open}
        sourceNodeIds={uiStore.mergeDialog.sourceIds}
        onClose={() => uiStore.closeMergeDialog()}
      />
    {/if}

    {#if uiStore.bulkLabelDialog.open}
      <BulkLabelDialog
        isOpen={uiStore.bulkLabelDialog.open}
        entityIds={uiStore.bulkLabelDialog.entityIds}
        onClose={() => uiStore.closeBulkLabelDialog()}
      />
    {/if}

    <DiceModal />
    <CanvasSelectionModal />

    {#if isSpecialEnv}
      <DebugConsole />
    {/if}
  {/if}
{/if}
