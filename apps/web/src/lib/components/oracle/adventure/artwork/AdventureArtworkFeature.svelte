<script lang="ts">
  import { onMount } from "svelte";
  import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
  import type {
    ArtworkPlaceEntity,
    ArtworkPlaceSession,
  } from "#lib/services/adventure/artwork/current-place-selection.js";
  import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
  import { artworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
  import { defaultArtworkCatalogue } from "#lib/services/adventure/artwork/default-artwork-catalogue.js";
  import { createDisplayService } from "#lib/services/adventure/artwork/create-display-service.js";
  import { summarizeArtworkCues } from "#lib/services/adventure/artwork/artwork-cue-summary.js";
  import AdventureCurrentArtwork from "./AdventureCurrentArtwork.svelte";
  import AdventureLocationControls from "./AdventureLocationControls.svelte";
  import AdventureNpcPortrait from "./AdventureNpcPortrait.svelte";
  import type { ArtworkCommand } from "@codex/adventure-artwork-engine";
  import type {
    ArtworkSubject,
    ArtworkControlContext,
    ArtworkMutationResult,
  } from "#lib/services/adventure/artwork/ports.js";

  let {
    session,
    entities,
    activeVaultId,
    resolve,
    readOnly,
    theme,
    mutate,
    portrait,
  }: {
    session: (ArtworkPlaceSession & { id: string; revision: number }) | null;
    entities: Readonly<Record<string, ArtworkPlaceEntity>>;
    activeVaultId: string | null | undefined;
    resolve: (path: string) => Promise<string | null | undefined>;
    readOnly: boolean;
    theme: string | undefined;
    mutate: (
      subject: ArtworkSubject,
      command: ArtworkCommand,
      context: ArtworkControlContext,
    ) => Promise<ArtworkMutationResult>;
    portrait?: {
      name: string;
      src: string | null | undefined;
      alt: string;
      aiLabel?: string;
      credits?: string;
      loadFull?: (
        signal: AbortSignal,
      ) => Promise<{ url: string; release: () => void } | null>;
    } | null;
  } = $props();
  let catalogue = $state<readonly ArtworkAsset[]>([]);
  let display = $state<ArtworkDisplayService>();
  let preferencesEnabled = $state(artworkPreferences.enabled);
  $effect(() => {
    preferencesEnabled = artworkPreferences.enabled;
    return artworkPreferences.subscribe((value) => {
      preferencesEnabled = value;
    });
  });
  onMount(() => {
    let active = true;
    let resources: ReturnType<typeof createDisplayService> | undefined;
    try {
      resources = createDisplayService(artworkPreferences);
      display = resources.display;
    } catch {
      /* Private Vault images still work. */
    }
    void defaultArtworkCatalogue.get().then((assets) => {
      if (active && assets) catalogue = assets;
    });
    return () => {
      active = false;
      resources?.destroy();
    };
  });
  const cueSummary = $derived(
    summarizeArtworkCues(
      session,
      activeVaultId,
      entities,
      preferencesEnabled,
      theme,
      catalogue,
    ),
  );
</script>

<AdventureCurrentArtwork
  {session}
  {entities}
  {activeVaultId}
  {resolve}
  preferences={artworkPreferences}
  {catalogue}
  {display}
  {theme}
/>
{#if portrait?.src}
  <AdventureNpcPortrait
    name={portrait.name}
    src={portrait.src}
    alt={portrait.alt}
    aiLabel={portrait.aiLabel}
    credits={portrait.credits}
    loadFull={portrait.loadFull}
  />
{/if}
{#if session?.vaultId === activeVaultId}
  <AdventureLocationControls
    {session}
    {catalogue}
    {readOnly}
    {theme}
    {mutate}
  />
{/if}
{#if cueSummary}
  <details
    class="mx-auto w-full max-w-xl rounded-md border border-theme-border bg-theme-surface px-3 py-1.5 text-xs text-theme-text"
    data-testid="adventure-artwork-cue-indicator"
  >
    <summary class="flex cursor-pointer items-center gap-1.5 select-none">
      <span class="icon-[lucide--tag] h-3.5 w-3.5 shrink-0" aria-hidden="true"
      ></span>
      <span class="truncate">
        Artwork tags ({cueSummary.genre}):
        {#if cueSummary.place}
          {cueSummary.place.cues.length
            ? cueSummary.place.cues.join(", ")
            : "no place tags"}
          ({cueSummary.place.match ?? "unmatched"})
        {/if}
        {#if cueSummary.npcs.length > 0}
          · {cueSummary.npcs.length} NPC{cueSummary.npcs.length === 1
            ? ""
            : "s"}
        {/if}
      </span>
    </summary>
    <div
      class="mt-1.5 space-y-1 border-t border-theme-border pt-1.5 text-theme-text"
    >
      {#if cueSummary.place}
        <p>
          <span class="font-medium">Place ({cueSummary.place.name}):</span>
          {cueSummary.place.cues.length
            ? cueSummary.place.cues.join(", ")
            : "none"}
          —
          <span>{cueSummary.place.match ?? "no matching image"}</span>
        </p>
      {/if}
      {#each cueSummary.npcs as npc (npc.name)}
        <p>
          <span class="font-medium">NPC ({npc.name}):</span>
          {npc.cues.length ? npc.cues.join(", ") : "none"} —
          <span>{npc.match ?? "no matching image"}</span>
        </p>
      {/each}
    </div>
  </details>
{/if}
