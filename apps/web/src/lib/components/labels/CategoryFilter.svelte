<script lang="ts">
  import { categories } from "$lib/stores/categories.svelte";
  import { fade } from "svelte/transition";
  import type { Category } from "schema";

  let {
    activeCategories,
    onToggle,
    onClear,
  }: {
    activeCategories: Set<string>;
    onToggle: (categoryId: string) => void;
    onClear: () => void;
  } = $props();

  let isOpen = $state(false);

  const toggleDropdown = () => (isOpen = !isOpen);

  function iconClass(cat: Category): string {
    const iconName = cat.icon.replace("lucide:", "lucide--");
    return `icon-[${iconName}] w-3 h-3`;
  }
</script>

<div class="relative">
  <button
    onclick={toggleDropdown}
    class="flex items-center gap-2 px-3 py-1.5 bg-theme-surface/80 backdrop-blur border border-theme-border rounded text-[10px] font-mono tracking-widest text-theme-primary shadow-lg uppercase transition-all hover:border-theme-primary"
    title="Filter by Category"
  >
    <span class="icon-[lucide--filter] w-3.5 h-3.5"></span>
    <span>Types ({activeCategories.size})</span>
    <span
      class="icon-[lucide--chevron-down] w-3 h-3 transition-transform {isOpen
        ? 'rotate-180'
        : ''}"
    ></span>
  </button>

  {#if isOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-40" onclick={() => (isOpen = false)}></div>

    <div
      class="absolute top-full left-0 mt-2 w-52 bg-theme-surface border border-theme-border rounded shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar"
      transition:fade={{ duration: 100 }}
    >
      <div class="p-2 space-y-1">
        {#each categories.list as cat (cat.id)}
          <button
            onclick={() => onToggle(cat.id)}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[10px] font-mono uppercase tracking-wider transition-colors {activeCategories.has(
              cat.id,
            )
              ? 'bg-theme-primary/20 text-theme-primary'
              : 'text-theme-muted hover:bg-theme-primary/10 hover:text-theme-text'}"
          >
            <span
              class="w-3 h-3 flex items-center justify-center border border-theme-border rounded-sm {activeCategories.has(
                cat.id,
              )
                ? 'bg-theme-primary border-theme-primary'
                : ''}"
            >
              {#if activeCategories.has(cat.id)}
                <span class="icon-[heroicons--check] w-2.5 h-2.5 text-theme-bg"
                ></span>
              {/if}
            </span>
            <span class={iconClass(cat)} style="color: {cat.color}"></span>
            <span class="truncate">{cat.label}</span>
          </button>
        {/each}
      </div>

      {#if activeCategories.size > 0}
        <div class="p-2 border-t border-theme-border">
          <button
            onclick={onClear}
            class="w-full py-1 text-[9px] font-bold text-theme-secondary hover:text-theme-primary uppercase font-header tracking-tighter transition-colors"
          >
            Clear All
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
