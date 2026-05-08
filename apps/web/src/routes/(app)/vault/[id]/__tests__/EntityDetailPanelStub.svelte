<script lang="ts">
  let { entity }: { entity: { id: string; title?: string } } = $props();
</script>

<div data-testid="entity-detail-panel-stub">{entity.id}</div>
