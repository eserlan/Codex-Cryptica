<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { tileDeckPanelUIStore } from "$lib/stores/ui/tile-deck-panel-ui.svelte";

  const FREQUENCY_OPTIONS = [
    { label: "Every", value: 1, title: "On every drawn tile" },
    { label: "1/2", value: 2, title: "On 1 drawn tile in 2" },
    { label: "1/3", value: 3, title: "On 1 drawn tile in 3" },
    { label: "1/4", value: 4, title: "On 1 drawn tile in 4" },
    { label: "1/6", value: 6, title: "On 1 drawn tile in 6" },
  ];

  import {
    getTileCategoryFromName,
    STARTER_DECK_CATALOG,
    StarterTileDeckService,
  } from "$lib/services/vtt/StarterTileDeckService";
  import {
    randomSources,
    ensureRandomSourcesLoaded,
  } from "$lib/features/random";
  import type { TileDeckStockingMode } from "../../../types/vtt";

  let deckName = $state("");
  let files = $state<File[]>([]);
  let isCreating = $state(false);
  let message = $state<string | null>(null);
  let installingId = $state<string | null>(null);
  let installProgress = $state<
    Record<string, { loaded: number; total: number }>
  >({});
  let activeCategory = $state<Record<string, string>>({});
  let searchQuery = $state<Record<string, string>>({});
  /** Tables are only read here, so they are loaded on mount like every other view that lists them. */
  $effect(() => {
    void ensureRandomSourcesLoaded();
  });
  let imageUrls = $state<Record<string, string>>({});
  const resolvingPaths = new Set<string>();

  $effect(() => {
    const paths = mapSession.tileDecks.flatMap((deck) =>
      deck.tiles.map((tile) => tile.imagePath),
    );
    const unresolved = paths.filter(
      (path) => !imageUrls[path] && !resolvingPaths.has(path),
    );
    if (unresolved.length === 0) return;
    unresolved.forEach((path) => resolvingPaths.add(path));
    void Promise.all(
      unresolved.map(async (path) => {
        try {
          const url = await vault.resolveImageUrl(path);
          if (url) imageUrls = { ...imageUrls, [path]: url };
        } finally {
          resolvingPaths.delete(path);
        }
      }),
    );
  });

  function stockingModeFor(deck: (typeof mapSession.tileDecks)[number]) {
    return deck.stocking?.mode ?? "none";
  }

  function setStockingMode(
    deck: (typeof mapSession.tileDecks)[number],
    mode: TileDeckStockingMode,
  ) {
    mapSession.setTileDeckStocking(deck.id, {
      ...deck.stocking,
      mode,
      // Switching to "table" preselects the vault's first table, so the
      // picker is never sitting on an empty choice that silently rolls nothing.
      tableId: deck.stocking?.tableId ?? randomSources.tables[0]?.id,
    });
  }

  function setStockingTable(
    deck: (typeof mapSession.tileDecks)[number],
    tableId: string,
  ) {
    mapSession.setTileDeckStocking(deck.id, {
      ...deck.stocking,
      mode: "table",
      tableId,
    });
  }

  function setStockingFrequency(
    deck: (typeof mapSession.tileDecks)[number],
    frequency: number,
  ) {
    mapSession.setTileDeckStocking(deck.id, {
      mode: stockingModeFor(deck),
      tableId: deck.stocking?.tableId,
      frequency,
    });
  }

  function selectFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    files = Array.from(input.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
  }

  async function createDeck() {
    if (!deckName.trim() || files.length === 0 || isCreating) return;
    isCreating = true;
    message = null;
    try {
      const tiles: Array<{ name: string; imagePath: string }> = [];
      for (const file of files) {
        const result = await vault.importFileToVault(file);
        if (!result.ok) {
          message = "Some images could not be added to this vault.";
          continue;
        }
        tiles.push({ name: result.file.name, imagePath: result.file.path });
      }
      const deck = mapSession.createTileDeck(deckName, tiles);
      if (!deck) {
        message = "Add at least one image to create a deck.";
        return;
      }
      deckName = "";
      files = [];
      message = `${deck.name} is ready to draw from.`;
    } finally {
      isCreating = false;
    }
  }

  async function removeDeck(deckId: string, deckName: string) {
    const confirmed = await notificationStore.confirm({
      title: "Remove Tile Deck",
      message: `Are you sure you want to remove "${deckName}"? Tiles already placed on the map are kept, but you won't be able to draw from this deck anymore.`,
      confirmLabel: "Remove Deck",
      isDangerous: true,
    });
    if (!confirmed) return;
    mapSession.removeTileDeck(deckId);
    message = `${deckName} was removed.`;
  }

  function draw(deckId: string) {
    const tile = mapSession.drawTile(deckId);
    message = tile
      ? `Place ${tile.name} on the map. Press Escape to cancel.`
      : "This deck has no tiles to draw.";
  }

  function drawAny() {
    const tile = mapSession.drawAnyTile();
    message = tile
      ? `Place ${tile.name} on the map. Press Escape to cancel.`
      : "No decks have tiles to draw yet.";
  }

  function placeTile(deckId: string, tileId: string, tileName: string) {
    const tile = mapSession.selectTile(deckId, tileId);
    message = tile
      ? `Place ${tileName} on the map. Press Escape to cancel.`
      : "This tile is no longer available.";
  }

  function handleTileDragStart(
    event: DragEvent,
    deckId: string,
    tileId: string,
  ) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(
      "application/x-codex-tile",
      JSON.stringify({ deckId, tileId }),
    );
    event.dataTransfer.effectAllowed = "copy";
  }

  function categoriesFor(deck: (typeof mapSession.tileDecks)[number]) {
    return [
      "All",
      ...Array.from(
        new Set(deck.tiles.map((tile) => categoryForTile(tile))),
      ).sort(),
    ];
  }

  function selectedCategoryFor(deckId: string) {
    return activeCategory[deckId] ?? "All";
  }

  function searchQueryFor(deckId: string) {
    return searchQuery[deckId]?.trim().toLowerCase() ?? "";
  }

  function visibleTilesFor(deck: (typeof mapSession.tileDecks)[number]) {
    const category = selectedCategoryFor(deck.id);
    const query = searchQueryFor(deck.id);
    return deck.tiles.filter((tile) => {
      const tileCat = categoryForTile(tile);
      if (category !== "All" && tileCat !== category) return false;
      if (!query) return true;
      const nameMatch = tile.name.toLowerCase().includes(query);
      const catMatch = tileCat.toLowerCase().includes(query);
      const termsMatch =
        tile.searchTerms?.some((term) => term.toLowerCase().includes(query)) ??
        false;
      return nameMatch || catMatch || termsMatch;
    });
  }

  function categoryForTile(
    tile: (typeof mapSession.tileDecks)[number]["tiles"][number],
  ) {
    return tile.category ?? getTileCategoryFromName(tile.name);
  }

  function isInstalled(deckId: string) {
    return mapSession.tileDecks.some((deck) => deck.starterDeckId === deckId);
  }

  async function installStarterDeck(deckId: string) {
    if (installingId) return;
    installingId = deckId;
    installProgress = { ...installProgress, [deckId]: { loaded: 0, total: 0 } };
    message = null;
    try {
      const service = new StarterTileDeckService({
        importFile: (file) => vault.importFileToVault(file),
        getDecks: () => mapSession.tileDecks,
        beginDeck: (name, starterDeckId, license, sourceUrl) =>
          mapSession.beginStarterTileDeck(
            name,
            starterDeckId,
            license,
            sourceUrl,
          ),
        addTile: (deckIdBeingFilled, tile) =>
          mapSession.addTileToDeck(deckIdBeingFilled, tile),
        persist: () => mapSession.persistTileDecks(),
      });
      const deck = await service.install(deckId, (loaded, total) => {
        installProgress = {
          ...installProgress,
          [deckId]: { loaded, total },
        };
      });
      message = `${deck.name} is saved in this vault and ready to draw from offline.`;
    } catch (error) {
      message =
        error instanceof Error
          ? error.message
          : "Could not add the starter deck.";
    } finally {
      installingId = null;
    }
  }
