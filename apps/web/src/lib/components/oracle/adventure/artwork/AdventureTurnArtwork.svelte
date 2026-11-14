<script lang="ts">
  import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
  import type { NpcPortraitSelection } from "#lib/services/adventure/artwork/npc-portrait-selection.js";
  import type {
    TurnArtworkReveal,
    TurnNpcReveal,
  } from "#lib/services/adventure/artwork/turn-artwork-reveals.js";
  import AdventureInlineNpcPortrait from "./AdventureInlineNpcPortrait.svelte";
  import AdventureSceneArtwork from "./AdventureSceneArtwork.svelte";
  import AdventureTurnArtworkCallout from "./AdventureTurnArtworkCallout.svelte";

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

  type ArtworkSelection =
    | NonNullable<TurnArtworkReveal["location"]>["selection"]
    | NpcPortraitSelection;

  function makeLoader(
    selection: ArtworkSelection,
    variant: "preview" | "display",
  ) {
    return async (signal: AbortSignal) => {
      if (selection.kind === "catalogue") {
        return display.load(selection.asset, signal, variant);
      }
      const url = await resolve(selection.image);
      return url ? { url, release: noop } : null;
    };
  }

  function locationProps(loc: NonNullable<TurnArtworkReveal["location"]>) {
    const isCat = loc.selection.kind === "catalogue";
    return {
      subjectKey: loc.selection.subjectKey,
      title: loc.name,
      alt: loc.selection.alt,
      credit:
        loc.selection.kind === "catalogue"
          ? loc.selection.asset.provenance.attribution
          : undefined,
      load: makeLoader(loc.selection, "preview"),
      loadFull: isCat ? makeLoader(loc.selection, "display") : undefined,
    };
  }

  function npcProps(npc: TurnNpcReveal) {
    const sel = npc.selection;
    const isCat = sel.kind === "catalogue";
    return {
      name: sel.name,
      alt: sel.alt,
      aiLabel: isCat ? sel.aiLabel : undefined,
      credits: isCat ? sel.credits : undefined,
      load: makeLoader(sel, "preview"),
      loadFull: isCat ? makeLoader(sel, "display") : undefined,
    };
  }

  const hasArtwork = $derived(
    Boolean(reveal.location) || reveal.npcs.length > 0,
  );
</script>

{#snippet locationCard(loc: NonNullable<TurnArtworkReveal["location"]>)}
  {@const scene = locationProps(loc)}
  <div class="space-y-1">
    <p class="text-xs font-medium text-theme-text">
      {loc.name}
    </p>
    <div class="max-w-md">
      {#key scene.subjectKey}
        <AdventureSceneArtwork {...scene} />
      {/key}
    </div>
  </div>
{/snippet}

{#snippet locationCallout(loc: NonNullable<TurnArtworkReveal["location"]>)}
  {@const scene = locationProps(loc)}
  {#key scene.subjectKey}
    <AdventureTurnArtworkCallout
      kind="location"
      name={loc.name}
      alt={scene.alt}
      title={scene.title}
      subtitle={`AI illustration${scene.credit ? ` · ${scene.credit}` : ""}`}
      preview={scene.load}
      loadFull={scene.loadFull}
    />
  {/key}
{/snippet}

{#snippet npcCallout(npc: TurnNpcReveal)}
  {@const props = npcProps(npc)}
  <AdventureTurnArtworkCallout
    kind="npc"
    name={props.name}
    alt={props.alt}
    title={props.name}
    subtitle={[props.aiLabel, props.credits]
      .filter((part) => Boolean(part))
      .join(" · ") || undefined}
    cue={npc.reason === "entered" ? "enters" : "returns"}
    preview={props.load}
    loadFull={props.loadFull}
  />
{/snippet}

{#if hasArtwork}
  <div
    class="space-y-2.5 pt-1 @4xl:hidden"
    data-testid="adventure-turn-artwork"
  >
    {#if reveal.location}
      {@render locationCard(reveal.location)}
    {/if}
    {#if reveal.npcs.length > 0}
      <div class="flex flex-wrap gap-2">
        {#each reveal.npcs as npc (npc.id)}
          <AdventureInlineNpcPortrait {...npcProps(npc)} />
        {/each}
      </div>
    {/if}
  </div>
  <div
    class="hidden flex-wrap items-center gap-2 pt-1 @4xl:flex"
    data-testid="adventure-turn-artwork-compact"
  >
    {#if reveal.location}
      {@render locationCallout(reveal.location)}
    {/if}
    {#each reveal.npcs as npc (npc.id)}
      {@render npcCallout(npc)}
    {/each}
  </div>
{/if}
