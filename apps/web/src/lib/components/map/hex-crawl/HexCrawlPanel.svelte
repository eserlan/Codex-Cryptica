<script lang="ts">
  import { onMount, untrack } from "svelte";
  import {
    hexToPoint,
    type HexCoord,
    type HexGridConfig,
    type HexLabelConfig,
    type HexOrientation,
  } from "map-engine";
  import {
    deriveHexState,
    hasPendingParts,
    type Terrain,
  } from "hex-crawl-engine";
  import type { HexCrawlStore } from "#lib/stores/hex-crawl/hex-crawl.svelte.js";
  import type { HexJourneyStore } from "#lib/stores/hex-crawl/hex-journey.svelte.js";
  import { mapStore } from "#lib/stores/map.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import { canSeeHexCrawl, hexLabelFor } from "./hex-crawl-view";
  import HexTerrainPicker from "./HexTerrainPicker.svelte";
  import HexNotes from "./HexNotes.svelte";
  import HexContentsList from "./HexContentsList.svelte";
  import HexDiscoveryReview from "./HexDiscoveryReview.svelte";
  import HexExploreControls from "./HexExploreControls.svelte";
  import RegionGenerateMenu from "./region/RegionGenerateMenu.svelte";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";
  import type { GeographyGenerationStore } from "#lib/stores/hex-crawl/geography-generation.svelte.js";
  import type {
    HexDiscoveryControls,
    HexDiscoveryWiring,
  } from "./discovery-controls";
  import type { NoticeStorage } from "./hex-discovery-notice";
  import {
    AI_NOTICE_TEXT,
    dismissAiNotice,
    isAiNoticeDismissed,
  } from "./hex-discovery-notice";
  import {
    HEX_HINT_TEXT,
    isHexHintSeen,
    markHexHintSeen,
  } from "./hex-crawl-hint";

  let {
    store,
    journey,
    mapId,
    hex,
    isGM,
    isGuest,
    revealed,
    labelConfig,
    orientation,
    gridConfig,
    pins,
    entities,
    discovery,
    storage,
    region,
    geography,
  }: {
    store: HexCrawlStore;
    journey?: HexJourneyStore;
    region?: RegionGenerationStore;
    geography?: GeographyGenerationStore;
    mapId: string;
    hex: HexCoord;
    isGM: boolean;
    isGuest: boolean;
    /** Hex centre uncovered by fog, or fog is off (FR-014). */
    revealed: boolean;
    labelConfig: HexLabelConfig | undefined;
    orientation: HexOrientation;
    gridConfig: HexGridConfig;
    pins: readonly {
      id: string;
      entityId?: string;
      hexCoordinates?: { q: number; r: number };
    }[];
    entities: readonly { id: string; title: string; type: string }[];
    discovery: HexDiscoveryWiring | null;
    storage: NoticeStorage | null;
  } = $props();

  /** Bumped after each write so the reads below pick up the new state. */
  let version = $state(0);
  const refresh = () => {
    version++;
  };

  const suggestedSite = $derived.by(() => {
    void version;
    return store.stateFor(mapId).topology?.sites[`${hex.q},${hex.r}`];
  });
  const record = $derived.by(() => {
    void version;
    return store.recordFor(mapId, hex);
  });
  const chip = $derived(deriveHexState(record, revealed));
  const chipText = $derived(
    chip === "explored" ? "Explored" : chip === "seen" ? "Seen" : "Unknown",
  );
  const explored = $derived(chip === "explored");
  const label = $derived(hexLabelFor(hex, labelConfig, orientation));
  const centre = $derived(hexToPoint(hex, gridConfig));
  const visible = $derived(canSeeHexCrawl({ isGM, isGuest }));
  const draftPending = $derived(
    record?.draft !== undefined && hasPendingParts(record.draft),
  );
  const exploreVisible = $derived(visible && discovery !== null && !isGuest);

  // Wraps each discovery action so the panel re-reads the hex after it runs.
  const controls = $derived.by(() => {
    if (!discovery) return null;
    // ⚡ Bolt Optimization: Replace Object.fromEntries(Object.entries().map()) with an imperative loop
    // to avoid intermediate array allocations in reactive blocks, reducing garbage collection pressure.
    const result: Record<string, unknown> = {};
    for (const key in discovery.controls) {
      if (Object.prototype.hasOwnProperty.call(discovery.controls, key)) {
        const fn = discovery.controls[key as keyof typeof discovery.controls];
        result[key] = async (...args: unknown[]) => {
          try {
            return await (fn as (...a: unknown[]) => Promise<unknown>)(...args);
          } finally {
            refresh();
          }
        };
      }
    }
    return result as unknown as HexDiscoveryControls;
  });

  let header: HTMLElement | undefined = $state();
  let panel: HTMLElement | undefined = $state();
  let hintVisible = $state(untrack(() => !isHexHintSeen(storage)));
  let generating = $state(false);
  let failure = $state<"ai-failed" | null>(null);
  let controller: AbortController | null = null;
  let noticeAcknowledged = $state(untrack(() => isAiNoticeDismissed(storage)));
  const showAiNotice = $derived(
    discovery?.aiEnabled === true && !noticeAcknowledged,
  );

  onMount(() => {
    header?.focus();
  });

  function close() {
    controller?.abort();
    controller = null;
    store.closeHex();
  }

  async function explore() {
    if (!discovery || generating) return;
    if (showAiNotice) return;
    const current = new AbortController();
    controller = current;
    generating = true;
    failure = null;
    try {
      const result = await discovery.explore(current.signal);
      failure = result?.failure ?? null;
    } catch {
      if (!current.signal.aborted) failure = "ai-failed";
    } finally {
      generating = false;
      if (controller === current) controller = null;
      refresh();
    }
  }

  function acknowledgeAiNotice() {
    dismissAiNotice(storage);
    noticeAcknowledged = true;
  }

  function cancelGeneration() {
    controller?.abort();
  }

  function reviewDraft() {
    document.getElementById("hex-discovery-review")?.focus();
  }

  async function chooseTerrain(terrain: Terrain | null) {
    await store.setTerrain(mapId, hex, terrain);
    refresh();
  }

  function setJourneyStart() {
    journey?.setOrigin(hex);
  }

  function travelHere() {
    const result = journey?.preview(hex);
    if (result && !result.ok) journey!.error = result.reason;
  }

  async function toggleExplored() {
    await store.setExplored(mapId, hex, !explored, "gm");
    refresh();
  }

  async function attach(entityId: string) {
    await mapStore.addPin(entityId, centre);
    refresh();
  }

  async function createHere(type: string, title: string) {
    const id = await vault.createEntity(type, title);
    await mapStore.addPin(id, centre);
    modalUIStore.openZenMode(id);
    refresh();
  }

  function dismissHint() {
    markHexHintSeen(storage);
    hintVisible = false;
  }

  const hexKey = $derived(`${mapId}:${hex.q},${hex.r}`);

  function handlePanelKeydown(event: KeyboardEvent) {
    if (
      event.key === "Escape" &&
      event.target instanceof Node &&
      panel?.contains(event.target)
    ) {
      event.stopPropagation();
      close();
    }
  }

  $effect(() => {
    void hexKey;
    controller?.abort();
    controller = null;
    generating = false;
    failure = null;
  });
