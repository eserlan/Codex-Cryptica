<script lang="ts">
  import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
  import {
    currentPlaceSelection,
    type ArtworkPlaceSession,
  } from "#lib/services/adventure/artwork/current-place-selection.js";
  import { LocationArtworkControls } from "#lib/services/adventure/artwork/location-artwork-controls.js";
  import type { ArtworkCommand } from "@codex/adventure-artwork-engine";
  import type {
    ArtworkSubject,
    ArtworkMutationResult,
    ArtworkControlContext,
  } from "#lib/services/adventure/artwork/ports.js";
  import ArtworkChooser from "./ArtworkChooser.svelte";
  let {
    session,
    catalogue,
    theme,
    readOnly,
    mutate,
  }: {
    session: (ArtworkPlaceSession & { id: string; revision: number }) | null;
    catalogue: readonly ArtworkAsset[];
    theme: string | undefined;
    readOnly: boolean;
    mutate: (
      subject: ArtworkSubject,
      command: ArtworkCommand,
      context: ArtworkControlContext,
    ) => Promise<ArtworkMutationResult>;
  } = $props();
  const controls = new LocationArtworkControls({
    session: () => session,
    catalogue: () => catalogue,
    theme: () => theme,
    mutate: (...args) => mutate(...args),
  });
  const place = $derived(
    session?.places?.find((item) => item.id === session?.currentPlaceId),
  );
  const options = $derived(
    controls.options().map((asset) => ({
      id: asset.id,
      label: asset.alt,
      credit: asset.provenance.attribution,
    })),
  );
  const selected = $derived(
    currentPlaceSelection(session, session?.vaultId, {}, true, catalogue),
  );
</script>

{#if place && !place.sourceRecordId}
  <ArtworkChooser
    {options}
    {readOnly}
    choose={(id) => controls.choose(id)}
    keep={() =>
      selected?.kind === "catalogue"
        ? controls.keep(selected.asset.id)
        : Promise.resolve(false)}
    dismiss={() => controls.dismiss()}
    restore={() => controls.restore()}
  />
{/if}
