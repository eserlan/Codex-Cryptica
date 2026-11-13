<script lang="ts">
  import {
    currentPlaceSelection,
    type ArtworkPlaceEntity,
    type ArtworkPlaceSession,
  } from "#lib/services/adventure/artwork/current-place-selection.js";
  import type { ArtworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
  import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
  import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
  import AdventureSceneArtwork from "./AdventureSceneArtwork.svelte";

  let {
    session,
    entities,
    activeVaultId,
    preferences,
    resolve,
    catalogue = [],
    display,
  }: {
    session: ArtworkPlaceSession | null;
    entities: Readonly<Record<string, ArtworkPlaceEntity>>;
    activeVaultId: string | null | undefined;
    preferences: ArtworkPreferences;
    resolve: (path: string) => Promise<string | null | undefined>;
    catalogue?: readonly ArtworkAsset[];
    display?: Pick<ArtworkDisplayService, "load">;
  } = $props();
  let enabled = $state(false);
  $effect(() => {
    enabled = preferences.enabled;
    return preferences.subscribe((value) => {
      enabled = value;
    });
  });
  const selected = $derived(
    currentPlaceSelection(session, activeVaultId, entities, enabled, catalogue),
  );

  async function load(path: string, signal: AbortSignal) {
    const url = await resolve(path);
    return signal.aborted || !url ? null : { url, release: () => {} };
  }
</script>

{#if selected?.kind === "catalogue" && display}
  {#key `${session?.vaultId}:${selected.subjectKey}:${selected.asset.id}:${selected.asset.variants.display.sha256}`}
    <AdventureSceneArtwork
      subjectKey={selected.subjectKey}
      alt={selected.alt}
      credit={selected.asset.provenance.attribution}
      load={(signal) => display.load(selected.asset, signal)}
    />
  {/key}
{:else if selected && selected.kind !== "catalogue"}
  {#key `${session?.vaultId}:${selected.subjectKey}:${selected.image}`}
    <AdventureSceneArtwork
      subjectKey={selected.subjectKey}
      alt={selected.alt}
      credit=""
      aiIllustration={false}
      load={(signal) => load(selected.image, signal)}
    />
  {/key}
{/if}
