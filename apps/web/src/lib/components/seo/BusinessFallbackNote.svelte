<script lang="ts">
  import {
    businessSectionLabel,
    type BusinessSectionId,
  } from "generator-engine";

  let {
    fallbackSections = [],
    warnings = [],
  }: { fallbackSections: BusinessSectionId[]; warnings?: string[] } = $props();

  const labels = $derived([
    ...new Set(fallbackSections.map((s) => businessSectionLabel(s))),
  ]);
</script>

{#if labels.length > 0 || warnings.length > 0}
  <div
    role="status"
    class="flex flex-col gap-1 text-micro text-theme-muted leading-relaxed"
  >
    {#if labels.length > 0}
      <p>
        Some parts were written from the tables because the AI reply was not
        usable: {labels.join(", ")}. You can rewrite any of them below.
      </p>
    {/if}
    {#if warnings.length > 0}
      <p>
        These names appear in the text without being introduced (some may be
        places): {warnings.join(", ")}. Check them before you save, or rewrite
        the part that uses them.
      </p>
    {/if}
  </div>
{/if}
