<script lang="ts">
  import { onMount } from "svelte";
  import { fade, scale } from "svelte/transition";
  import { mapSession } from "$lib/stores/map-session.svelte";

  let { close }: { close: () => void } = $props();
  let loading = $state(false);
  let snapshots = $derived(mapSession.snapshots);

  onMount(() => {
    void mapSession.refreshEncounterSnapshots();
  });

  async function saveSnapshot() {
    loading = true;
    try {
      await mapSession.saveEncounterSnapshot();
      await mapSession.refreshEncounterSnapshots();
    } finally {
      loading = false;
    }
  }

  async function startNewEncounter() {
    loading = true;
    try {
      mapSession.startNewEncounter();
      await mapSession.refreshEncounterSnapshots();
    } finally {
      loading = false;
    }
  }

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.currentTarget === event.target) {
      close();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  data-testid="encounter-manager-backdrop"
  class="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
  transition:fade
  role="button"
  tabindex="0"
  aria-label="Close encounter manager"
  onclick={handleBackdropClick}
  onkeydown={(event) => {
    if (
      event.currentTarget === event.target &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      close();
    }
  }}
>
  <div
    class="w-full max-w-xl rounded-xl border border-theme-border bg-theme-surface shadow-2xl overflow-hidden"
    transition:scale
    role="dialog"
    aria-modal="true"
    aria-labelledby="encounter-manager-title"
  >
    <div
      class="p-4 border-b border-theme-border flex items-center justify-between"
    >
      <div>
        <h2
          id="encounter-manager-title"
          class="text-sm font-bold uppercase tracking-widest text-theme-text font-header"
        >
          Encounter Snapshots
        </h2>
        <p class="text-[10px] text-theme-muted mt-1">
          Save the current combat state or restore a previous encounter.
        </p>
      </div>
      <button
        class="text-theme-muted hover:text-theme-text"
        onclick={close}
        aria-label="Close encounter manager"
      >
        <span class="icon-[lucide--x] w-5 h-5"></span>
      </button>
    </div>

    <div class="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
      <label class="space-y-2 block">
        <span
          class="text-[10px] uppercase tracking-widest font-bold text-theme-muted"
        >
          Encounter Name
        </span>
        <input
          class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-primary"
          value={mapSession.name}
          oninput={(event) => {
            mapSession.name = event.currentTarget.value;
          }}
          placeholder="Goblin Ambush"
        />
      </label>

      <div class="grid gap-2 md:grid-cols-2">
        <button
          class="w-full px-4 py-3 rounded-lg bg-theme-primary text-theme-bg text-[10px] font-bold uppercase tracking-widest"
          onclick={saveSnapshot}
          disabled={loading || !mapSession.mapId}
        >
          {#if loading}
            Saving...
          {:else}
            Save Current Encounter
          {/if}
        </button>

        <button
          class="w-full px-4 py-3 rounded-lg border border-theme-border text-theme-muted text-[10px] font-bold uppercase tracking-widest hover:text-theme-text"
          onclick={startNewEncounter}
          disabled={loading || !mapSession.mapId}
        >
          New Encounter
        </button>
      </div>

      <div class="space-y-2">
        {#each snapshots as snapshot (snapshot.id)}
          <div
            class="rounded-lg border border-theme-border bg-theme-bg/50 p-3 flex items-center justify-between gap-3"
          >
            <div>
              <div class="text-sm font-bold text-theme-text">
                {snapshot.name}
              </div>
              <div
                class="text-[10px] uppercase tracking-widest text-theme-muted"
              >
                Round {snapshot.round} · {snapshot.tokenCount} tokens · {snapshot.mode}
              </div>
            </div>
            <button
              class="px-3 py-2 rounded-lg border border-theme-border text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
              onclick={async () => {
                await mapSession.loadEncounterSnapshot(snapshot.id);
                close();
              }}
            >
              Load
            </button>
          </div>
        {:else}
          <div
            class="rounded-lg border border-dashed border-theme-border px-4 py-8 text-center text-xs text-theme-muted italic"
          >
            No saved encounters yet.
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
