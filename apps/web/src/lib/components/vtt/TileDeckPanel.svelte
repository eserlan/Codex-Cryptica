<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { tileDeckPanelUIStore } from "$lib/stores/ui/tile-deck-panel-ui.svelte";
  import {
    getTileCategoryFromName,
    STARTER_DECK_CATALOG,
    StarterTileDeckService,
  } from "$lib/services/vtt/StarterTileDeckService";

  let deckName = $state("");
  let files = $state<File[]>([]);
  let isCreating = $state(false);
  let message = $state<string | null>(null);
  let installingId = $state<string | null>(null);
  let installProgress = $state<
    Record<string, { loaded: number; total: number }>
  >({});
  let activeCategory = $state<Record<string, string>>({});
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

  function visibleTilesFor(deck: (typeof mapSession.tileDecks)[number]) {
    const category = selectedCategoryFor(deck.id);
    return deck.tiles.filter(
      (tile) => category === "All" || categoryForTile(tile) === category,
    );
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
              {pack.name} · {pack.license} · downloaded once to this vault.
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
          >PNG tile images</label
        >
        <input
          id="tile-deck-files"
          type="file"
          accept="image/png"
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
                    onclick={() => placeTile(deck.id, tile.id, tile.name)}
                    class="group relative aspect-square overflow-hidden rounded border border-theme-border bg-theme-bg/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
                    title="Place {tile.name}"
                    aria-label="Place {tile.name}"
                  >
                    {#if imageUrls[tile.imagePath]}
                      <img
                        src={imageUrls[tile.imagePath]}
                        alt=""
                        class="h-full w-full object-contain p-0.5"
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
