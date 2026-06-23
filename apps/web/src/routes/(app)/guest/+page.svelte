<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import {
    getGuestHistory,
    removeGuestHistory,
    clearGuestHistory,
  } from "$lib/services/publishing/guest-history";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { guestVault } from "$lib/stores/guest-vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { GuestHistory } from "schema";

  let history = $state<GuestHistory[]>([]);

  onMount(() => {
    if (sessionModeStore.isGuestMode) {
      sessionModeStore.isGuestMode = false;
      guestVault.clear();
      if (vault.activeVaultId) {
        void themeStore.loadForVault(vault.activeVaultId);
      }
    }
    loadHistory();
  });

  function loadHistory() {
    history = getGuestHistory();
  }

  function handleForget(publishId: string) {
    removeGuestHistory(publishId);
    loadHistory();
  }

  function handleClearAll() {
    if (confirm("Are you sure you want to clear your shared worlds history?")) {
      clearGuestHistory();
      loadHistory();
    }
  }
</script>

<svelte:head>
  <title>Shared Worlds — Codex Cryptica</title>
  <meta
    name="description"
    content="Explore RPG campaign snapshots and lore shared by your Game Master."
  />
</svelte:head>

<div
  class="h-full w-full overflow-y-auto bg-theme-bg p-6 md:p-12 flex flex-col items-center justify-start text-theme-text"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="w-full max-w-2xl space-y-8">
    <!-- Header -->
    <div class="space-y-3 text-center sm:text-left">
      <div class="flex items-center justify-center sm:justify-start gap-3">
        <span class="icon-[lucide--book-open] h-8 w-8 text-theme-primary"
        ></span>
        <h2
          class="text-2xl font-bold font-header tracking-wide uppercase text-theme-primary"
        >
          Shared Worlds
        </h2>
      </div>
      <p class="text-sm text-theme-text/75 leading-relaxed">
        Welcome to the Codex Cryptica Guest portal. Here you can browse
        read-only, player-safe campaign lore snapshots shared by your Game
        Master.
      </p>
    </div>

    <!-- History Container -->
    <div class="space-y-4">
      <div
        class="flex items-center justify-between border-b border-theme-border/50 pb-2"
      >
        <h3
          class="text-xs font-bold uppercase tracking-wider text-theme-primary font-header"
        >
          Recent Shared Worlds
        </h3>
        {#if history.length > 0}
          <button
            type="button"
            onclick={handleClearAll}
            class="text-xs text-red-400 hover:text-red-300 font-mono transition-colors"
          >
            Clear History
          </button>
        {/if}
      </div>

      {#if history.length === 0}
        <div
          class="p-8 text-center border border-dashed border-theme-border/40 rounded-lg space-y-4 bg-theme-surface/10"
        >
          <div
            class="mx-auto w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary/80"
          >
            <span class="icon-[lucide--history] w-5 h-5"></span>
          </div>
          <div class="space-y-1.5 max-w-sm mx-auto">
            <h4
              class="text-sm font-bold uppercase font-header tracking-wider text-theme-text"
            >
              No Visited Worlds
            </h4>
            <p class="text-xs text-theme-text/50 leading-relaxed">
              When you open a shared lore link (e.g. <code>/guest/[id]</code>)
              provided by your GM, it will automatically appear here for quick
              access next time.
            </p>
          </div>
        </div>
      {:else}
        <div class="space-y-3">
          {#each history as item (item.publishId)}
            <div
              class="p-4 bg-theme-surface/50 border border-theme-border/40 hover:border-theme-primary/45 rounded-lg flex items-center justify-between gap-4 transition-all group"
            >
              <a
                href="{base}/guest/{item.publishId}"
                class="flex-1 space-y-1 text-left"
              >
                <div
                  class="font-bold text-sm text-theme-primary group-hover:underline"
                >
                  {item.vaultTitle}
                </div>
                <div class="text-[11px] text-theme-text/50">
                  Last Visited: {new Date(item.lastAccessed).toLocaleString()}
                </div>
              </a>

              <div class="flex items-center gap-2">
                <a
                  href="{base}/guest/{item.publishId}"
                  class="px-3 py-1.5 bg-theme-primary hover:bg-theme-primary/95 text-white text-xs font-bold font-header uppercase tracking-wider rounded transition-all flex items-center gap-1"
                >
                  Open
                  <span class="icon-[lucide--chevron-right] w-3.5 h-3.5"></span>
                </a>
                <button
                  type="button"
                  onclick={() => handleForget(item.publishId)}
                  class="p-1.5 border border-theme-border hover:border-red-500/30 hover:text-red-400 text-theme-text/50 rounded transition-all"
                  title="Forget this world"
                >
                  <span class="icon-[lucide--trash-2] w-4 h-4"></span>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Back to Main App Link -->
    <div class="text-center pt-4">
      <a
        href="{base}/"
        class="inline-flex items-center text-xs text-theme-primary hover:underline"
      >
        <span class="icon-[lucide--arrow-left] mr-1.5 h-3.5 w-3.5"></span>
        Return to Local RPG Vault Creator
      </a>
    </div>
  </div>
</div>
