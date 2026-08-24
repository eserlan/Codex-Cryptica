<script lang="ts">
  import {
    randomSources,
    deckService,
    ensureRandomSourcesLoaded,
  } from "$lib/features/random";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  import { DeckService, type RandomSource } from "random-source-engine";
  import {
    diceHistory,
    type DiceHistoryStore,
  } from "$lib/stores/dice-history.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import DiceVault from "./DiceVault.svelte";
  import DeckUseView from "$lib/components/random/DeckUseView.svelte";
  import TableUseView from "$lib/components/random/TableUseView.svelte";

  export type PlayToolsTab = "dice" | "decks" | "tables";

  let {
    isStandalone = false,
    activeTab = $bindable<PlayToolsTab>("dice"),
    sources = randomSources,
    service = deckService,
    history = diceHistory,
    session = mapSession,
  }: {
    isStandalone?: boolean;
    activeTab?: PlayToolsTab;
    sources?: RandomSourceStore;
    service?: DeckService;
    history?: DiceHistoryStore;
    session?: typeof mapSession;
  } = $props();

  let selectedDeckId = $state<string>("");
  let selectedTableId = $state<string>("");

  $effect(() => {
    void ensureRandomSourcesLoaded();
  });

  const decks = $derived(sources.decks);
  const tables = $derived(sources.tables);

  const selectedDeck = $derived<RandomSource | undefined>(
    decks.find((d) => d.id === selectedDeckId) ?? decks[0],
  );

  const selectedTable = $derived<RandomSource | undefined>(
    tables.find((t) => t.id === selectedTableId) ?? tables[0],
  );

  // Sync selected IDs if items change
  $effect(() => {
    if (
      decks.length > 0 &&
      (!selectedDeckId || !decks.some((d) => d.id === selectedDeckId))
    ) {
      selectedDeckId = decks[0].id;
    }
  });

  $effect(() => {
    if (
      tables.length > 0 &&
      (!selectedTableId || !tables.some((t) => t.id === selectedTableId))
    ) {
      selectedTableId = tables[0].id;
    }
  });

  const tabs: Array<{ id: PlayToolsTab; label: string; icon: string }> = [
    { id: "dice", label: "Dice", icon: "icon-[lucide--dices]" },
    { id: "decks", label: "Decks", icon: "icon-[lucide--layers]" },
    { id: "tables", label: "Tables", icon: "icon-[lucide--table-properties]" },
  ];
</script>

<div
  class="flex flex-col h-full {isStandalone
    ? 'bg-theme-bg'
    : 'bg-theme-surface'}"
  data-testid="play-tools-vault"
