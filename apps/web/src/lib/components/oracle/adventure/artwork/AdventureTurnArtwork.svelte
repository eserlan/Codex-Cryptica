<script lang="ts">
  import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
  import type { NpcPortraitSelection } from "#lib/services/adventure/artwork/npc-portrait-selection.js";
  import type { TurnArtworkReveal } from "#lib/services/adventure/artwork/turn-artwork-reveals.js";
  import AdventureInlineNpcPortrait from "./AdventureInlineNpcPortrait.svelte";
  import AdventureSceneArtwork from "./AdventureSceneArtwork.svelte";

  let {
    reveal,
    display,
    resolve,
  }: {
    reveal: TurnArtworkReveal;
    display: ArtworkDisplayService;
    resolve: (path: string) => Promise<string | undefined> | string | undefined;
  } = $props();

  const noop = () => {};

  function loadLocation(
    selection: NonNullable<TurnArtworkReveal["location"]>["selection"],
    variant: "preview" | "display" = "preview",
  ) {
    return async (signal: AbortSignal) => {
      if (selection.kind === "catalogue") {
        return display.load(selection.asset, signal, variant);
      }
      const url = await resolve(selection.image);
      return url ? { url, release: noop } : null;
    };
  }

  function loadNpc(
    selection: NpcPortraitSelection,
    variant: "preview" | "display" = "preview",
  ) {
    return async (signal: AbortSignal) => {
      if (selection.kind === "catalogue") {
        return display.load(selection.asset, signal, variant);
      }
      const url = await resolve(selection.image);
      return url ? { url, release: noop } : null;
    };
  }
</script>

<div class="space-y-2.5 pt-1" data-testid="adventure-turn-artwork">
  {#if reveal.location}
    {@const loc = reveal.location}
    <div class="space-y-1">
      <p class="text-xs font-medium text-theme-text">
        {loc.name}
      </p>
      <div class="max-w-md">
        {#key loc.selection.subjectKey}
          <AdventureSceneArtwork
            subjectKey={loc.selection.subjectKey}
            title={loc.name}
            alt={loc.selection.alt}
            credit={loc.selection.kind === "catalogue"
              ? loc.selection.asset.provenance.attribution
              : undefined}
            load={loadLocation(loc.selection, "preview")}
            loadFull={loc.selection.kind === "catalogue"
              ? loadLocation(loc.selection, "display")
              : undefined}
          />
        {/key}
      </div>
    </div>
  {/if}
  {#if reveal.npcs.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each reveal.npcs as npc (npc.id)}
        <AdventureInlineNpcPortrait
          name={npc.selection.name}
          alt={npc.selection.alt}
          aiLabel={npc.selection.kind === "catalogue"
            ? npc.selection.aiLabel
            : undefined}
          credits={npc.selection.kind === "catalogue"
            ? npc.selection.credits
            : undefined}
          load={loadNpc(npc.selection, "preview")}
          loadFull={npc.selection.kind === "catalogue"
            ? loadNpc(npc.selection, "display")
            : undefined}
        />
      {/each}
    </div>
  {/if}
</div>
