<script lang="ts">
  import { fade } from "svelte/transition";
  import type { Core } from "cytoscape";
  import { graph } from "$lib/stores/graph.svelte";

  let { cy } = $props<{ cy: Core | undefined }>();

  let isOpen = $state(false);
  let newPresetName = $state("");
  let editingId = $state<string | null>(null);
  let editingName = $state("");
  let isSaving = $state(false);
  let isRenaming = $state(false);

  const close = () => {
    isOpen = false;
    editingId = null;
  };

  const saveCurrent = async () => {
    if (!newPresetName.trim() || isSaving) return;
    isSaving = true;
    try {
      const viewport = cy
        ? { pan: { ...cy.pan() }, zoom: cy.zoom() }
        : undefined;
      await graph.saveViewPreset(newPresetName, viewport);
      newPresetName = "";
    } finally {
      isSaving = false;
    }
  };

  const applyPreset = (id: string) => {
    const result = graph.applyViewPreset(id);
    if (!result) return;
    const { preset, modeChanged } = result;
    const vp = preset.state.viewport;
    // Mode layouts (timeline/orbit) run their own fit — only restore the
    // stored camera when no mode layout will fight it.
    if (
      cy &&
      vp &&
      !modeChanged &&
      !preset.state.timelineMode &&
      !preset.state.orbitMode
    ) {
      cy.animate({
        pan: { ...vp.pan },
        zoom: vp.zoom,
        duration: 500,
        easing: "ease-out-cubic",
      });
    }
    close();
  };

  const startRename = (id: string, name: string) => {
    editingId = id;
    editingName = name;
  };

  const commitRename = async () => {
    if (isRenaming) return;
    if (editingId && editingName.trim()) {
      isRenaming = true;
      try {
        await graph.renameViewPreset(editingId, editingName);
      } finally {
        isRenaming = false;
      }
    }
    editingId = null;
  };
</script>

<div class="relative">
  <button
    type="button"
    class="w-8 h-8 flex-shrink-0 flex items-center justify-center border transition {isOpen
      ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
      : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
    onclick={() => (isOpen = !isOpen)}
    title="Saved Views"
    aria-label="Saved Views"
    aria-pressed={isOpen}
    data-testid="view-presets-toggle"
    ><span class="icon-[lucide--bookmark] w-4 h-4"></span></button
  >

  {#if isOpen}
    <div
      class="absolute bottom-full mb-2 left-0 w-64 rounded-lg border border-theme-border bg-theme-surface/95 p-2 text-xs text-theme-text shadow-xl backdrop-blur z-30"
      data-testid="view-presets-panel"
      transition:fade={{ duration: 100 }}
    >
      <div
        class="flex items-center gap-2 text-theme-primary uppercase tracking-[0.2em] font-mono text-[11px] mb-2"
      >
        <span class="icon-[lucide--bookmark] w-3 h-3"></span>
        Saved Views
      </div>

      {#if graph.viewPresets.length === 0}
        <p class="text-theme-muted px-1 pb-2">
          Save the current filters, modes, and camera as a reusable view.
        </p>
      {:else}
        <div class="space-y-1 max-h-48 overflow-y-auto pr-1 mb-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="flex-1 min-w-0 text-left truncate px-2 py-1 rounded hover:bg-theme-muted/15 hover:text-theme-muted transition text-theme-muted/70 italic"
              onclick={() => {
                graph.resetView();
                close();
              }}
              title="Clear all filters and modes"
            >
              Reset to default
            </button>
          </div>
          {#each graph.viewPresets as preset (preset.id)}
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
                  ><span class="icon-[lucide--check] w-3.5 h-3.5"
                  ></span></button
                >
              {:else}
                <button
                  type="button"
                  class="flex-1 min-w-0 text-left truncate px-2 py-1 rounded hover:bg-theme-primary/15 hover:text-theme-primary transition"
                  onclick={() => applyPreset(preset.id)}
                  title={`Apply "${preset.name}"`}
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  class="w-6 h-6 flex items-center justify-center text-theme-muted hover:text-theme-primary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none rounded transition"
                  onclick={() => startRename(preset.id, preset.name)}
                  title="Rename"
                  aria-label={`Rename "${preset.name}"`}
                  ><span class="icon-[lucide--pencil] w-3 h-3"></span></button
                >
                <button
                  type="button"
                  class="w-6 h-6 flex items-center justify-center text-theme-muted hover:text-red-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none rounded transition"
                  onclick={() => void graph.deleteViewPreset(preset.id)}
                  title="Delete"
                  aria-label={`Delete "${preset.name}"`}
                  ><span class="icon-[lucide--trash-2] w-3 h-3"></span></button
                >
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="flex items-center gap-1 border-t border-theme-border/40 pt-2">
        <input
          class="flex-1 min-w-0 bg-theme-bg/60 border border-theme-border rounded px-2 py-1 text-theme-text placeholder:text-theme-muted focus:border-theme-primary focus:outline-none"
          placeholder="Name this view..."
          bind:value={newPresetName}
          onkeydown={(e) => {
            if (e.key === "Enter") void saveCurrent();
          }}
          aria-label="New preset name"
          data-testid="view-preset-name-input"
        />
        <button
          type="button"
          class="h-7 px-2 flex items-center justify-center border border-theme-primary/50 text-theme-primary hover:bg-theme-primary/20 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
          onclick={() => void saveCurrent()}
          disabled={!newPresetName.trim() || isSaving}
          title="Save current view"
          aria-label="Save current view"
          data-testid="view-preset-save"
          ><span class="icon-[lucide--plus] w-3.5 h-3.5"></span></button
        >
      </div>
    </div>
  {/if}
</div>