</script>

{#snippet AiDisclosure()}
  {#if showAiNotice}
    <div
      class="mt-3 flex flex-wrap items-start gap-2 rounded-lg border border-theme-primary/40 bg-theme-primary/5 p-3"
    >
      <p class="flex-1 text-micro text-theme-text">{AI_NOTICE_TEXT}</p>
      <button
        type="button"
        aria-label="Acknowledge AI notice"
        onclick={acknowledgeAiNotice}
        class="text-micro font-bold uppercase tracking-widest text-theme-text hover:text-theme-text"
      >
        I understand
      </button>
    </div>
  {/if}
{/snippet}

<!-- fallow-ignore-next-line complexity -- This panel keeps selection, discovery, notes, and journey actions for one hex together. -->
<svelte:window onkeydown={handlePanelKeydown} />
{#if visible}
  <section
    bind:this={panel}
    class="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-xl border border-theme-border bg-theme-surface/95 p-4 shadow-xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-24 md:w-88 md:max-h-[calc(100vh-7rem)] md:rounded-xl"
    aria-labelledby="hex-panel-title"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <h2
          id="hex-panel-title"
          bind:this={header}
          tabindex="-1"
          class="text-sm font-bold uppercase tracking-widest text-theme-text font-header outline-none"
        >
          {label}
        </h2>
        <span
          class="rounded-full border border-theme-border px-2 py-0.5 text-micro font-bold text-theme-text"
        >
          {chipText}
        </span>
      </div>
      <button
        type="button"
        aria-label="Close hex panel"
        onclick={close}
        class="text-theme-text hover:text-theme-text"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </header>

    {#if journey && isGM && !isGuest}
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          onclick={setJourneyStart}
          class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold text-theme-text"
          >Set as journey start</button
        >
        <button
          type="button"
          onclick={travelHere}
          class="rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold text-theme-text"
          >Travel here</button
        >
      </div>
      {#if journey.error}<p
          role="status"
          class="mt-1 text-micro text-theme-text"
        >
          {journey.error}
        </p>{/if}
    {/if}

    {#if hintVisible}
      <div
        role="note"
        class="mt-3 flex items-start gap-2 rounded-lg bg-theme-primary/5 p-2"
      >
        <p class="flex-1 text-micro text-theme-text">{HEX_HINT_TEXT}</p>
        <button
          type="button"
          onclick={dismissHint}
          class="text-micro font-bold uppercase tracking-widest text-theme-text hover:text-theme-text"
        >
          Got it
        </button>
      </div>
    {/if}

    {#if exploreVisible}
      {@render AiDisclosure()}
      <div class="mt-3">
        <HexExploreControls
          {draftPending}
          {explored}
          {generating}
          exploreBlocked={showAiNotice}
          onReview={reviewDraft}
          onExplore={explore}
          onCancel={cancelGeneration}
        />
      </div>
    {/if}

    {#if draftPending && record?.draft && controls && discovery}
      <div class="mt-3" id="hex-discovery-review" tabindex="-1">
        <HexDiscoveryReview
          draft={record.draft}
          {controls}
          proposedLink={discovery.proposedLink}
          factionMatch={discovery.factionMatch}
          {failure}
          customTerrainLabel={discovery.customTerrainLabel}
          onCancel={cancelGeneration}
        />
      </div>
    {/if}

    <div class="mt-4 space-y-4">
      <div class="space-y-2">
        <h3
          class="text-micro uppercase tracking-widest font-bold text-theme-text"
        >
          Terrain
        </h3>
        <HexTerrainPicker terrain={record?.terrain} onChoose={chooseTerrain} />
      </div>

      {#if region}
        <RegionGenerateMenu store={region} {mapId} {hex} />
      {/if}
      {#if geography && isGM && !isGuest}
        <div class="space-y-2" data-testid="hex-geography-menu">
          <h3
            class="text-micro font-bold uppercase tracking-widest text-theme-text"
          >
            Generate geography
          </h3>
          <button
            type="button"
            class="min-h-11 w-full rounded-lg border border-theme-border px-3 py-1.5 text-left text-sm font-bold text-theme-text hover:border-theme-primary/40"
            onclick={() => {
              if (geography.open(mapId, hex)) store.closeHex();
            }}
          >
            Propose rivers, roads & settlement sites
          </button>
          {#if geography.message === "empty"}
            <p role="alert" class="text-xs text-theme-text">
              No mapped terrain in range. Paint or generate terrain around this
              hex first.
            </p>
          {/if}
          {#if suggestedSite}
            <p class="text-xs text-theme-text">
              Accepted {suggestedSite.kind} site in this hex. Use the location controls
              below to attach an existing place or create a new one.
            </p>
          {/if}
        </div>
      {/if}

      {#key hexKey}
        {@const notesMapId = mapId}
        {@const notesHex = hex}
        <HexNotes
          notes={record?.notes ?? ""}
          aiNotes={record?.aiNotes ?? ""}
          onSaveNotes={async (text) => {
            await store.setNotes(notesMapId, notesHex, text);
            refresh();
          }}
          onSaveAiNotes={async (text) => {
            await store.setAiNotes(notesMapId, notesHex, text);
            refresh();
          }}
        />
      {/key}

      <HexContentsList
        {pins}
        {hex}
        {entities}
        onOpen={(entityId) => modalUIStore.openZenMode(entityId)}
        onAttach={attach}
        onCreate={createHere}
      />
    </div>

    <footer class="mt-4 border-t border-theme-border pt-3">
      <button
        type="button"
        onclick={toggleExplored}
        class="w-full rounded-lg border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-widest text-theme-text hover:border-theme-primary/40"
      >
        {explored ? "Mark unexplored" : "Mark explored"}
      </button>
    </footer>
  </section>
{/if}
