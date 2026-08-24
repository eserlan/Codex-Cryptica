<script lang="ts">
  import PlayToolsVault, {
    type PlayToolsTab,
  } from "$lib/components/dice/PlayToolsVault.svelte";
  import { page } from "$app/state";

  const rawTab = $derived(page.url.searchParams.get("tab"));
  let activeTab = $state<PlayToolsTab>("dice");

  $effect(() => {
    if (rawTab === "decks" || rawTab === "tables" || rawTab === "dice") {
      activeTab = rawTab;
    }
  });

  const headerInfo = $derived.by(() => {
    switch (activeTab) {
      case "decks":
        return { title: "Decks & Cards", icon: "icon-[lucide--layers]" };
      case "tables":
        return {
          title: "Random Tables",
          icon: "icon-[lucide--table-properties]",
        };
      case "dice":
      default:
        return { title: "Play Tools", icon: "icon-[lucide--dices]" };
    }
  });
</script>

<svelte:head>
  <title>Codex Cryptica | {headerInfo.title}</title>
</svelte:head>

<div class="h-screen bg-theme-bg flex flex-col overflow-hidden font-body">
  <!-- Header (Standalone Version) -->
  <div
    class="p-4 border-b border-theme-border flex justify-between items-center bg-theme-surface shrink-0"
  >
    <div class="flex items-center gap-2">
      <span class="{headerInfo.icon} w-5 h-5 text-theme-primary"></span>
      <h1
        class="text-sm font-bold font-header tracking-widest text-theme-text uppercase"
      >
        {headerInfo.title}
      </h1>
    </div>
    <div
      class="text-[9px] text-theme-muted uppercase font-mono tracking-widest opacity-60"
    >
      Standalone Mode
    </div>
  </div>

  <div class="flex-1 min-h-0">
    <PlayToolsVault isStandalone={true} bind:activeTab />
  </div>

  <footer
    class="p-2 text-center text-[9px] text-theme-muted/40 uppercase font-header tracking-widest bg-theme-surface border-t border-theme-border shrink-0"
  >
    Codex Cryptica // Session Play Tools
  </footer>
</div>

<style>
  @reference "../../../app.css";
</style>
