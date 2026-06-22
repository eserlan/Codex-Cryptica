<script lang="ts">
  let { entityId }: { entityId: string | null } = $props();
</script>

<div data-testid="entity-explorer-workspace">{entityId ?? "empty"}</div>
