<script lang="ts">
  import type { ViewPreset } from "$lib/stores/view-presets";

  /**
   * The layout controls for one saved view (#3456): a marker when the view has
   * a saved layout, an action to keep what is on screen as its layout, and,
   * when it has one, an action to remove it. Text labels on every button and a
   * text alternative on the marker, so nothing relies on colour or icons alone.
   */
  let {
    preset,
    isOpen,
    unavailableReason,
    onSave,
    onRemove,
  }: {
    preset: ViewPreset;
    /** True for the view that is currently open. */
    isOpen: boolean;
    unavailableReason?: string;
    onSave: (preset: ViewPreset) => void;
    onRemove: (preset: ViewPreset) => void;
  } = $props();

  const hasLayout = $derived(!!preset.state.layout);
  // Updating needs a layout to be possible and this to be the view on screen.
  const blocked = $derived(!!unavailableReason || !isOpen);
  const buttonClass =
    "w-6 h-6 flex items-center justify-center text-theme-muted hover:text-theme-primary disabled:opacity-40 disabled:hover:text-theme-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none rounded transition";
</script>

{#if hasLayout}
  <span
    class="w-5 h-6 flex items-center justify-center text-theme-primary/80"
    role="img"
    aria-label={`"${preset.name}" has a saved layout`}
    title="Has a saved layout"
    data-testid="view-preset-has-layout"
  >
    <span aria-hidden="true" class="icon-[lucide--layout-grid] w-3 h-3"></span>
  </span>
{/if}
<button
  type="button"
  class={buttonClass}
  onclick={() => !blocked && onSave(preset)}
  disabled={blocked}
  title={unavailableReason ??
    (isOpen
      ? "Update layout snapshot: keep what is on screen as this view's layout"
      : "Open this view first to update its layout")}
  aria-label={hasLayout
    ? `Update layout snapshot for "${preset.name}"`
    : `Save current layout to "${preset.name}"`}
  data-testid="view-preset-update-layout"
>
  <span aria-hidden="true" class="icon-[lucide--camera] w-3 h-3"></span>
</button>
{#if hasLayout}
  <button
    type="button"
    class={buttonClass}
    onclick={() => onRemove(preset)}
    title="Remove the saved layout (keeps the filters)"
    aria-label={`Remove saved layout from "${preset.name}"`}
    data-testid="view-preset-remove-layout"
  >
    <span aria-hidden="true" class="icon-[lucide--eraser] w-3 h-3"></span>
  </button>
{/if}
