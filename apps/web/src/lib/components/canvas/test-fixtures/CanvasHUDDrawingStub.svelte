<script lang="ts">
  let {
    isDrawingMode = false,
    onToggleDrawing,
    isErasingMode = false,
    onToggleErasing,
    showImageLabels = false,
    onToggleShowImageLabels,
  }: {
    isDrawingMode?: boolean;
    onToggleDrawing?: () => void;
    isErasingMode?: boolean;
    onToggleErasing?: () => void;
    showImageLabels?: boolean;
    onToggleShowImageLabels?: () => void;
  } = $props();
</script>

{#if onToggleDrawing}
  <button type="button" aria-pressed={isDrawingMode} onclick={onToggleDrawing}>
    {isDrawingMode ? "Exit drawing mode" : "Draw on canvas"}
  </button>
{/if}

{#if onToggleShowImageLabels}
  <button type="button" onclick={onToggleShowImageLabels}>
    {showImageLabels ? "Hide image labels" : "Show image labels"}
  </button>
{/if}

{#if onToggleErasing}
  <button type="button" aria-pressed={isErasingMode} onclick={onToggleErasing}>
    {isErasingMode ? "Exit eraser mode" : "Erase a drawing stroke"}
  </button>
{/if}
