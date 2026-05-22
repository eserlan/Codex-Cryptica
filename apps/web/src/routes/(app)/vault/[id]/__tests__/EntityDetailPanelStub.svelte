<script lang="ts">
  let {
    entity,
  }: { entity: { id: string; title?: string } | null | undefined } = $props();
</script>

{#if entity}
  <div data-testid="entity-detail-panel-stub">{entity.id}</div>
{/if}
