<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";

  let draggedIndex = $state<number | null>(null);

  const entries = $derived(mapSession.initiativeEntries);
  const activeTokenId = $derived(mapSession.activeTokenId);

  function setInitiative(tokenId: string, value: number) {
    mapSession.setInitiativeValue(tokenId, value);
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    mapSession.reorderInitiative(draggedIndex, targetIndex);
    draggedIndex = null;
  }
</script>

<aside
  class="w-full max-w-sm rounded-xl border border-theme-border bg-theme-surface/95 backdrop-blur shadow-xl p-4 space-y-4"
>
  <div class="flex items-center justify-between gap-3">
    <div>
      <h3
        class="text-sm font-bold uppercase tracking-widest text-theme-text font-header"
      >
        Initiative
      </h3>
      <p class="text-[10px] text-theme-muted mt-1">
        Round {mapSession.round}
      </p>
    </div>

    <button
      class="px-3 py-2 rounded-lg bg-theme-primary text-theme-bg text-[10px] font-bold uppercase tracking-widest"
      onclick={() => mapSession.advanceTurn()}
      disabled={entries.length === 0}
    >
      Next Turn
    </button>
  </div>

  <div
    class="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1"
    role="list"
  >
    {#each entries as entry, index (entry.tokenId)}
      {@const token = mapSession.tokens[entry.tokenId]}
      <div
        role="listitem"
        draggable="true"
        ondragstart={() => (draggedIndex = index)}
        ondragover={(e) => e.preventDefault()}
        ondrop={() => handleDrop(index)}
        ondblclick={() => mapSession.pingToken(entry.tokenId)}
        title="Double-click to ping"
        class="rounded-lg border px-3 py-2 transition-colors {activeTokenId ===
        entry.tokenId
          ? 'border-theme-primary bg-theme-primary/10'
          : 'border-theme-border bg-theme-bg/50'}"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex items-center gap-2">
            <button
              class="shrink-0 text-theme-muted hover:text-theme-primary transition-colors active:scale-90"
              onclick={(e) => {
                e.stopPropagation();
                mapSession.pingToken(entry.tokenId);
              }}
              title="Ping token on map"
            >
              <span class="icon-[lucide--radar] w-3.5 h-3.5"></span>
            </button>
            <div class="text-sm font-bold text-theme-text truncate">
              {token.name}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <label
              class="text-[10px] uppercase tracking-widest text-theme-muted"
              for={`initiative-${entry.tokenId}`}
            >
              Init
            </label>
            <input
              id={`initiative-${entry.tokenId}`}
              type="number"
              class="w-20 rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text outline-none focus:border-theme-primary"
              value={entry.initiativeValue}
              ondblclick={(e) => e.stopPropagation()}
              onchange={(e) =>
                setInitiative(
                  entry.tokenId,
                  Number(e.currentTarget.value || 0),
                )}
            />
          </div>
        </div>

        <div
          class="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-theme-muted"
        >
          <span>{entry.hasActed ? "Acted" : "Waiting"}</span>
          <span>#{index + 1}</span>
        </div>
      </div>
    {/each}

    {#if entries.length === 0}
      <div
        class="rounded-lg border border-dashed border-theme-border px-4 py-8 text-center text-xs text-theme-muted italic"
      >
        Add tokens to the initiative list to start combat.
      </div>
    {/if}
  </div>
</aside>
