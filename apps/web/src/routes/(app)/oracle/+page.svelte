<script lang="ts">
  import OracleChat from "$lib/components/oracle/OracleChat.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { onMount } from "svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import AdventureSurface from "$lib/components/oracle/adventure/AdventureSurface.svelte";
  let adventureMode = $state(false);

  onMount(() => {
    oracle.init();
  });
</script>

<svelte:head>
  <title>Lore Oracle | Codex Cryptica</title>
  <meta
    name="description"
    content="Ask questions about your RPG campaign world and generate new lore using the AI-powered Oracle."
  />
</svelte:head>

<div
  class="fixed top-0 left-0 w-full h-[100dvh] bg-theme-bg flex flex-col overflow-hidden"
>
  <!-- Standalone Header -->
  <div
    class="px-4 py-3 border-b border-oracle-dim/30 bg-oracle-dark/20 flex justify-between items-center shrink-0"
  >
    <div class="flex items-center gap-2">
      <div
        class="w-2 h-2 bg-oracle-primary rounded-full {oracle.isLoading
          ? 'animate-pulse'
          : ''}"
      ></div>
      <span
        class="text-[10px] font-bold text-oracle-primary tracking-[0.2em] uppercase font-header"
        >Lore Oracle Standalone</span
      >
    </div>
    <div class="flex items-center gap-2">
      {#if !adventureMode && oracle.messages.length > 0}
        <button
          type="button"
          class="px-3 py-1 flex items-center gap-2 text-[10px] font-bold text-oracle-primary hover:text-red-400 border border-oracle-dim/30 hover:border-red-500/50 transition-all uppercase font-header tracking-widest bg-oracle-dark/20"
          onclick={() => oracle.clearMessages()}
          aria-label="Clear conversation history"
        >
          <span aria-hidden="true" class="icon-[lucide--trash-2] w-3.5 h-3.5"
          ></span>
          Clear Chat
        </button>
      {/if}
      <div
        class="text-[9px] font-mono text-oracle-dark/50 uppercase tracking-widest hidden sm:block"
      >
        Multi-Window Sync Active
      </div>
    </div>
  </div>

  <div class="border-b border-oracle-dim/30 px-4 py-2">
    <button
      type="button"
      class="rounded px-3 py-2 text-xs text-oracle-primary {adventureMode
        ? 'bg-oracle-primary/15'
        : ''}"
      onclick={() => (adventureMode = !adventureMode)}
      aria-pressed={adventureMode}>Adventure</button
    >
  </div>

  {#if adventureMode}
    <AdventureSurface />
  {:else}
    <OracleChat
      onOpenSettings={() => {
        notificationStore.notify(
          "To update Oracle settings, open the Settings panel in the main Codex Cryptica window.",
          "error",
        );
      }}
    />
  {/if}
</div>

<style>
  :global(body) {
    background: var(--color-bg-primary);
    margin: 0;
    padding: 0;
  }
</style>
