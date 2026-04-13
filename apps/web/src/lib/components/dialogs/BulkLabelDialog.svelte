<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { fade, fly } from "svelte/transition";

  let {
    isOpen = false,
    entityIds = [],
    onClose = () => {},
  } = $props<{
    isOpen: boolean;
    entityIds: string[];
    onClose?: () => void;
  }>();

  type Tab = "apply" | "remove";
  let activeTab = $state<Tab>("apply");

  let applyInput = $state("");
  let applySelectedIndex = $state(-1);
  let isLoading = $state(false);

  // Labels already shared by ALL selected entities (for remove tab)
  let sharedLabels = $derived.by(() => {
    if (entityIds.length === 0) return [];

    const firstId = entityIds[0];
    const firstEntityLabels = vault.entities[firstId]?.labels ?? [];
    if (firstEntityLabels.length === 0) return [];

    let shared = new Set(firstEntityLabels.map((l) => l.toLowerCase()));

    for (let i = 1; i < entityIds.length; i++) {
      const entityLabels = new Set(
        (vault.entities[entityIds[i]]?.labels ?? []).map((l) =>
          l.toLowerCase(),
        ),
      );
      // Intersect
      for (const label of shared) {
        if (!entityLabels.has(label)) {
          shared.delete(label);
        }
      }
      if (shared.size === 0) break;
    }

    return Array.from(shared).sort((a, b) => a.localeCompare(b));
  });

  // Labels present in at least one selected entity (for remove tab when no shared ones)
  let anyLabels = $derived.by(() => {
    if (entityIds.length === 0) return [];
    const seen = new Set<string>();
    for (const id of entityIds) {
      for (const l of vault.entities[id]?.labels ?? []) {
        seen.add(l.toLowerCase());
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  });

  let applySuggestions = $derived.by(() => {
    const query = applyInput.trim().toLowerCase();
    if (!query) return [];

    // ⚡ Bolt Optimization: Replace full array .filter().slice() with an early-exit imperative loop.
    const maxResults = 5;
    const matches: string[] = [];
    const labels = vault.labelIndex;

    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      if (l.toLowerCase().includes(query)) {
        matches.push(l);
        if (matches.length === maxResults) break;
      }
    }
    return matches;
  });

  let allSuggestions = $derived.by(() => {
    const query = applyInput.trim().toLowerCase();
    if (query) return applySuggestions;
    return graph.recentLabels;
  });

  let showApplySuggestions = $state(false);
  let inputElement = $state<HTMLInputElement | null>(null);

  const selectSuggestion = (index: number) => {
    applySelectedIndex = index;
    if (index >= 0 && index < allSuggestions.length) {
      applyInput = allSuggestions[index];
    }
  };

  $effect(() => {
    if (isOpen) {
      applyInput = "";
      applySelectedIndex = -1;
      showApplySuggestions = false;
      activeTab = "apply";

      // Programmatic focus for accessibility & UX
      setTimeout(() => {
        inputElement?.focus();
      }, 50);
    }
  });

  const handleApplyKeydown = async (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const label = applyInput.trim();
      if (label) await applyLabel(label);
    } else if (
      e.key === "Tab" &&
      showApplySuggestions &&
      allSuggestions.length > 0
    ) {
      e.preventDefault();
      const label =
        applySelectedIndex >= 0 && applySelectedIndex < allSuggestions.length
          ? allSuggestions[applySelectedIndex]
          : allSuggestions[0];
      applyInput = label;
      showApplySuggestions = false;
      applySelectedIndex = -1;
    } else if (e.key === "ArrowDown") {
      if (allSuggestions.length > 0) {
        e.preventDefault();
        const next = (applySelectedIndex + 1) % allSuggestions.length;
        selectSuggestion(next);
      }
    } else if (e.key === "ArrowUp") {
      if (allSuggestions.length > 0) {
        e.preventDefault();
        const prev =
          applySelectedIndex <= 0
            ? allSuggestions.length - 1
            : applySelectedIndex - 1;
        selectSuggestion(prev);
      }
    } else if (e.key === "Escape") {
      showApplySuggestions = false;
      applySelectedIndex = -1;
    }
  };

  const applyLabel = async (label: string) => {
    if (!label.trim()) return;
    isLoading = true;
    try {
      const finalLabel = label.trim().toLowerCase();
      const count = await vault.bulkAddLabel(entityIds, finalLabel);
      await graph.addRecentLabel(finalLabel);
      applyInput = "";
      applySelectedIndex = -1;
      showApplySuggestions = false;
      ui.notify(
        `Label "${finalLabel}" applied to ${count} ${themeStore.resolveJargon("entity", count)}.`,
        "success",
      );
    } finally {
      isLoading = false;
    }
  };

  const removeLabel = async (label: string) => {
    isLoading = true;
    try {
      const count = await vault.bulkRemoveLabel(entityIds, label);
      ui.notify(
        `Label "${label}" removed from ${count} ${themeStore.resolveJargon("entity", count)}.`,
        "success",
      );
    } finally {
      isLoading = false;
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Bulk label {entityIds.length} {themeStore.resolveJargon(
      'entity',
      entityIds.length,
    )}"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    onkeydown={handleKeydown}
    transition:fade={{ duration: 200 }}
    tabindex="0"
  >
    <div
      class="w-full max-w-md bg-theme-surface border border-theme-border rounded-lg shadow-2xl flex flex-col overflow-hidden
        {ui.isMobile ? 'max-h-[90vh]' : 'max-h-[80vh]'}"
      transition:fly={{ y: 20, duration: 300 }}
    >
      <!-- Header -->
      <div
        class="p-4 md:p-6 border-b border-theme-border flex justify-between items-center"
      >
        <h2 class="text-lg md:text-xl font-bold text-theme-text">
          Label {entityIds.length}
          {themeStore.resolveJargon("entity", entityIds.length)}
        </h2>
        <button
          onclick={onClose}
          class="text-theme-muted hover:text-theme-text p-1"
          aria-label="Close"
        >
          <span class="icon-[lucide--x] w-5 h-5 md:w-6 md:h-6"></span>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-theme-border">
        <button
          class="flex-1 py-3 md:py-2 text-xs md:text-sm font-medium transition-colors {activeTab ===
          'apply'
            ? 'text-theme-primary border-b-2 border-theme-primary'
            : 'text-theme-muted hover:text-theme-text'}"
          onclick={() => (activeTab = "apply")}
        >
          Apply Label
        </button>
        <button
          class="flex-1 py-3 md:py-2 text-xs md:text-sm font-medium transition-colors {activeTab ===
          'remove'
            ? 'text-theme-primary border-b-2 border-theme-primary'
            : 'text-theme-muted hover:text-theme-text'}"
          onclick={() => (activeTab = "remove")}
        >
          Remove Label
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 md:p-6 space-y-4 overflow-y-auto">
        {#if activeTab === "apply"}
          <p class="text-xs md:text-sm text-theme-muted">
            Type a label name and press <kbd
              class="px-1 py-0.5 bg-theme-bg border border-theme-border rounded text-[10px] font-mono"
              >Enter</kbd
            >
            to apply it to all selected {themeStore.resolveJargon(
              "entity",
              entityIds.length,
            )}.
          </p>
          <div class="relative">
            <input
              type="text"
              bind:this={inputElement}
              bind:value={applyInput}
              placeholder="Label name…"
              disabled={isLoading}
              onkeydown={handleApplyKeydown}
              onfocus={() => (showApplySuggestions = true)}
              onblur={() =>
                setTimeout(() => (showApplySuggestions = false), 150)}
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-3 md:py-2 text-sm text-theme-text outline-none focus:border-theme-primary transition-all placeholder-theme-muted/50"
            />
            {#if showApplySuggestions && allSuggestions.length > 0}
              <div
                role="listbox"
                class="absolute top-full left-0 mt-1 w-full bg-theme-surface border border-theme-border rounded shadow-xl z-30 overflow-hidden"
                transition:fade={{ duration: 100 }}
              >
                {#if !applyInput.trim()}
                  <div
                    class="px-3 py-2 md:py-1.5 text-[9px] md:text-[10px] font-bold text-theme-primary uppercase tracking-widest border-b border-theme-border/50 bg-theme-primary/5"
                  >
                    Recent Labels
                  </div>
                {/if}
                {#each allSuggestions as suggestion, i}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === applySelectedIndex}
                    onclick={() => {
                      applyInput = suggestion;
                      showApplySuggestions = false;
                      applySelectedIndex = -1;
                    }}
                    class="w-full px-3 py-3 md:py-2 text-left text-sm transition-colors border-b border-theme-border/50 last:border-0
                      {i === applySelectedIndex
                      ? 'bg-theme-primary/20 text-theme-primary'
                      : 'text-theme-muted hover:bg-theme-primary/10 hover:text-theme-primary'}"
                  >
                    {suggestion}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          <button
            onclick={() => applyLabel(applyInput)}
            disabled={!applyInput.trim() || isLoading}
            class="w-full py-3 md:py-2 bg-theme-primary text-black font-bold rounded hover:bg-theme-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-lg flex items-center justify-center gap-2"
            aria-busy={isLoading}
          >
            {#if isLoading}
              <span class="icon-[lucide--loader-2] w-4 h-4 animate-spin" aria-hidden="true"></span>
              Applying…
            {:else}
              Apply to all
            {/if}
          </button>
        {:else if anyLabels.length === 0}
          <div class="text-center py-8">
            <p class="text-sm text-theme-muted italic">
              No labels found on the selected {themeStore.resolveJargon(
                "entity",
                entityIds.length,
              )}.
            </p>
          </div>
        {:else}
          <div class="space-y-4">
            <p class="text-xs md:text-sm text-theme-muted">
              Click a label to remove it from all selected {themeStore.resolveJargon(
                "entity",
                entityIds.length,
              )} that have it.
            </p>
            <div class="flex flex-wrap gap-2">
              {#each anyLabels as label}
                {@const isShared = sharedLabels.includes(label)}
                <button
                  onclick={() => removeLabel(label)}
                  disabled={isLoading}
                  title={isShared
                    ? `Remove "${label}" from all selected`
                    : `Remove "${label}" from entities that have it`}
                  class="inline-flex items-center gap-1 px-3 py-2 md:px-2 md:py-1 rounded text-xs font-mono border transition-colors
                      {isShared
                    ? 'bg-theme-primary/10 border-theme-primary/40 text-theme-primary hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400'
                    : 'bg-theme-bg border-theme-border text-theme-muted hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400'}"
                >
                  {label}
                  <span class="icon-[lucide--x] w-3 h-3"></span>
                </button>
              {/each}
            </div>
            {#if sharedLabels.length < anyLabels.length}
              <p class="text-[10px] md:text-xs text-theme-muted leading-tight">
                <span class="text-theme-primary font-bold">Highlighted</span>
                labels are present on all selected {themeStore.resolveJargon(
                  "entity",
                  entityIds.length,
                )}. Others are present on at least one.
              </p>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="p-4 md:p-6 border-t border-theme-border flex justify-end">
        <button
          onclick={onClose}
          class="px-6 py-2 bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-primary transition-colors text-sm font-medium rounded"
        >
          Done
        </button>
      </div>
    </div>
  </div>
{/if}
