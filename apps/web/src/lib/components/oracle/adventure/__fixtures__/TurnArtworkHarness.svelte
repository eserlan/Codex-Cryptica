<script lang="ts">
  import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
  import type { TurnArtworkReveal } from "#lib/services/adventure/artwork/turn-artwork-reveals.js";
  import {
    AdventureLightboxController,
    setAdventureLightbox,
  } from "../artwork/adventure-artwork-lightbox.svelte.js";
  import AdventureTurnArtwork from "../artwork/AdventureTurnArtwork.svelte";

  let {
    reveal,
    display,
    resolve,
    onController,
  }: {
    reveal: TurnArtworkReveal;
    display: ArtworkDisplayService;
    resolve: (path: string) => Promise<string | undefined> | string | undefined;
    onController: (controller: AdventureLightboxController) => void;
  } = $props();

  const controller = setAdventureLightbox(new AdventureLightboxController());
  $effect(() => onController(controller));
</script>

<AdventureTurnArtwork {reveal} {display} {resolve} />
