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
    } | null;
  } = $props();
  let catalogue = $state<readonly ArtworkAsset[]>([]);
  let display = $state<ArtworkDisplayService>();
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
</script>

<AdventureCurrentArtwork
  {session}
  {entities}
  {activeVaultId}
  {resolve}
  preferences={artworkPreferences}
  {catalogue}
  {display}
/>
{#if portrait?.src}
  <AdventureNpcPortrait
    name={portrait.name}
    src={portrait.src}
    alt={portrait.alt}
    aiLabel={portrait.aiLabel}
    credits={portrait.credits}
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
