<script lang="ts">
  let {
    isDrawingMode = false,
    onToggleDrawing,
    isErasingMode = false,
    onToggleErasing,
  }: {
    isDrawingMode?: boolean;
    onToggleDrawing?: () => void;
    isErasingMode?: boolean;
    onToggleErasing?: () => void;
  } = $props();
</script>

{#if onToggleDrawing}
  <button type="button" aria-pressed={isDrawingMode} onclick={onToggleDrawing}>
    {isDrawingMode ? "Exit drawing mode" : "Draw on canvas"}
  </button>
{/if}

{#if onToggleErasing}
  <button type="button" aria-pressed={isErasingMode} onclick={onToggleErasing}>
    {isErasingMode ? "Exit eraser mode" : "Erase a drawing stroke"}
  </button>
{/if}