</script>

<section
  class="rounded-xl border border-theme-primary/20 bg-theme-bg/50"
  aria-labelledby="tile-decks-heading"
>
  <div class="border-b border-theme-primary/20 px-3 py-3">
    <h2
      id="tile-decks-heading"
      class="text-[9px] font-black uppercase tracking-[0.35em] text-theme-primary/70 font-header"
    >
      Tile decks
    </h2>
    <p class="mt-1 text-xs text-theme-muted">
      Draw room and corridor images as the map unfolds.
    </p>
    <button
      type="button"
      onclick={() => tileDeckPanelUIStore.toggleCatalog()}
      aria-expanded={!tileDeckPanelUIStore.catalogCollapsed}
      class="mt-3 flex w-full items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
      ><span
        class="icon-[lucide--chevron-right] h-3.5 w-3.5 transition-transform {tileDeckPanelUIStore.catalogCollapsed
          ? ''
          : 'rotate-90'}"
        aria-hidden="true"
      ></span>Add decks</button
    >
    {#if !tileDeckPanelUIStore.catalogCollapsed}
      <ul class="mt-2 space-y-2">
        {#each STARTER_DECK_CATALOG as pack (pack.id)}
          <li>
            <button
              type="button"
              onclick={() => void installStarterDeck(pack.id)}
              disabled={installingId !== null || isInstalled(pack.id)}
              class="inline-flex items-center gap-1 rounded-md border border-theme-primary/40 px-2 py-1 text-xs font-bold text-theme-primary hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              ><span
                class="icon-[lucide--download] h-3.5 w-3.5"
                aria-hidden="true"
              ></span>{installingId === pack.id
                ? installProgress[pack.id]?.total
                  ? `Adding ${pack.name}… ${installProgress[pack.id].loaded}/${installProgress[pack.id].total}`
                  : `Adding ${pack.name}…`
                : isInstalled(pack.id)
                  ? `${pack.name} added`
                  : `Add ${pack.name} starter deck`}</button
            >
            <p class="mt-1 text-[11px] text-theme-muted">
              {pack.description}
            </p>
            <p class="mt-0.5 text-[10px] text-theme-muted/70">
              {pack.license} · downloaded once to this vault.
            </p>
          </li>
        {/each}
      </ul>

      <form
        class="mt-3 space-y-2 border-t border-theme-border pt-3"
        onsubmit={(event) => {
          event.preventDefault();
          void createDeck();
        }}
      >
        <label class="block text-xs text-theme-text" for="tile-deck-name"
          >Deck name</label
        >
        <input
          id="tile-deck-name"
          bind:value={deckName}
          class="w-full rounded-md border border-theme-border bg-theme-surface px-2 py-1.5 text-sm text-theme-text"
          placeholder="Rooms"
        />
        <label class="block text-xs text-theme-text" for="tile-deck-files"
          >Tile images (PNG or JPG)</label
        >
        <input
          id="tile-deck-files"
          type="file"
          accept="image/png,image/jpeg"
          multiple
          onchange={selectFiles}
          class="block w-full text-xs text-theme-muted file:mr-2 file:rounded file:border-0 file:bg-theme-primary/10 file:px-2 file:py-1 file:text-theme-primary"
        />
        {#if files.length > 0}<p class="text-xs text-theme-muted">
            {files.length} image{files.length === 1 ? "" : "s"} selected
          </p>{/if}
        <button
          type="submit"
          disabled={isCreating || !deckName.trim() || files.length === 0}
          class="rounded-md bg-theme-primary px-3 py-1.5 text-xs font-bold text-theme-bg disabled:cursor-not-allowed disabled:opacity-50"
          >{isCreating ? "Adding images…" : "Create deck"}</button
        >
      </form>
    {/if}
  </div>

  {#if mapSession.armedTile}
    <div
      class="mx-3 mt-3 flex items-center justify-between rounded-lg border border-theme-primary/40 bg-theme-primary/10 px-3 py-2 text-xs text-theme-primary"
      data-testid="tile-deck-armed-banner"
    >
      <div class="flex items-center gap-2 truncate">
        <span
          class="h-2 w-2 shrink-0 rounded-full bg-theme-primary animate-pulse"
          aria-hidden="true"
        ></span>
        <span class="truncate"
          >Placing <strong>{mapSession.armedTile.name}</strong></span
        >
      </div>
      <button
        type="button"
        onclick={() => mapSession.clearArmedTile()}
        class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-theme-primary hover:bg-theme-primary/20"
        title="Cancel tile placement (Esc)"
        aria-label="Cancel tile placement"
      >
        Cancel
      </button>
    </div>
  {/if}

  {#if mapSession.tileDecks.length > 0}
    <div class="space-y-2 border-t border-theme-primary/20 p-3">
      <button
        type="button"
        onclick={() => drawAny()}
        disabled={!mapSession.tileDecks.some((deck) => deck.tiles.length > 0)}
        class="inline-flex w-full items-center justify-center gap-1 rounded-md border border-theme-primary/40 px-2 py-1.5 text-xs font-bold text-theme-primary hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
        ><span class="icon-[lucide--shuffle] h-3.5 w-3.5" aria-hidden="true"
        ></span>Draw from all decks</button
      >
      {#each mapSession.tileDecks as deck (deck.id)}
        <div
          class="rounded-lg border border-theme-border bg-theme-surface/70 p-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-theme-text">{deck.name}</span>
            <span class="flex items-center gap-2">
              <span class="text-xs text-theme-muted"
                >{deck.tiles.length} tiles</span
              >
              <button
                type="button"
                onclick={() => void removeDeck(deck.id, deck.name)}
                class="text-theme-muted hover:text-red-400"
                title="Remove {deck.name}"
                aria-label="Remove {deck.name}"
                ><span
                  class="icon-[lucide--trash-2] h-3.5 w-3.5"
                  aria-hidden="true"
                ></span></button
              >
            </span>
          </div>
          {#if deck.license}
            <p class="mt-0.5 text-[10px] text-theme-muted">{deck.license}</p>
          {/if}
          <div class="mt-2 flex items-center justify-between gap-2">
            <label class="flex items-center gap-1.5 text-xs text-theme-muted"
              ><input
                type="checkbox"
                checked={deck.hardEdges}
                onchange={(event) =>
                  mapSession.setTileDeckHardEdges(
                    deck.id,
                    (event.currentTarget as HTMLInputElement).checked,
                  )}
              /> Hard edges</label
            >
            <button
              type="button"
              onclick={() => draw(deck.id)}
              class="inline-flex items-center gap-1 rounded-md border border-theme-primary/40 px-2 py-1 text-xs font-bold text-theme-primary hover:bg-theme-primary/10"
              ><span
                class="icon-[lucide--shuffle] h-3.5 w-3.5"
                aria-hidden="true"
              ></span>Draw</button
            >
          </div>
          <div class="mt-2 space-y-2 border-t border-theme-border pt-2">
            <div class="flex items-center justify-between">
              <span
                class="text-[10px] font-bold uppercase tracking-widest text-theme-muted"
              >
                Stock on draw
              </span>
            </div>

            <div
              class="grid grid-cols-3 gap-1 rounded-lg border border-theme-border bg-theme-bg/60 p-0.5 text-xs"
              role="group"
              aria-label="Stocking mode for {deck.name}"
            >
              <button
                type="button"
                onclick={() => setStockingMode(deck, "none")}
                class={[
                  "rounded py-1 text-center font-medium transition-colors",
                  stockingModeFor(deck) === "none"
                    ? "bg-theme-surface border border-theme-border/60 text-theme-primary font-bold shadow-xs"
                    : "text-theme-muted hover:text-theme-text",
                ]}
                aria-pressed={stockingModeFor(deck) === "none"}
              >
                None
              </button>
              <button
                type="button"
                onclick={() => setStockingMode(deck, "table")}
                class={[
                  "rounded py-1 text-center font-medium transition-colors",
                  stockingModeFor(deck) === "table"
                    ? "bg-theme-surface border border-theme-border/60 text-theme-primary font-bold shadow-xs"
                    : "text-theme-muted hover:text-theme-text",
                ]}
                aria-pressed={stockingModeFor(deck) === "table"}
              >
                Table Roll
              </button>
              <button
                type="button"
                onclick={() => setStockingMode(deck, "encounter")}
                class={[
                  "rounded py-1 text-center font-medium transition-colors",
                  stockingModeFor(deck) === "encounter"
                    ? "bg-theme-surface border border-theme-border/60 text-theme-primary font-bold shadow-xs"
                    : "text-theme-muted hover:text-theme-text",
                ]}
                aria-pressed={stockingModeFor(deck) === "encounter"}
              >
                Encounter
              </button>
            </div>

            {#if stockingModeFor(deck) !== "none"}
              <div class="space-y-1.5 pt-1">
                <div
                  class="flex items-center justify-between text-[10px] text-theme-muted font-bold uppercase tracking-widest"
                >
                  <span>Frequency</span>
                  <span
                    class="text-theme-text font-normal normal-case text-[11px]"
                  >
                    {(deck.stocking?.frequency ?? 1) === 1
                      ? "Every tile"
                      : `1 in ${deck.stocking?.frequency ?? 1} tiles`}
                  </span>
                </div>
                <div
                  class="flex gap-1"
                  role="group"
                  aria-label="Stocking frequency"
                >
                  {#each FREQUENCY_OPTIONS as freq}
                    <button
                      type="button"
                      onclick={() => setStockingFrequency(deck, freq.value)}
                      class={[
                        "flex-1 rounded border py-1 text-center text-xs font-medium transition-colors",
                        (deck.stocking?.frequency ?? 1) === freq.value
                          ? "border-theme-primary bg-theme-primary/15 text-theme-primary font-bold"
                          : "border-theme-border bg-theme-surface text-theme-muted hover:text-theme-text",
                      ]}
                      title={freq.title}
                      aria-label={freq.title}
                      aria-pressed={(deck.stocking?.frequency ?? 1) ===
                        freq.value}
                    >
                      {freq.label}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            {#if stockingModeFor(deck) === "encounter"}
              <p class="text-[10px] text-theme-muted leading-tight">
                Pins an empty encounter note on placed tiles, ready for GM
                detailing.
              </p>
            {/if}

            {#if stockingModeFor(deck) === "table"}
              <div class="space-y-1 pt-1">
                <label
                  class="block text-[10px] font-bold uppercase tracking-widest text-theme-muted"
                  for="stocking-table-{deck.id}"
                >
                  Source Table
                </label>
                {#if randomSources.tables.length > 0}
                  <select
                    id="stocking-table-{deck.id}"
                    value={deck.stocking?.tableId ?? ""}
                    onchange={(event) =>
                      setStockingTable(deck, event.currentTarget.value)}
                    class="w-full rounded-md border border-theme-border bg-theme-surface px-2 py-1 text-xs text-theme-text focus:border-theme-primary outline-none"
                  >
                    <option value="" disabled>Choose a table…</option>
                    {#each randomSources.tables as table (table.id)}
                      <option value={table.id}>{table.name}</option>
                    {/each}
                  </select>
                {:else}
                  <p class="text-[10px] text-theme-muted">
                    No random tables found in vault. Create a table to roll
                    automatically on placement.
                  </p>
                {/if}
              </div>
            {/if}
          </div>
          <div class="mt-3 border-t border-theme-border pt-2">
            <button
              type="button"
              onclick={() => tileDeckPanelUIStore.toggleGrid(deck.id)}
              aria-expanded={tileDeckPanelUIStore.isGridExpanded(deck.id)}
              class="flex w-full items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
              ><span
                class="icon-[lucide--chevron-right] h-3 w-3 transition-transform {tileDeckPanelUIStore.isGridExpanded(
                  deck.id,
                )
                  ? 'rotate-90'
                  : ''}"
                aria-hidden="true"
              ></span>{tileDeckPanelUIStore.isGridExpanded(deck.id)
                ? "Hide tiles"
                : "Show tiles"}</button
            >
            {#if tileDeckPanelUIStore.isGridExpanded(deck.id)}
              <div class="relative mt-2">
                <input
                  type="text"
                  placeholder="Search {deck.name} tiles…"
                  value={searchQuery[deck.id] ?? ""}
                  oninput={(e) =>
                    (searchQuery = {
                      ...searchQuery,
                      [deck.id]: e.currentTarget.value,
                    })}
                  class="w-full rounded-md border border-theme-border bg-theme-bg py-1 pl-7 pr-7 text-xs text-theme-text placeholder:text-theme-muted focus:border-theme-primary outline-none"
                  aria-label="Search {deck.name} tiles"
                  data-testid="tile-deck-search-{deck.id}"
                />
                <span
                  class="icon-[lucide--search] absolute left-2 top-2 h-3.5 w-3.5 text-theme-muted pointer-events-none"
                  aria-hidden="true"
                ></span>
                {#if searchQuery[deck.id]}
                  <button
                    type="button"
                    onclick={() =>
                      (searchQuery = { ...searchQuery, [deck.id]: "" })}
                    class="absolute right-1.5 top-1.5 rounded p-0.5 text-theme-muted hover:text-theme-text"
                    aria-label="Clear search"
                  >
                    <span class="icon-[lucide--x] h-3 w-3" aria-hidden="true"
                    ></span>
                  </button>
                {/if}
              </div>

              <div
                class="mt-2 flex flex-wrap gap-1"
                aria-label="Filter {deck.name} tiles"
              >
                {#each categoriesFor(deck) as category (category)}
                  <button
                    type="button"
                    onclick={() =>
                      (activeCategory = {
                        ...activeCategory,
                        [deck.id]: category,
                      })}
                    aria-pressed={selectedCategoryFor(deck.id) === category}
                    class={[
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                      selectedCategoryFor(deck.id) === category
                        ? "border-theme-primary bg-theme-primary/15 text-theme-primary"
                        : "border-theme-border text-theme-muted hover:text-theme-text",
                    ]}>{category}</button
                  >
                {/each}
              </div>
              <div
                class="mt-2 grid max-h-72 grid-cols-4 gap-1 overflow-y-auto pr-1"
                aria-label="{selectedCategoryFor(deck.id)} tiles"
              >
                {#each visibleTilesFor(deck) as tile (tile.id)}
                  <button
                    type="button"
                    draggable="true"
                    ondragstart={(e) =>
                      handleTileDragStart(e, deck.id, tile.id)}
                    onclick={() => placeTile(deck.id, tile.id, tile.name)}
                    class={[
                      "group relative aspect-square overflow-hidden rounded border bg-theme-bg/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary transition-all cursor-grab active:cursor-grabbing",
                      mapSession.armedTile?.tileId === tile.id
                        ? "border-theme-primary ring-2 ring-theme-primary bg-theme-primary/10 shadow-[0_0_12px_rgba(var(--theme-primary-rgb,120,53,15),0.35)]"
                        : "border-theme-border hover:border-theme-primary/50",
                    ]}
                    style="content-visibility: auto"
                    title="Place {tile.name} (drag or click)"
                    aria-label="Place {tile.name}"
                    aria-pressed={mapSession.armedTile?.tileId === tile.id}
                  >
                    {#if imageUrls[tile.imagePath]}
                      <img
                        src={imageUrls[tile.imagePath]}
                        alt=""
                        class="h-full w-full object-contain p-0.5 pointer-events-none"
                      />
                    {:else}
                      <span
                        class="icon-[lucide--image] m-auto h-4 w-4 text-theme-muted"
                        aria-hidden="true"
                      ></span>
                    {/if}
                    <span
                      class="absolute inset-x-0 bottom-0 truncate bg-theme-bg/85 px-0.5 py-px text-[8px] text-theme-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      >{tile.name}</span
                    >
                  </button>
                {/each}
              </div>
              <p class="mt-1 text-[10px] text-theme-muted">
                {visibleTilesFor(deck).length} of {deck.tiles.length} tiles
              </p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  {#if message}<p class="px-3 pb-3 text-xs text-theme-muted" aria-live="polite">
      {message}
    </p>{/if}
</section>
