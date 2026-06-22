<script lang="ts">
  import type { Entity } from "schema";

  let {
    onSelect,
    onOpenZen,
  }: {
    onSelect?: (entity: Entity) => void;
    onOpenZen?: (entity: Entity) => void;
  } = $props();

  const entity = {
    id: "entity-1",
    title: "Entity 1",
  } as Entity;
</script>

<button data-testid="entity-select" onclick={() => onSelect?.(entity)}>
  Select Entity
</button>
<button data-testid="entity-open-zen" onclick={() => onOpenZen?.(entity)}>
  Open Zen
</button>
