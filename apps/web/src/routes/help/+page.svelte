<script lang="ts">
  import HelpTab from "$lib/components/help/HelpTab.svelte";
  import { helpStore } from "$lib/stores/help.svelte";
  import { onMount } from "svelte";

  onMount(() => {
    // Ensure help store is initialized if navigating directly
    helpStore.init();
  });
</script>

<svelte:head>
  <title>Codex Cryptica | Documentation</title>
</svelte:head>

<div class="min-h-screen bg-theme-background p-6 lg:p-12 max-w-5xl mx-auto">
  <div class="mb-12">
    <h1
      class="text-2xl font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-2"
    >
      Documentation
    </h1>
    <p class="text-xs text-theme-muted uppercase font-mono tracking-widest">
      Operational protocols & system guides
    </p>
  </div>

  <HelpTab isStandalone={true} />
</div>
