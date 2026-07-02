<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { page } from "$app/state";
  import { replaceState } from "$app/navigation";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { guestVault } from "$lib/stores/guest-vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import {
    addGuestHistory,
    removeGuestHistory,
  } from "$lib/services/publishing/guest-history";
  import { base } from "$app/paths";
  import GraphView from "$lib/components/GraphView.svelte";
  import EntityDetailPanel from "$lib/components/EntityDetailPanel.svelte";
  import EmbeddedEntityView from "$lib/components/entity/EmbeddedEntityView.svelte";
  import FrontPage from "$lib/components/world/FrontPage.svelte";

  let { data } = $props();

  let loading = $state(true);
  let errorMsg = $state<string | null>(null);

  // Get selected entity in guest mode
  let selectedEntity = $derived.by(() => {
    const id = vault.selectedEntityId;
    return id ? vault.entities[id] : null;
  });

  // Keep the ?entity= param in sync with the selection so the address bar
  // always holds a shareable deep link.
  // Tracks only the selection — reading page.url untracked keeps the effect
  // from re-running (and stripping the param) on back/forward navigation.
  $effect(() => {
    if (loading) return;
    const id = selectedEntity?.id ?? null;
    const url = new URL(untrack(() => page.url));
    if ((url.searchParams.get("entity") ?? null) === id) return;
    if (id) url.searchParams.set("entity", id);
    else url.searchParams.delete("entity");
    replaceState(url, {});
  });

  onMount(async () => {
    // Always dismiss onboarding landing page in guest mode
    onboardingStore.dismissLandingPage();

    if (data.error) {
      errorMsg = data.error;
      loading = false;
      if (data.status === 404 || data.status === 410) {
        removeGuestHistory(data.publishId);
      }
      return;
    }

    if (data.bundle) {
      try {
        // 1. Force guest mode
        sessionModeStore.isGuestMode = true;

        // 2. Load the bundle into our reactive guest vault
        await guestVault.loadBundle(data.bundle);

        // 3. Apply the host's campaign theme
        if (typeof data.bundle.activeTheme?.id === "string") {
          await themeStore.setTheme(data.bundle.activeTheme.id);
        }

        // 4. Record to Guest History
        addGuestHistory(data.publishId, data.bundle.vaultTitle);

        // 5. Deep link: /guest/{publishId}?entity={id} opens that entity in
        // the full-screen zen view (sidebar selected underneath, so closing
        // zen leaves the entity in context).
        const linkedEntityId = page.url.searchParams.get("entity");
        if (linkedEntityId && vault.entities[linkedEntityId]) {
          vault.selectedEntityId = linkedEntityId;
          modalUIStore.openZenMode(linkedEntityId);
        }

        loading = false;
      } catch (err: any) {
        errorMsg = err.message || "Failed to initialize guest vault";
        loading = false;
      }
    } else {
      errorMsg = "No bundle data received";
      loading = false;
    }
  });
</script>

<svelte:head>
  {#if data.bundle}
    <title>{data.bundle.vaultTitle} — Codex Cryptica Guest View</title>
    <meta
      name="description"
      content="Browse the public world lore of {data.bundle
        .vaultTitle} shared via Codex Cryptica."
    />
  {:else}
    <title>Guest Vault — Codex Cryptica</title>
  {/if}
</svelte:head>

<div
  class="flex h-full w-full min-h-0 bg-chrome-bg text-chrome-text overflow-hidden relative"
>
  {#if loading}
    <!-- Full-screen Loading State -->
    <div
      class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-theme-bg/95 backdrop-blur-sm transition-all duration-300"
    >
      <div class="flex flex-col items-center space-y-4">
        <!-- Spinner -->
        <div
          class="h-10 w-10 animate-spin rounded-full border-4 border-theme-muted border-t-theme-primary"
        ></div>
        <p
          class="font-mono text-sm text-theme-primary tracking-widest uppercase animate-pulse"
        >
          {themeStore.resolveJargon("loading_vault") ||
            "Loading Shared World..."}
        </p>
      </div>
    </div>
  {:else if errorMsg}
    <!-- Error View -->
    <div
      class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-theme-bg/98"
      style:background-image="var(--bg-texture-overlay)"
    >
      <div
        class="w-full max-w-md p-6 rounded-xl border border-theme-accent/30 bg-theme-surface/80 backdrop-blur shadow-2xl flex flex-col items-center text-center space-y-6"
      >
        <!-- Error Icon -->
        <div
          class="h-16 w-16 rounded-full bg-theme-accent/10 flex items-center justify-center text-theme-accent"
        >
          <span class="icon-[lucide--alert-triangle] h-8 w-8"></span>
        </div>

        <div class="space-y-2">
          <h2 class="text-xl font-bold tracking-tight text-theme-primary">
            Snapshot Unavailable
          </h2>
          <p class="text-sm text-theme-muted">{errorMsg}</p>
        </div>

        <div class="flex flex-col w-full gap-2">
          <a
            href="{base}/guest"
            class="flex items-center justify-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all border border-theme-border bg-theme-surface hover:bg-theme-bg text-theme-primary"
          >
            <span class="icon-[lucide--arrow-left] mr-2 h-4 w-4"></span>
            Back to Shared Worlds
          </a>
        </div>
      </div>
    </div>
  {:else}
    <!-- Main Guest View Workspace -->
    <div class="flex-1 relative overflow-hidden">
      {#if layoutUIStore.mainViewMode === "focus" && layoutUIStore.focusedEntityId}
        <EmbeddedEntityView entityId={layoutUIStore.focusedEntityId} />
      {:else}
        {#key guestVault.publishId}
          <GraphView bind:selectedId={vault.selectedEntityId} />
        {/key}
      {/if}
    </div>

    <!-- Entity Detail Panel (Right Sidebar) -->
    {#if selectedEntity}
      <EntityDetailPanel
        entity={selectedEntity}
        onClose={() => (vault.selectedEntityId = null)}
      />
    {/if}

    <!-- Vault Front Page Overlay -->
    {#if !onboardingStore.dismissedWorldPage && !selectedEntity && guestVault.entities.length > 0}
      <div
        data-testid="front-page-overlay"
        class="absolute inset-0 z-40 overflow-y-auto p-4 md:p-6 bg-theme-bg/96 backdrop-blur-sm"
        style:background-image="var(--bg-texture-overlay)"
        role="presentation"
      >
        <FrontPage
          onClose={() => {
            onboardingStore.dismissedWorldPage = true;
          }}
        />
      </div>
    {/if}
  {/if}
</div>
