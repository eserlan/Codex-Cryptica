<script lang="ts">
  import type { RegionProposal } from "hex-crawl-engine";

  /** What a regeneration would change, and a warning when explored hexes are involved. */
  let { proposal }: { proposal: RegionProposal } = $props();

  const total = $derived(Object.keys(proposal.hexes).length);
  const explored = $derived(proposal.exploredChanges.length);
</script>

<p class="mt-2 text-xs text-theme-muted">
  {proposal.changes.length} of {total} hexes would change. Hexes you set by hand are
  never replaced.
</p>
{#if explored > 0}
  <p
    role="alert"
    class="mt-2 rounded-lg border border-theme-secondary/50 p-2 text-xs text-theme-text"
  >
    {explored} explored {explored === 1 ? "hex" : "hexes"} would change terrain. Notes
    and exploration stay as they are.
  </p>
{/if}
