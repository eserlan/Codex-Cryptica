<script lang="ts">
  import { onMount } from "svelte";
  import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
  import { artworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
  import { createDisplayService } from "#lib/services/adventure/artwork/create-display-service.js";
  import { defaultArtworkCatalogue } from "#lib/services/adventure/artwork/default-artwork-catalogue.js";
  import { computeTurnArtworkReveals } from "#lib/services/adventure/artwork/turn-artwork-reveals.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { featureFlags } from "#lib/stores/feature-flags.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import AdventureTurnArtwork from "./artwork/AdventureTurnArtwork.svelte";
  import AdventureNarrativeTurn from "./AdventureNarrativeTurn.svelte";
  import AdventureOocTurn from "./AdventureOocTurn.svelte";

  let { manager }: { manager: AdventureManager } = $props();

  let preferencesEnabled = $state(artworkPreferences.enabled);
  $effect(() => {
    preferencesEnabled = artworkPreferences.enabled;
    return artworkPreferences.subscribe((value) => {
      preferencesEnabled = value;
    });
  });

  const artworkEnabled = $derived(
    featureFlags.isEnabled("adventureArtwork") && preferencesEnabled,
  );
  let artworkDisplay = $state.raw<ArtworkDisplayService | null>(null);
  $effect(() => {
    if (!artworkEnabled) {
      artworkDisplay = null;
      return;
    }
    let resources: ReturnType<typeof createDisplayService> | undefined;
    try {
      resources = createDisplayService(artworkPreferences);
      artworkDisplay = resources.display;
    } catch {
      artworkDisplay = null;
    }
    return () => {
      resources?.destroy();
      artworkDisplay = null;
    };
  });
  let catalogue = $state<readonly ArtworkAsset[]>(
    defaultArtworkCatalogue.peek() ?? [],
  );
  $effect(() => {
    if (!artworkEnabled || catalogue.length > 0) return;
    let cancelled = false;
    void defaultArtworkCatalogue
      .get()
      .then((assets) => {
        if (!cancelled && assets) catalogue = assets;
      })
      .catch(() => {
        // Optional artwork catalogue; skip silently if unavailable.
      });
    return () => {
      cancelled = true;
    };
  });
  const turnReveals = $derived(
    artworkEnabled
      ? computeTurnArtworkReveals({
          session: manager.session,
          activeVaultId: vault.activeVaultId,
          entities: vault.entities,
          enabled: artworkEnabled,
          theme: themeStore.worldThemeId,
          catalogue,
        })
      : new Map(),
  );

  const generationMessages = [
    "The Oracle traces the threads of consequence…",
    "Fate gathers around your choice…",
    "The world shifts in answer to your action…",
    "The next turn of the tale is taking shape…",
  ];
  let generationMessageIndex = $state(0);
  let generationMessage = $derived(generationMessages[generationMessageIndex]!);

  onMount(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      generationMessageIndex =
        (generationMessageIndex + 1) % generationMessages.length;
    }, 2_800);
    return () => window.clearInterval(interval);
  });

  function rollFor(sequence: number) {
    return manager.rollHistory.find((entry) => entry.turn.sequence === sequence)
      ?.resolvedRoll;
  }

  let oocExchanges = $derived(
    manager.oocExchanges ?? manager.session?.oocExchanges ?? [],
  );

  function oocForTurnCount(turnCount: number, isLatestSlot: boolean) {
    return oocExchanges.filter((exchange) =>
      isLatestSlot
        ? exchange.afterTurnCount >= turnCount
        : exchange.afterTurnCount === turnCount,
    );
  }
</script>

{#snippet committedTurnBlock(
  turn: NonNullable<AdventureManager["transcript"]>["turns"][number],
  index: number,
  totalTurns: number,
)}
  {@const reveal = turnReveals.get(turn.sequence)}
  {@const turnCountAfter = index + 1}
  {@const isLastTurn = index === totalTurns - 1}
  <div class="space-y-3">
    <AdventureNarrativeTurn {turn} roll={rollFor(turn.sequence)} />
    {#if reveal && artworkDisplay}
      <AdventureTurnArtwork
        {reveal}
        display={artworkDisplay}
        resolve={(path) => vault.resolveImageUrl(path)}
      />
    {/if}
    {#each oocForTurnCount(turnCountAfter, isLastTurn) as exchange (exchange.id)}
      <AdventureOocTurn {exchange} {manager} />
    {/each}
  </div>
{/snippet}

<div
  class="space-y-5"
  aria-live="polite"
  aria-label="Adventure transcript"
  data-testid="adventure-narrative"
>
  {#each oocForTurnCount(0, (manager.transcript?.turns.length ?? 0) === 0) as exchange (exchange.id)}
    <AdventureOocTurn {exchange} {manager} />
  {/each}
  {#if manager.transcript}
    {#each manager.transcript.turns as turn, index (turn.sequence)}
      {@render committedTurnBlock(turn, index, manager.transcript.turns.length)}
    {/each}
  {/if}
  {#if manager.phase === "generating" && manager.streamedNarration}
    <!-- Same component as a committed turn, so committing swaps content in
         place instead of re-flowing the page (type size, "You" bubble). -->
    <span class="sr-only">Oracle is writing…</span>
    <AdventureNarrativeTurn
      testId="adventure-stream-preview"
      turn={{
        playerAction:
          manager.session?.pendingRoll?.playerAction ?? manager.draft ?? "",
        narration: manager.streamedNarration,
      }}
    />
  {:else if manager.phase === "generating"}
    <div
      class="flex items-center gap-2 text-sm text-theme-text"
      role="status"
      aria-live="off"
      data-testid="adventure-generating-status"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--sparkles] h-4 w-4 motion-safe:animate-pulse"
      ></span>
      <span>{generationMessage}</span>
    </div>
  {/if}
</div>
