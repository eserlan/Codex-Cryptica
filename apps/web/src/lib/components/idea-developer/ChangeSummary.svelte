<script lang="ts">
  import {
    DEVELOPMENT_SECTION_TITLES as titles,
    type ComparedSection,
  } from "generator-engine";

  let {
    whatChanged,
    changed,
  }: {
    /** The model's own one-line note. Shown as written, never relied on. */
    whatChanged?: string;
    /** Sections this turn changed; null when there is nothing to compare. */
    changed: ComparedSection[] | null;
  } = $props();

  const sectionsLine = $derived(
    changed && changed.length > 0
      ? `Sections updated: ${changed.map((key) => titles[key]).join(", ")}.`
      : "No sections changed.",
  );
</script>

{#if whatChanged || changed}
  <div
    class="rounded-lg border border-theme-primary/30 bg-theme-primary/10 px-3 py-2 text-lg sm:text-base text-theme-text"
  >
    {#if whatChanged}
      <p>
        <span class="font-bold">What changed:</span>
        {whatChanged}
      </p>
    {/if}
    {#if changed}
      <p class="mt-1 text-theme-muted">{sectionsLine}</p>
    {/if}
  </div>
{/if}
