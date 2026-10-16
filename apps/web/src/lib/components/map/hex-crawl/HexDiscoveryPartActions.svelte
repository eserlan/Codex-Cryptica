<script lang="ts">
  /**
   * The save actions for one discovery part (the review card's Save, Link,
   * Create and Add to AI notes buttons). Each calls the matching control.
   */
  import type { DiscoveryPartId } from "hex-crawl-engine";
  import type { HexDiscoveryControls, NotePartId } from "./discovery-controls";

  let {
    partId,
    controls,
    proposedLink,
    factionName,
    factionMatch,
    linkTicked = $bindable(true),
  }: {
    partId: DiscoveryPartId;
    controls: HexDiscoveryControls;
    proposedLink: { entityId: string; title: string } | null;
    factionName: string | undefined;
    factionMatch: { id: string; title: string } | null;
    linkTicked?: boolean;
  } = $props();

  const linked = $derived(proposedLink !== null && linkTicked);
  const chip =
    "rounded-lg border border-theme-border px-2.5 py-1 text-micro font-bold uppercase tracking-widest text-theme-text hover:border-theme-primary/40";
</script>

{#if partId === "landmark"}
  {#if proposedLink}
    <label class="flex items-center gap-1.5 text-micro text-theme-muted">
      <input
        type="checkbox"
        class="h-4 w-4 accent-theme-primary"
        bind:checked={linkTicked}
      />
      Link to {proposedLink.title}
    </label>
  {/if}
  <button
    type="button"
    onclick={() =>
      void controls.saveEntityPart("landmark", { linkTicked: linked })}
    class="rounded-lg bg-theme-primary px-2.5 py-1 text-micro font-bold uppercase tracking-widest text-theme-bg"
  >
    Save as location
  </button>
{:else if partId === "encounter"}
  {#each ["event", "note"] as const as kind (kind)}
    <button
      type="button"
      onclick={() =>
        void controls.saveEntityPart("encounter", {
          encounterType: kind,
          linkTicked: linked,
        })}
      class={chip}
    >
      Save as {kind}
    </button>
  {/each}
{:else if partId === "factionPresence"}
  {#if factionName}
    {#if factionMatch}
      <button
        type="button"
        onclick={() =>
          void controls.saveFactionPart({ createIfMissing: false })}
        class={chip}
      >
        Link {factionMatch.title}
      </button>
    {:else}
      <button
        type="button"
        onclick={() => void controls.saveFactionPart({ createIfMissing: true })}
        class={chip}
      >
        Create faction {factionName}
      </button>
    {/if}
  {/if}
{:else}
  <button
    type="button"
    onclick={() => void controls.saveNotePart(partId as NotePartId)}
    class={chip}
  >
    Add to AI notes
  </button>
{/if}
