<script lang="ts">
  import type { ArtworkCueIndicator } from "#lib/services/adventure/artwork/artwork-cue-summary.js";

  let { summary }: { summary: ArtworkCueIndicator | null } = $props();

  function formatCueLine(cues: readonly string[], match: string | null) {
    const tagText = cues.length ? cues.join(", ") : "none";
    const matchText = match ?? "no matching image";
    return `${tagText} — ${matchText}`;
  }
</script>

{#if summary}
  <details
    class="rounded-md border border-theme-border bg-theme-surface px-3 py-1.5 text-xs text-theme-text"
    data-testid="adventure-artwork-cue-indicator"
  >
    <summary class="flex cursor-pointer items-center gap-1.5 select-none">
      <span class="icon-[lucide--tag] h-3.5 w-3.5 shrink-0" aria-hidden="true"
      ></span>
      <span>Artwork matching details</span>
    </summary>
    <div
      class="mt-1.5 space-y-1 border-t border-theme-border pt-1.5 text-theme-text"
    >
      <p><span class="font-medium">Genre:</span> {summary.genre}</p>
      {#if summary.place}
        <p>
          <span class="font-medium">Place ({summary.place.name}):</span>
          {formatCueLine(summary.place.cues, summary.place.match)}
        </p>
      {/if}
      {#each summary.npcs as npc (npc.name)}
        <p>
          <span class="font-medium">NPC ({npc.name}):</span>
          {formatCueLine(npc.cues, npc.match)}
        </p>
      {/each}
    </div>
  </details>
{/if}
