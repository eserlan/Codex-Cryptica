<script lang="ts">
  import { focusEntity } from "$lib/stores/ui/navigation";

  let { entityId }: { entityId: string } = $props();
</script>

<div data-testid="embedded-entity-view">Focused {entityId}</div>
<button data-testid="embedded-close" onclick={() => focusEntity(null)}>
  Close
</button>
