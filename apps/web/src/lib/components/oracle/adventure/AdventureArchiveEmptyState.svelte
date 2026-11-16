<script lang="ts">
  let {
    hasEntries,
    hasResults,
    query,
  }: { hasEntries: boolean; hasResults: boolean; query: string } = $props();
</script>

{#if !hasEntries}
  <p class="text-sm text-theme-text">No archived adventures yet.</p>
{/if}
{#if hasEntries && !hasResults}
  <p class="text-sm text-theme-text">No adventures match “{query}”.</p>
{/if}
