<script lang="ts">
  import { browser } from "$app/environment";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { helpStore } from "$lib/stores/help.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";
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

  const isSpecialEnv =
    import.meta.env.DEV ||
    (typeof window !== "undefined" && (window as any).__E2E__) ||
    import.meta.env.VITE_STAGING === "true";

  const logChunkError = (name: string, error: any) => {
    if (isSpecialEnv) {
      console.error(`Failed to load ${name}`, error);
    } else {
      debugStore.error(`Failed to lazy-load component: ${name}`, error);
    }
  };

  let OracleWindow = $state<any>(null);
  let ZenModeModal = $state<any>(null);
  let TourOverlay = $state<any>(null);
  let DebugConsole = $state<any>(null);
  let MergeNodesDialog = $state<any>(null);
  let BulkLabelDialog = $state<any>(null);
  let DiceModal = $state<any>(null);

  const isLoginRoute = $derived(page.url.pathname === `${base}/login`);

  $effect(() => {
    if (uiStore.showZenMode && !ZenModeModal) {
      import("$lib/components/modals/ZenModeModal.svelte")
        .then((m) => (ZenModeModal = m.default))
        .catch((e) => logChunkError("ZenModeModal", e));
    }

    if (helpStore.activeTour && !TourOverlay) {
      import("$lib/components/help/TourOverlay.svelte")
        .then((m) => (TourOverlay = m.default))
        .catch((e) => logChunkError("TourOverlay", e));
    }

    if (uiStore.mergeDialog.open && !MergeNodesDialog) {
      import("$lib/components/dialogs/MergeNodesDialog.svelte")
        .then((m) => (MergeNodesDialog = m.default))
        .catch((e) => logChunkError("MergeNodesDialog", e));
    }

    if (uiStore.bulkLabelDialog.open && !BulkLabelDialog) {
      import("$lib/components/dialogs/BulkLabelDialog.svelte")
        .then((m) => (BulkLabelDialog = m.default))
        .catch((e) => logChunkError("BulkLabelDialog", e));
    }

    if (!DiceModal) {
      import("$lib/components/dice/DiceModal.svelte")
        .then((m) => (DiceModal = m.default))
        .catch((e) => logChunkError("DiceModal", e));
    }

    if (!OracleWindow) {
      import("$lib/components/oracle/OracleWindow.svelte")
        .then((m) => (OracleWindow = m.default))
        .catch((e) => logChunkError("OracleWindow", e));
    }

    if (isSpecialEnv && !DebugConsole) {
      import("$lib/components/debug/DebugConsole.svelte")
        .then((m) => (DebugConsole = m.default))
        .catch((e) => logChunkError("DebugConsole", e));
    }
  });
</script>

<SearchModal />

{#if !isLoginRoute}
  {#if OracleWindow}
    <OracleWindow />
  {/if}
  {#if browser}
    <SettingsModal />

    {#if ZenModeModal}
      <ZenModeModal />
    {/if}
    {#if TourOverlay}
      <TourOverlay />
    {/if}
    <MobileMenu bind:isOpen={isMobileMenuOpen} />
    {#if MergeNodesDialog}
      <MergeNodesDialog
        isOpen={uiStore.mergeDialog.open}
        sourceNodeIds={uiStore.mergeDialog.sourceIds}
        onClose={() => uiStore.closeMergeDialog()}
      />
    {/if}
    {#if BulkLabelDialog}
      <BulkLabelDialog
        isOpen={uiStore.bulkLabelDialog.open}
        entityIds={uiStore.bulkLabelDialog.entityIds}
        onClose={() => uiStore.closeBulkLabelDialog()}
      />
    {/if}
    {#if DiceModal}
      <DiceModal />
    {/if}
    {#if DebugConsole}
      <DebugConsole />
    {/if}
  {/if}
{/if}
