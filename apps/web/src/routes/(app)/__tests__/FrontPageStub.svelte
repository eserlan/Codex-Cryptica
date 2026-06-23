<script lang="ts">
  let { onClose }: { onClose?: () => void } = $props();
</script>

<div data-testid="front-page-stub">
  {#if onClose}
    <button data-testid="close-front-page" onclick={onClose}>Close</button>
  {/if}
</div>
