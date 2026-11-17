<script lang="ts">
  import type { TraitSelection } from "schema";
  import SpeciesTraitList from "./SpeciesTraitList.svelte";

  let {
    current,
    sourceAvailable,
    readOnly,
    onOpenSource,
    onChange,
    onRemove,
  }: {
    current: TraitSelection;
    sourceAvailable: boolean;
    readOnly: boolean;
    onOpenSource: () => void;
    onChange: () => void;
    onRemove: () => void;
  } = $props();

  const buttonClass =
    "rounded border border-theme-border px-2 py-1 text-micro font-bold uppercase text-theme-text";
</script>

<div class="flex items-center justify-between gap-2">
  {#if sourceAvailable}
    <button
      type="button"
      class="text-sm font-bold text-theme-text hover:underline"
      onclick={onOpenSource}
      data-testid="species-source-link"
    >
      {current.sourceTitle}
    </button>
  {:else}
    <span class="text-sm font-bold text-theme-text">{current.sourceTitle}</span>
    <span class="text-xs text-theme-text" data-testid="species-unavailable">
      Source creature unavailable
    </span>
  {/if}
  {#if !readOnly}
    <div class="flex gap-2">
      <button
        type="button"
        class="{buttonClass} hover:border-theme-primary hover:text-theme-primary"
        onclick={onChange}
        data-testid="species-change"
      >
        Change
      </button>
      <button
        type="button"
        class="{buttonClass} hover:border-red-500 hover:text-red-500"
        onclick={onRemove}
        data-testid="species-remove"
      >
        Remove
      </button>
    </div>
  {/if}
</div>
<SpeciesTraitList traits={current.traits} testId="species-traits" />
