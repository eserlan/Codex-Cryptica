<script lang="ts">
  import { soloSessionStore } from "$lib/stores/solo-session-instance";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { sessionJournalStore } from "$lib/stores/session-journal.svelte";
  import { quickNoteStore } from "$lib/stores/quicknote.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import SoloEndDialog from "./SoloEndDialog.svelte";

  let chooseOpen = $state(false);
  let endOpen = $state(false);

  const mapId = $derived(soloSessionStore.session?.mapId ?? null);
  const hasMap = $derived(!!mapId && !!vault.maps?.[mapId]);
  const mapChoices = $derived(
    Object.values(vault.maps ?? {}).map((m) => ({ id: m.id, name: m.name })),
  );

  function openJournal() {
    if (sessionJournalStore.controlState === "resume") {
      sessionJournalStore.open();
    }
    quickNoteStore.openJournal();
  }

  function onMapClick() {
    if (hasMap) {
      void soloSessionStore.resume();
    } else {
      chooseOpen = !chooseOpen;
    }
  }

  function pickMap(event: Event) {
    const id = (event.currentTarget as HTMLSelectElement).value;
    chooseOpen = false;
    void soloSessionStore.chooseMap(id);
  }
</script>

<div class="flex flex-wrap items-center gap-1.5">
  <button
    type="button"
    class="rounded-md px-2 py-1 text-sm text-theme-text hover:text-theme-primary"
    data-testid="solo-more-dice"
    aria-label="Open the full dice window: tables, decks and history"
    onclick={() => (modalUIStore.showDiceModal = true)}
  >
    <span class="icon-[lucide--dices] inline-block h-4 w-4" aria-hidden="true"
    ></span>
    More dice
  </button>

  {#if !discoveryPolicyStore.aiDisabled}
    <button
      type="button"
      class="rounded-md px-2 py-1 text-sm text-theme-text hover:text-theme-primary"
      data-testid="solo-ask-oracle"
      onclick={() => (layoutUIStore.activeSidebarTool = "oracle")}
    >
      <span
        class="icon-[lucide--sparkles] inline-block h-4 w-4"
        aria-hidden="true"
      ></span>
      Ask Oracle
    </button>
  {/if}

  <button
    type="button"
    class="rounded-md px-2 py-1 text-sm text-theme-text hover:text-theme-primary"
    data-testid="solo-journal"
    onclick={openJournal}
  >
    <span
      class="icon-[lucide--book-open] inline-block h-4 w-4"
      aria-hidden="true"
    ></span>
    Journal
  </button>

  <button
    type="button"
    class="rounded-md px-2 py-1 text-sm text-theme-text hover:text-theme-primary"
    data-testid="solo-map"
    onclick={onMapClick}
  >
    <span class="icon-[lucide--compass] inline-block h-4 w-4" aria-hidden="true"
    ></span>
    {hasMap ? "Map" : "Choose map"}
  </button>
  {#if chooseOpen}
    <select
      class="rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text"
      aria-label="Choose the map to play on"
      data-testid="solo-choose-map-select"
      onchange={pickMap}
    >
      <option value="" selected>Pick a map</option>
      {#each mapChoices as map (map.id)}
        <option value={map.id}>{map.name}</option>
      {/each}
    </select>
  {/if}

  <button
    type="button"
    class="rounded-md px-2 py-1 text-sm text-theme-text hover:text-theme-primary"
    data-testid="solo-add-note"
    onclick={() => quickNoteStore.open()}
  >
    <span
      class="icon-[lucide--notebook-pen] inline-block h-4 w-4"
      aria-hidden="true"
    ></span>
    Add note
  </button>

  <button
    type="button"
    class="rounded-md px-2 py-1 text-sm text-theme-muted hover:text-theme-danger"
    data-testid="solo-end"
    data-help-target="solo-end-session"
    onclick={() => (endOpen = true)}
  >
    End session
  </button>
</div>

{#if endOpen}
  <SoloEndDialog onclose={() => (endOpen = false)} />
{/if}
