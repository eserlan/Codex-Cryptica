<script lang="ts">
  import { getThemeLoadingMessages } from "generator-engine";

  let { running }: { running: boolean } = $props();

  const messages = getThemeLoadingMessages();
  let index = $state(0);

  $effect(() => {
    if (!running) return;
    index = 0;
    const id = setInterval(() => {
      index = (index + 1) % messages.length;
    }, 2500);
    return () => clearInterval(id);
  });
</script>

{#if running}
  <p role="status" class="text-sm text-theme-muted">{messages[index]}</p>
{/if}
