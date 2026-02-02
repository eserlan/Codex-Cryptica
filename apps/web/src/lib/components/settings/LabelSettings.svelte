<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";

  let editingLabel = $state<string | null>(null);
  let renameValue = $state("");

  const startRename = (label: string) => {
    editingLabel = label;
    renameValue = label;
  };

  const handleRename = async () => {
    if (editingLabel && renameValue.trim()) {
      await vault.renameLabel(editingLabel, renameValue.trim());
      editingLabel = null;
    }
  };

  const handleDelete = async (label: string) => {
    if (
      confirm(
        `Are you sure you want to delete the label "${label}" from ALL entities?`,
      )
    ) {
      await vault.deleteLabel(label);
    }
  };
</script>

<div class="space-y-6">
  <div class="p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-lg">
    <h4
      class="text-xs font-bold text-theme-primary uppercase tracking-[0.2em] mb-4"
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
                  class="bg-black border border-theme-primary text-theme-text px-2 py-1 text-xs outline-none flex-1 rounded font-mono"
                  onkeydown={(e) => e.key === "Enter" && handleRename()}
                />
                <button
                  onclick={handleRename}
                  class="px-3 py-1 bg-theme-primary text-theme-bg text-[10px] font-bold rounded uppercase transition-colors"
                >
                  Save
                </button>
                <button
                  onclick={() => (editingLabel = null)}
                  class="px-3 py-1 border border-theme-border text-theme-muted text-[10px] font-bold rounded uppercase hover:text-theme-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            {:else}
              <div class="flex items-center gap-3">
                <span
                  class="icon-[lucide--tag] text-theme-secondary w-3.5 h-3.5"
                ></span>
                <span class="text-xs font-bold text-theme-text truncate"
                  >{label}</span
                >
              </div>
            {/if}
          </div>

          {#if editingLabel !== label}
            <div
              class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <button
                onclick={() => startRename(label)}
                class="p-2 text-theme-muted hover:text-theme-primary transition-colors"
                title="Rename Label"
              >
                <span class="icon-[heroicons--pencil-square] w-4 h-4"></span>
              </button>
              <button
                onclick={() => handleDelete(label)}
                class="p-2 text-red-900/60 hover:text-red-500 transition-colors"
                title="Delete Label Project-wide"
              >
                <span class="icon-[lucide--trash-2] w-4 h-4"></span>
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