>
  <!-- Tab Navigation Bar -->
  <div
    class="flex items-center border-b border-theme-border/60 bg-theme-bg/40 px-3 pt-2 gap-1 shrink-0"
    role="tablist"
    aria-label="Play Tools Navigation"
  >
    {#each tabs as tab}
      {@const isActive = activeTab === tab.id}
      <button
        type="button"
        role="tab"
        id="play-tools-tab-{tab.id}"
        aria-controls="play-tools-panel-{tab.id}"
        aria-selected={isActive}
        class="flex items-center gap-1.5 px-3 py-2 text-xs font-header font-bold tracking-wider uppercase rounded-t-lg border-t border-x transition-all {isActive
          ? 'bg-theme-surface border-theme-border text-theme-primary shadow-sm -mb-px relative z-10'
          : 'border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-bg/60'}"
        onclick={() => (activeTab = tab.id)}
        data-testid="play-tools-tab-{tab.id}"
      >
        <span class="{tab.icon} w-4 h-4" aria-hidden="true"></span>
        <span>{tab.label}</span>
        {#if tab.id === "decks" && decks.length > 0}
          <span
            class="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono {isActive
              ? 'bg-theme-primary/20 text-theme-primary'
              : 'bg-theme-border/50 text-theme-muted'}"
          >
            {decks.length}
          </span>
        {:else if tab.id === "tables" && tables.length > 0}
          <span
            class="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono {isActive
              ? 'bg-theme-primary/20 text-theme-primary'
              : 'bg-theme-border/50 text-theme-muted'}"
          >
            {tables.length}
          </span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Tab Content -->
  <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
    {#if activeTab === "dice"}
      <div
        class="flex-1 min-h-0 overflow-hidden"
        role="tabpanel"
        id="play-tools-panel-dice"
        aria-labelledby="play-tools-tab-dice"
        aria-label="Dice Roller"
      >
        <DiceVault {isStandalone} {history} {session} />
      </div>
    {:else if activeTab === "decks"}
      <div
        class="flex-1 min-h-0 flex flex-col overflow-hidden"
        role="tabpanel"
        id="play-tools-panel-decks"
        aria-labelledby="play-tools-tab-decks"
        aria-label="Decks"
      >
        {#if decks.length === 0}
          <div
            class="flex-1 flex flex-col items-center justify-center p-8 text-center"
            data-testid="no-decks-state"
          >
            <span
              class="icon-[lucide--layers] w-12 h-12 mb-3 text-theme-muted/40"
              aria-hidden="true"
            ></span>
            <p
              class="text-xs font-header font-bold uppercase tracking-widest text-theme-text"
            >
              No Decks Available
            </p>
            <p class="text-[11px] text-theme-muted mt-1 max-w-xs font-body">
              Create a card deck in the Tables & Decks workspace to draw cards
              during play.
            </p>
          </div>
        {:else}
          <!-- Deck Selector Bar -->
          <div
            class="p-3 border-b border-theme-border/40 bg-theme-bg/20 flex items-center justify-between gap-3 shrink-0"
          >
            <label
              for="play-tools-deck-select"
              class="text-[10px] font-header font-bold uppercase tracking-widest text-theme-muted shrink-0"
            >
              Active Deck:
            </label>
            <div class="flex-1 max-w-xs relative">
              <select
                id="play-tools-deck-select"
                class="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-1.5 text-xs text-theme-text font-body focus:border-theme-primary focus:outline-none transition-colors"
                bind:value={selectedDeckId}
                data-testid="deck-select"
              >
                {#each decks as deck (deck.id)}
                  <option value={deck.id}>
                    {deck.name} ({deck.cards?.length ?? 0} cards)
                  </option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Deck View -->
          {#if selectedDeck}
            <div class="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
              <DeckUseView
                source={selectedDeck}
                {service}
                {sources}
                {history}
                {session}
              />
            </div>
          {/if}
        {/if}
      </div>
    {:else if activeTab === "tables"}
      <div
        class="flex-1 min-h-0 flex flex-col overflow-hidden"
        role="tabpanel"
        id="play-tools-panel-tables"
        aria-labelledby="play-tools-tab-tables"
        aria-label="Tables"
      >
        {#if tables.length === 0}
          <div
            class="flex-1 flex flex-col items-center justify-center p-8 text-center"
            data-testid="no-tables-state"
          >
            <span
              class="icon-[lucide--table-properties] w-12 h-12 mb-3 text-theme-muted/40"
              aria-hidden="true"
            ></span>
            <p
              class="text-xs font-header font-bold uppercase tracking-widest text-theme-text"
            >
              No Tables Available
            </p>
            <p class="text-[11px] text-theme-muted mt-1 max-w-xs font-body">
              Create a random table in the Tables & Decks workspace to roll on
              tables during play.
            </p>
          </div>
        {:else}
          <!-- Table Selector Bar -->
          <div
            class="p-3 border-b border-theme-border/40 bg-theme-bg/20 flex items-center justify-between gap-3 shrink-0"
          >
            <label
              for="play-tools-table-select"
              class="text-[10px] font-header font-bold uppercase tracking-widest text-theme-muted shrink-0"
            >
              Active Table:
            </label>
            <div class="flex-1 max-w-xs relative">
              <select
                id="play-tools-table-select"
                class="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-1.5 text-xs text-theme-text font-body focus:border-theme-primary focus:outline-none transition-colors"
                bind:value={selectedTableId}
                data-testid="table-select"
              >
                {#each tables as table (table.id)}
                  <option value={table.id}>
                    {table.name} ({table.entries?.length ?? 0} entries)
                  </option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Table View -->
          {#if selectedTable}
            <div class="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
              <TableUseView
                source={selectedTable}
                {sources}
                {history}
                {session}
              />
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  @reference "../../../app.css";
</style>
