<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";

  let {
    activeLabels,
    onToggle,
    onClear,
    filterMode = "OR",
    onToggleMode,
  }: {
    activeLabels: Set<string>;
    onToggle: (label: string) => void;
    onClear: () => void;
    filterMode?: "AND" | "OR";
    onToggleMode?: () => void;
  } = $props();

  let isOpen = $state(false);
  let labelQuery = $state("");

  const filteredLabels = $derived.by(() => {
    const query = labelQuery.trim().toLowerCase();
    if (!query) return vault.labelIndex;
    return vault.labelIndex.filter((l) => l.toLowerCase().includes(query));
  });

  const toggleDropdown = () => {
    isOpen = !isOpen;
    if (isOpen) labelQuery = "";
  };
</script>

<div class="relative">
  <button
    onclick={toggleDropdown}
    class="flex items-center gap-2 px-3 py-1.5 bg-theme-surface/80 backdrop-blur border border-theme-border rounded text-[10px] font-mono tracking-widest text-theme-primary shadow-lg uppercase transition-all hover:border-theme-primary"
    title="Filter by Labels"
  >
    <span class="icon-[lucide--tag] w-3.5 h-3.5"></span>
    <span>Labels ({activeLabels.size})</span>
    <span
      class="icon-[lucide--chevron-down] w-3 h-3 transition-transform {isOpen
        ? 'rotate-180'
        : ''}"
    ></span>
  </button>

  {#if isOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-10" onclick={() => (isOpen = false)}></div>

    <div
      class="absolute top-full left-0 mt-2 w-56 bg-theme-surface border border-theme-border rounded shadow-2xl z-20 max-h-80 flex flex-col"
      transition:fade={{ duration: 100 }}
    >
      {#if vault.labelIndex.length > 5}
        <div class="p-2 border-b border-theme-border/50 bg-theme-bg/30">
          <div class="relative">
            <input
              type="text"
              bind:value={labelQuery}
              placeholder="Search labels..."
              class="w-full bg-theme-bg border border-theme-border rounded px-7 py-1.5 text-[10px] text-theme-text outline-none focus:border-theme-primary transition-all placeholder-theme-muted/50"
            />
            <span
              class="icon-[lucide--search] absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-muted"
            ></span>
            {#if labelQuery}
              <button
                onclick={() => (labelQuery = "")}
                class="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text"
              >
                <span class="icon-[lucide--x] w-3 h-3"></span>
              </button>
            {/if}
          </div>
        </div>
      {/if}

      {#if activeLabels.size > 1 && onToggleMode}
        <div
          class="px-2 py-1.5 border-b border-theme-border/50 bg-theme-primary/5 flex items-center justify-between shrink-0"
        >
          <span
            class="text-[9px] font-bold text-theme-primary uppercase tracking-tighter"
            >Logic Mode</span
          >
          <button
            onclick={onToggleMode}
            class="flex items-center gap-1 bg-theme-surface border border-theme-border rounded px-1.5 py-0.5 text-[9px] font-bold text-theme-text hover:border-theme-primary transition-colors"
          >
            <span
              class={filterMode === "AND"
                ? "text-theme-primary"
                : "text-theme-muted"}>AND</span
            >
            <span class="text-theme-muted/30">/</span>
            <span
              class={filterMode === "OR"
                ? "text-theme-primary"
                : "text-theme-muted"}>OR</span
            >
          </button>
        </div>
      {/if}

      <div class="p-2 space-y-1 overflow-y-auto custom-scrollbar flex-1">
        {#each filteredLabels as label}
          <button
            onclick={() => onToggle(label)}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[10px] font-mono uppercase tracking-wider transition-colors {activeLabels.has(
              label,
            )
              ? 'bg-theme-primary/20 text-theme-primary'
              : 'text-theme-muted hover:bg-theme-primary/10 hover:text-theme-text'}"
          >
            <span
              class="w-3 h-3 flex items-center justify-center border border-theme-border rounded-sm {activeLabels.has(
                label,
              )
                ? 'bg-theme-primary border-theme-primary'
                : ''}"
            >
              {#if activeLabels.has(label)}
                <span class="icon-[heroicons--check] w-2.5 h-2.5 text-theme-bg"
                ></span>
              {/if}
            </span>
            <span class="truncate">{label}</span>
          </button>
        {:else}
          <div
            class="px-2 py-4 text-center text-[10px] text-theme-muted italic"
          >
            {labelQuery ? "No matching labels" : "No labels indexed"}
          </div>
        {/each}
      </div>

      {#if activeLabels.size > 0}
        <div class="p-2 border-t border-theme-border shrink-0">
          <button
            onclick={() => {
              onClear();
            }}
            class="w-full py-1 text-[9px] font-bold text-theme-secondary hover:text-theme-primary uppercase font-header tracking-tighter transition-colors"
          >
            Clear All
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
