<script lang="ts">
  let {
    isDrawingMode = false,
    onToggleDrawing,
  }: {
    isDrawingMode?: boolean;
    onToggleDrawing?: () => void;
  } = $props();
</script>

{#if onToggleDrawing}
  <button type="button" aria-pressed={isDrawingMode} onclick={onToggleDrawing}>
    {isDrawingMode ? "Exit drawing mode" : "Draw on canvas"}
  </button>
{/if}
