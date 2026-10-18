<script lang="ts">
  import { onMount } from "svelte";
  import AdventureSurface from "$lib/components/oracle/adventure/AdventureSurface.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";

  onMount(() => {
    void oracle.init();
  });
</script>

<svelte:head>
  <title>Play | Codex Cryptica</title>
  <meta
    name="description"
    content="Play a solo adventure guided by your campaign world."
  />
</svelte:head>

<div
  class="flex min-h-0 flex-1 flex-col overflow-hidden bg-theme-bg"
  data-testid="adventure-workspace"
>
  <AdventureSurface />
</div>
