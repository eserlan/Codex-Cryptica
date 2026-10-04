<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let editingLabel = $state<string | null>(null);
  let renameValue = $state("");
  let isProcessing = $state(false);

  const startRename = (label: string) => {
    editingLabel = label;
    renameValue = label;
  };

  const hasLabel = (labels: readonly string[] | undefined, key: string) =>
    (labels ?? []).some((l) => l.toLowerCase() === key);

  /** How many entries carry the label, so a confirmation can say what will change. */
  const entriesWith = (label: string) => {
    const key = label.trim().toLowerCase();
    return Object.values(vault.entities).filter((entity) =>
      hasLabel(entity.labels, key),
    ).length;
  };

  const entries = (count: number) =>
    count === 1 ? "1 entry" : `${count} entries`;

  /** Renaming into a label that already exists merges the two, so ask first. */
  const confirmMerge = (from: string, to: string) =>
    notificationStore.confirm({
      title: "Merge Labels",
      message: `A label named "${to}" already exists. Merge "${from}" into it? ${entries(entriesWith(from))} will use "${to}" instead of "${from}".`,
      confirmLabel: "Merge",
    });

  const handleRename = async () => {
    if (isProcessing) return;
    isProcessing = true;
    const from = editingLabel;
    const to = renameValue.trim().toLowerCase();

    try {
      if (!from || !to || vault.isGuest) return;

      // Same name apart from case or spacing: nothing to change.
      if (to === from.toLowerCase()) {
        editingLabel = null;
        return;
      }

      const exists = vault.labelIndex.some((l) => l.toLowerCase() === to);
      if (exists && !(await confirmMerge(from, to))) return;

      editingLabel = null;
      const count = await vault.renameLabel(from, to);
      notificationStore.notify(
        `Renamed "${from}" to "${to}" on ${entries(count)}.`,
        "success",
      );
    } catch (err: any) {
      notificationStore.notify(
        `Could not rename the label: ${err.message}`,
        "error",
      );
    } finally {
      isProcessing = false;
    }
  };

  const handleDelete = async (label: string) => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      if (vault.isGuest) return;
      const confirmed = await notificationStore.confirm({
        title: "Delete Label",
        message: `Remove the label "${label}" from ${entries(entriesWith(label))}? The entries themselves are not deleted.`,
        confirmLabel: "Delete",
        isDangerous: true,
      });
      if (!confirmed) return;

      const count = await vault.deleteLabel(label);
      notificationStore.notify(
        `Removed "${label}" from ${entries(count)}.`,
        "success",
      );
    } catch (err: any) {
      notificationStore.notify(
        `Could not delete the label: ${err.message}`,
        "error",
      );
    } finally {
      isProcessing = false;
    }
  };
</script>

<div class="space-y-6">
  <div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
    <h4
      class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em] mb-4"
    >
      Project Labels
    </h4>

    <div class="space-y-2">
      {#each vault.labelIndex as label}
        <div
          class="flex items-center justify-between p-3 bg-theme-surface border border-theme-border rounded group transition-all hover:border-theme-primary/30"
        >
          <div class="flex-1 min-w-0">
            {#if editingLabel === label}
              <div class="flex gap-2 mr-4">
                <input
                  type="text"
                  bind:value={renameValue}
                  aria-label="New name for the {label} label"
                  class="bg-black border border-theme-primary text-theme-text px-2 py-1 text-xs outline-none flex-1 rounded font-mono"
                  onkeydown={(e) => e.key === "Enter" && handleRename()}
                />
                <button
                  type="button"
                  onclick={handleRename}
                  disabled={isProcessing || !renameValue.trim()}
                  class="px-3 py-1 disabled:opacity-50 bg-theme-primary text-theme-bg text-meta font-bold rounded uppercase font-header transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onclick={() => (editingLabel = null)}
                  class="px-3 py-1 border border-theme-border text-theme-muted text-meta font-bold rounded uppercase font-header hover:text-theme-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            {:else}
              <div class="flex items-center gap-3">
                <span
                  class="icon-[lucide--tag] text-theme-secondary w-3.5 h-3.5"
                  aria-hidden="true"
                ></span>
                <span class="text-xs font-bold text-theme-text truncate"
                  >{label}</span
                >
              </div>
            {/if}
          </div>

          {#if editingLabel !== label}
            <div
              class="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
            >
              <button
                type="button"
                onclick={() => startRename(label)}
                disabled={isProcessing}
                class="p-2 text-theme-muted hover:text-theme-primary transition-colors"
                title="Rename Label"
                aria-label="Rename {label} label"
              >
                <span
                  aria-hidden="true"
                  class="icon-[heroicons--pencil-square] w-4 h-4"
                ></span>
              </button>
              <button
                type="button"
                onclick={() => handleDelete(label)}
                disabled={isProcessing}
                class="p-2 text-red-900/60 hover:text-red-500 transition-colors"
                title="Delete Label Project-wide"
                aria-label="Delete {label} label project-wide"
              >
                <span aria-hidden="true" class="icon-[lucide--trash-2] w-4 h-4"
                ></span>
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <div
          class="text-center py-12 border border-dashed border-theme-border rounded"
        >
          <div
            class="icon-[lucide--tag] w-8 h-8 text-theme-muted/20 mx-auto mb-3"
            aria-hidden="true"
          ></div>
          <p
            class="text-xs text-theme-muted uppercase font-mono tracking-widest"
          >
            No labels indexed yet
          </p>
        </div>
      {/each}
    </div>
  </div>
</div>
