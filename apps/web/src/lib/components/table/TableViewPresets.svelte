<script lang="ts">
  import {
    viewPresetsStore,
    type ViewPresetsStore,
  } from "$lib/stores/view-presets.svelte";
  import type { ViewPreset, ViewPresetState } from "$lib/stores/view-presets";
  import type { TableColumnFilters } from "$lib/components/explorer/entityListFiltering";
  import type { SortState } from "$lib/components/table/entityTableSort";

  let {
    activeVaultId,
    currentFilterState,
    onApplyPreset,
    onResetFilters,
    presetsStore = viewPresetsStore,
  }: {
    activeVaultId: string | null | undefined;
    currentFilterState: {
      searchQuery: string;
      typeFilters: Set<string>;
      labelFilters: Set<string>;
      showIncompleteOnly: boolean;
      columnFilters: TableColumnFilters;
      sort?: SortState;
    };
    onApplyPreset: (preset: ViewPreset) => void;
    onResetFilters: () => void;
    presetsStore?: ViewPresetsStore;
  } = $props();

  let isOpen = $state(false);
  let newPresetName = $state("");
  let editingId = $state<string | null>(null);
  let editingName = $state("");
  let isSaving = $state(false);
  let isRenaming = $state(false);
  let panelEl = $state<HTMLDivElement>();

  $effect(() => {
    void presetsStore.loadPresets(activeVaultId);
  });

  const close = () => {
    isOpen = false;
    editingId = null;
  };

  $effect(() => {
    if (!isOpen) return;
    panelEl?.focus();

    const handleOutsideClick = (e: MouseEvent) => {
      if (panelEl && !panelEl.contains(e.target as Node)) {
        close();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    }, 10);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  const saveCurrent = async () => {
    const trimmed = newPresetName.trim();
    if (!trimmed || isSaving || !activeVaultId) return;
    isSaving = true;
    try {
      const state: ViewPresetState = {
        activeCategories: Array.from(currentFilterState.typeFilters),
        activeLabels: Array.from(currentFilterState.labelFilters),
        labelFilterMode: "OR",
        searchQuery: currentFilterState.searchQuery || undefined,
        showIncompleteOnly: currentFilterState.showIncompleteOnly,
        columnFilters: currentFilterState.columnFilters
          ? { ...currentFilterState.columnFilters }
          : undefined,
        tableSort: currentFilterState.sort
          ? { ...currentFilterState.sort }
          : undefined,
      };
      await presetsStore.savePreset(activeVaultId, trimmed, state);
      newPresetName = "";
    } finally {
      isSaving = false;
    }
  };

  const applyPreset = (preset: ViewPreset) => {
    presetsStore.activePresetId = preset.id;
    onApplyPreset(preset);
    close();
  };

  const startRename = (id: string, name: string) => {
    editingId = id;
    editingName = name;
  };

  const commitRename = async () => {
    if (isRenaming || !activeVaultId) return;
    if (editingId && editingName.trim()) {
      isRenaming = true;
      try {
        await presetsStore.renamePreset(activeVaultId, editingId, editingName);
      } finally {
        isRenaming = false;
      }
    }
    editingId = null;
  };

  const activePreset = $derived(
    presetsStore.presets.find((p) => p.id === presetsStore.activePresetId),
  );
</script>

<div class="relative inline-block">
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {isOpen
      ? 'border-theme-primary bg-theme-primary/15 text-theme-primary'
      : activePreset
        ? 'border-theme-primary/60 bg-theme-surface text-theme-primary hover:border-theme-primary'
        : 'border-theme-border bg-theme-surface text-theme-muted hover:border-theme-primary/50 hover:text-theme-text'}"
    onclick={() => (isOpen = !isOpen)}
    title="Saved Views"
    aria-label="Saved Views"
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    data-testid="table-view-presets-toggle"
  >
    <span aria-hidden="true" class="icon-[lucide--bookmark] h-3.5 w-3.5"></span>
    <span>{activePreset ? activePreset.name : "Saved views"}</span>
    <span
      aria-hidden="true"
      class="icon-[lucide--chevron-down] h-3 w-3 transition-transform {isOpen
        ? 'rotate-180'
        : ''}"
    ></span>
  </button>

  {#if isOpen}
    <div
      bind:this={panelEl}
      tabindex="-1"
      class="absolute top-full mt-1 left-0 w-72 max-w-[calc(100vw-2.5rem)] rounded-lg border border-theme-border bg-theme-surface/95 p-3 text-xs text-theme-text shadow-xl backdrop-blur z-40 focus:outline-none"
      data-testid="table-view-presets-panel"
    >
      <div
        class="flex items-center gap-2 text-theme-primary uppercase tracking-[0.2em] font-mono text-[11px] mb-2"
      >
        <span aria-hidden="true" class="icon-[lucide--bookmark] w-3.5 h-3.5"
        ></span>
        Saved Views
      </div>

      {#if presetsStore.presets.length === 0}
        <p class="text-theme-muted px-1 pb-2">
          Save the current filters and sort order as a reusable view.
        </p>
      {:else}
        <div class="space-y-1 max-h-56 overflow-y-auto pr-1 mb-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="flex-1 min-w-0 text-left truncate px-2 py-1.5 rounded hover:bg-theme-muted/15 hover:text-theme-muted transition text-theme-muted/70 italic"
              onclick={() => {
                presetsStore.activePresetId = null;
                onResetFilters();
                close();
              }}
              title="Clear all filters"
            >
              Reset to default
            </button>
          </div>
          {#each presetsStore.presets as preset (preset.id)}
            <div class="flex items-center gap-1 group">
              {#if editingId === preset.id}
                <input
                  class="flex-1 min-w-0 bg-theme-bg/60 border border-theme-primary/50 rounded px-2 py-1 text-theme-text focus:outline-none"
                  bind:value={editingName}
                  onkeydown={(e) => {
                    if (e.key === "Enter") void commitRename();
                    if (e.key === "Escape") editingId = null;
                  }}
                  aria-label="Preset name"
                />
                <button
                  type="button"
                  class="w-6 h-6 flex items-center justify-center text-theme-primary hover:bg-theme-primary/20 rounded"
                  onclick={() => void commitRename()}
                  title="Save name"
                  aria-label="Save name"
                >
                  <span
                    aria-hidden="true"
                    class="icon-[lucide--check] w-3.5 h-3.5"
                  ></span>
                </button>
              {:else}
                <button
                  type="button"
                  class="flex-1 min-w-0 text-left truncate px-2 py-1.5 rounded transition {presetsStore.activePresetId ===
                  preset.id
                    ? 'bg-theme-primary/20 text-theme-primary font-semibold'
                    : 'hover:bg-theme-primary/15 hover:text-theme-primary text-theme-text'}"
                  onclick={() => applyPreset(preset)}
                  title={`Apply "${preset.name}"`}
                  data-testid="table-preset-item"
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  class="w-6 h-6 flex items-center justify-center text-theme-muted hover:text-theme-primary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none rounded transition"
                  onclick={() => startRename(preset.id, preset.name)}
                  title="Rename"
                  aria-label={`Rename "${preset.name}"`}
                >
                  <span aria-hidden="true" class="icon-[lucide--pencil] w-3 h-3"
                  ></span>
                </button>
                <button
                  type="button"
                  class="w-6 h-6 flex items-center justify-center text-theme-muted hover:text-red-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none rounded transition"
                  onclick={() => {
                    if (activeVaultId) {
                      void presetsStore.deletePreset(activeVaultId, preset.id);
                    }
                  }}
                  title="Delete"
                  aria-label={`Delete "${preset.name}"`}
                >
                  <span
                    aria-hidden="true"
                    class="icon-[lucide--trash-2] w-3 h-3"
                  ></span>
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div
        class="flex items-center gap-1.5 border-t border-theme-border/40 pt-2.5"
      >
        <input
          class="flex-1 min-w-0 bg-theme-bg/60 border border-theme-border rounded px-2.5 py-1.5 text-theme-text placeholder:text-theme-muted/60 focus:border-theme-primary focus:outline-none"
          placeholder="Name this view..."
          bind:value={newPresetName}
          onkeydown={(e) => {
            if (e.key === "Enter") void saveCurrent();
          }}
          aria-label="New preset name"
          data-testid="table-preset-name-input"
        />
        <button
          type="button"
          class="h-8 px-2.5 flex items-center justify-center border border-theme-primary/50 text-theme-primary hover:bg-theme-primary/20 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
          onclick={() => void saveCurrent()}
          disabled={!newPresetName.trim() || isSaving || !activeVaultId}
          title="Save current view"
          aria-label="Save current view"
          data-testid="table-preset-save"
        >
          <span aria-hidden="true" class="icon-[lucide--plus] w-3.5 h-3.5"
          ></span>
        </button>
      </div>
    </div>
  {/if}
</div>
