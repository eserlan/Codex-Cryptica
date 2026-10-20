<script lang="ts">
  /** The live notice and warnings under a refine panel, shared by the part-by-part panels. */
  let {
    notice = null,
    warnings = [],
  }: { notice?: string | null; warnings?: string[] } = $props();
</script>

<div aria-live="polite">
  {#if notice}
    <p class="mt-3 text-micro text-theme-muted">{notice}</p>
  {/if}
  {#if warnings.length}
    <ul class="mt-2 list-disc pl-4 text-micro text-theme-accent">
      {#each warnings as warning (warning)}
        <li>{warning}</li>
      {/each}
    </ul>
  {/if}
</div>
