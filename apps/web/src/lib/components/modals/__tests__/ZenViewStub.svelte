<script lang="ts">
  let { onClose }: { onClose: () => void } = $props();

  export function requestClose() {
    onClose();
  }
</script>

<button data-testid="zen-close" onclick={onClose}>close</button>
