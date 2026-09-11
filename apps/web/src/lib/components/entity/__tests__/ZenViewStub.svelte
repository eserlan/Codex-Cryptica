<script lang="ts">
  let { entityId, onClose }: { entityId: string; onClose?: () => void } =
    $props();
</script>

<div data-testid="zen-view-stub">
  <span>{entityId}</span>
  <button data-testid="zen-close-btn" onclick={onClose}>Close</button>
</div>
