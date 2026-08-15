<script lang="ts">
  import type { RandomSource } from "random-source-engine";

  /**
   * The name and labels of a source, as text (issue 2258).
   *
   * Build has `SourceIdentityFields` for the same two things as inputs. Play
   * shows them because you still need to know which table you are rolling —
   * but a text field mid-session is an invitation to rename something by
   * accident, so here they are only readable.
   */
  let { source }: { source: RandomSource } = $props();
</script>

<div class="flex flex-col gap-1.5" data-testid="source-heading">
  <h2
    class="font-header text-lg font-bold tracking-wide text-theme-text"
    data-testid="source-name"
  >
    {source.name}
  </h2>

  {#if source.labels.length > 0}
    <div class="flex flex-wrap gap-1.5">
      {#each source.labels as label}
        <span
          class="rounded bg-theme-primary/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-theme-primary"
        >
          {label}
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  @reference "../../../app.css";
</style>
