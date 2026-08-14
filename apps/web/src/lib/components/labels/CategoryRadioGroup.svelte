<script lang="ts">
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import type { Category } from "schema";

  export interface CategoryOption {
    id: string;
    label?: string;
    icon?: string;
    color?: string;
  }

  let {
    value = $bindable(""),
    disabled = false,
    label = "",
    showLabel = true,
    compact = false,
    categoriesList,
    idPrefix = "category-rg",
    ariaLabel,
  }: {
    value?: string;
    disabled?: boolean;
    label?: string;
    showLabel?: boolean;
    compact?: boolean;
    categoriesList?: (Category | CategoryOption)[];
    idPrefix?: string;
    ariaLabel?: string;
  } = $props();

  const availableCategories = $derived(categoriesList ?? categories.list);

  let groupEl = $state<HTMLDivElement | null>(null);

  const selectedIndex = $derived(
    availableCategories.findIndex(
      (c) => c.id.toLowerCase() === (value || "").toLowerCase(),
    ),
  );

  function isOptionTabFocusable(index: number): boolean {
    if (disabled) return false;
    if (selectedIndex === -1) {
      return index === 0;
    }
    return selectedIndex === index;
  }

  function selectOption(catId: string, focusIndex?: number) {
    if (disabled) return;
    value = catId;
    if (focusIndex !== undefined && groupEl) {
      const buttons = groupEl.querySelectorAll<HTMLButtonElement>(
        'button[role="radio"]',
      );
      buttons[focusIndex]?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent, currentIndex: number) {
    if (disabled || availableCategories.length === 0) return;

    let targetIndex: number;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        targetIndex = (currentIndex + 1) % availableCategories.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        targetIndex =
          (currentIndex - 1 + availableCategories.length) %
          availableCategories.length;
        break;
      case "Home":
        event.preventDefault();
        targetIndex = 0;
        break;
      case "End":
        event.preventDefault();
        targetIndex = availableCategories.length - 1;
        break;
      case " ":
      case "Enter":
        event.preventDefault();
        selectOption(availableCategories[currentIndex].id, currentIndex);
        return;
      default:
        return;
    }

    if (targetIndex >= 0 && targetIndex < availableCategories.length) {
      selectOption(availableCategories[targetIndex].id, targetIndex);
    }
  }
</script>

<div class="category-radio-group-wrapper">
  {#if label && showLabel}
    <span
      id="{idPrefix}-label"
      class="block text-[10px] text-theme-secondary font-bold mb-1 tracking-wider uppercase font-header select-none"
    >
      {label}
    </span>
  {/if}

  <div
    bind:this={groupEl}
    role="radiogroup"
    aria-labelledby={label && showLabel ? `${idPrefix}-label` : undefined}
    aria-label={!label || !showLabel
      ? ariaLabel || label || "Entity Category"
      : undefined}
    aria-disabled={disabled ? "true" : undefined}
    class="flex flex-wrap items-center gap-1.5"
    data-testid="category-radio-group"
  >
    {#each availableCategories as cat, index (cat.id)}
      {@const isSelected = (value || "").toLowerCase() === cat.id.toLowerCase()}
      {@const iconCls = getIconClass(cat.icon)}

      <button
        type="button"
        role="radio"
        id="{idPrefix}-{cat.id}"
        aria-checked={isSelected}
        aria-label={cat.label || cat.id}
        tabindex={isOptionTabFocusable(index) ? 0 : -1}
        {disabled}
        onclick={() => selectOption(cat.id, index)}
        onkeydown={(e) => handleKeyDown(e, index)}
        data-testid="category-radio-{cat.id}"
        class={[
          "inline-flex items-center transition-all duration-150 rounded border cursor-pointer select-none font-header tracking-wide uppercase",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/60 focus-visible:border-theme-primary",
          compact
            ? "px-2 py-1 text-[10px] md:text-xs gap-1.5"
            : "px-2.5 py-1.5 text-xs gap-2",
          isSelected
            ? "border-theme-primary bg-theme-primary/15 text-theme-primary font-bold shadow-sm"
            : "border-theme-border bg-theme-bg/60 text-theme-muted hover:text-theme-text hover:bg-theme-surface hover:border-theme-border/80",
          disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
        ]}
      >
        <!-- Category Icon -->
        <span
          class="{iconCls} shrink-0 {compact
            ? 'w-3 h-3 md:w-3.5 md:h-3.5'
            : 'w-3.5 h-3.5'}"
          style={isSelected
            ? undefined
            : cat.color
              ? `color: ${cat.color}`
              : undefined}
          aria-hidden="true"
        ></span>

        <!-- Category Label -->
        <span>{cat.label || cat.id}</span>

        <!-- Active Radio Indicator Dot -->
        {#if isSelected}
          <span
            class="w-1.5 h-1.5 rounded-full bg-theme-primary shrink-0 animate-pulse"
            aria-hidden="true"
          ></span>
        {/if}
      </button>
    {/each}
  </div>
</div>
