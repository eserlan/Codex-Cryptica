<script lang="ts">
  let { entityId, count }: { entityId: string; count: number } = $props();
</script>

{#if count > 0}
  <span
    class="rounded-full border border-theme-danger/50 bg-theme-danger/10 px-2 py-0.5 text-xs font-medium text-theme-text"
    data-testid="entity-unresolved-marker-{entityId}"
  >
    {count} unresolved
  </span>
{/if}
