<script lang="ts">
  import {
    businessSectionLabel,
    type BusinessSectionId,
  } from "generator-engine";

  let { fallbackSections = [] }: { fallbackSections: BusinessSectionId[] } =
    $props();

  const labels = $derived([
    ...new Set(fallbackSections.map((s) => businessSectionLabel(s))),
  ]);
</script>

{#if labels.length > 0}
  <p role="status" class="text-micro text-theme-muted leading-relaxed">
    Some parts were written from the tables because the AI reply was not usable:
    {labels.join(", ")}. You can rewrite any of them below.
  </p>
{/if}
