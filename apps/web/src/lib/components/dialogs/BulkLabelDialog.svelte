<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { fade } from "svelte/transition";

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

    // Optimization: Start with the labels of the first entity and intersect with others.
    // This is more efficient than mapping everything to sets first.
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
    return vault.labelIndex
      .filter((l) => l.toLowerCase().includes(query))
      .slice(0, 5);
  });

  let showApplySuggestions = $state(false);

  $effect(() => {
    // Reset when dialog reopens
    if (isOpen) {
      applyInput = "";
      applySelectedIndex = -1;
      showApplySuggestions = false;
      activeTab = "apply";
    }
  });

  const handleApplyKeydown = async (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const label =
        applySelectedIndex >= 0 && applySelectedIndex < applySuggestions.length
          ? applySuggestions[applySelectedIndex]
          : applyInput.trim();
      if (label) await applyLabel(label);
    } else if (
      e.key === "Tab" &&
      showApplySuggestions &&
      applySuggestions.length > 0
    ) {
      e.preventDefault();
      const label =
        applySelectedIndex >= 0 && applySelectedIndex < applySuggestions.length
          ? applySuggestions[applySelectedIndex]
          : applySuggestions[0];
      await applyLabel(label);
    } else if (e.key === "ArrowDown") {
      if (applySuggestions.length > 0) {
        e.preventDefault();
        applySelectedIndex = (applySelectedIndex + 1) % applySuggestions.length;
      }
    } else if (e.key === "ArrowUp") {
      if (applySuggestions.length > 0) {
        e.preventDefault();
        applySelectedIndex =
          applySelectedIndex <= 0
            ? applySuggestions.length - 1
            : applySelectedIndex - 1;
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
  >
    <div
      class="w-full max-w-md bg-theme-surface border border-theme-border rounded-lg shadow-2xl flex flex-col"
    >
      <!-- Header -->
      <div
        class="p-6 border-b border-theme-border flex justify-between items-center"
      >
        <h2 class="text-xl font-bold text-theme-text">
          Label {entityIds.length}
          {themeStore.resolveJargon("entity", entityIds.length)}
        </h2>
        <button
          onclick={onClose}
          class="text-theme-muted hover:text-theme-text"
          aria-label="Close"
        >
          <span class="icon-[lucide--x] w-6 h-6"></span>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-theme-border">
        <button
          class="flex-1 py-2 text-sm font-medium transition-colors {activeTab ===
          'apply'
            ? 'text-theme-primary border-b-2 border-theme-primary'
            : 'text-theme-muted hover:text-theme-text'}"
          onclick={() => (activeTab = "apply")}
        >
          Apply Label
        </button>
        <button
          class="flex-1 py-2 text-sm font-medium transition-colors {activeTab ===
          'remove'
            ? 'text-theme-primary border-b-2 border-theme-primary'
            : 'text-theme-muted hover:text-theme-text'}"
          onclick={() => (activeTab = "remove")}
        >
          Remove Label
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4">
        {#if activeTab === "apply"}
          <p class="text-sm text-theme-muted">
            Type a label name and press <kbd
              class="px-1 py-0.5 bg-theme-bg border border-theme-border rounded text-xs font-mono"
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
              bind:value={applyInput}
              placeholder="Label name…"
              autofocus
              disabled={isLoading}
              onkeydown={handleApplyKeydown}
              onfocus={() => (showApplySuggestions = true)}
              onblur={() =>
                setTimeout(() => (showApplySuggestions = false), 150)}
              class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-primary transition-all placeholder-theme-muted/50"
            />
            {#if showApplySuggestions && applySuggestions.length > 0}
              <div
                role="listbox"
                class="absolute top-full left-0 mt-1 w-full bg-theme-surface border border-theme-border rounded shadow-xl z-30 overflow-hidden"
                transition:fade={{ duration: 100 }}
              >
                {#each applySuggestions as suggestion, i}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === applySelectedIndex}
                    onclick={() => applyLabel(suggestion)}
                    class="w-full px-3 py-2 text-left text-sm transition-colors border-b border-theme-border/50 last:border-0
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
            class="w-full py-2 bg-theme-primary text-black font-bold rounded hover:bg-theme-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
          >
            {isLoading ? "Applying…" : "Apply to all"}
          </button>
        {:else if anyLabels.length === 0}
          <p class="text-sm text-theme-muted text-center py-4">
            No labels found on the selected {themeStore.resolveJargon(
              "entity",
              entityIds.length,
            )}.
          </p>
        {:else}
          <p class="text-sm text-theme-muted">
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
                class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors
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
            <p class="text-xs text-theme-muted">
              <span class="text-theme-primary">Highlighted</span> labels are
              present on all selected {themeStore.resolveJargon(
                "entity",
                entityIds.length,
              )}. Others are present on at least one.
            </p>
          {/if}
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 pb-6 flex justify-end">
        <button
          onclick={onClose}
          class="px-4 py-2 text-theme-muted hover:text-theme-text transition-colors text-sm"
        >
          Done
        </button>
      </div>
    </div>
  </div>
{/if}
