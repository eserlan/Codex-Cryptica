<script lang="ts">
  import { fade } from "svelte/transition";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import type { ProvenanceRecord, SessionEntity } from "generator-engine";
  import { renderGeneratorLore } from "$lib/components/seo/markdown-renderers";
  import ProvenanceBadge from "../ProvenanceBadge.svelte";

  let {
    generatedData,
    lore,
    variant,
    provenance,
    onSelectEntity,
  }: {
    generatedData: GeneratorOutput | null;
    lore: string;
    variant: "default" | "names";
    provenance: ProvenanceRecord | undefined;
    onSelectEntity: (entity: SessionEntity) => void;
  } = $props();
</script>

<!-- Mobile label — hidden on lg where the sticky card makes the context clear -->
<p
  class="lg:hidden text-micro font-bold uppercase tracking-widest font-header text-theme-muted mb-2"
>
  GM Reference
</p>
<div class="sticky top-24 flex flex-col gap-6">
  <div
    class="p-5 bg-theme-surface/50 border border-theme-border/50 rounded-2xl shadow-sm backdrop-blur-sm"
  >
    {#if generatedData}
      <div
        in:fade={{ duration: 250 }}
        class="seo-rail seo-md text-sm leading-relaxed text-theme-text/85 {variant ===
        'names'
          ? 'max-w-xl mx-auto columns-2 sm:columns-3 gap-8 py-4'
          : ''}"
      >
        {@html renderGeneratorLore(lore, variant)}
        {#if provenance}
          <ProvenanceBadge record={provenance} onSelect={onSelectEntity} />
        {/if}
      </div>
    {:else}
      <div
        class="flex flex-col items-center text-center text-theme-muted/40 py-8"
      >
        <span aria-hidden="true" class="icon-[lucide--scroll] w-8 h-8 mb-3"
        ></span>
        <p class="text-micro uppercase tracking-widest font-header">
          At the Table
        </p>
        <p class="text-sm mt-2 leading-relaxed">
          GM utility details appear here after generation.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .seo-md :global(h2) {
    font-family: var(--font-header);
    font-weight: 700;
    font-size: 1.125rem;
    margin: 1.5rem 0 0.75rem;
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-border) 40%, transparent);
    padding-bottom: 0.25rem;
  }
  /* Desaturated heading — primary actions keep saturated red (#1272) */
  .seo-md :global(h3) {
    font-family: var(--font-header);
    font-weight: 700;
    font-size: 1rem;
    margin: 1rem 0 0.5rem;
    color: color-mix(in srgb, var(--color-primary) 65%, var(--color-text));
  }
  .seo-md :global(ul) {
    list-style: disc;
    margin-left: 1rem;
  }
  .seo-md :global(p) {
    margin-bottom: 0.75rem;
  }
  .seo-md :global(.seo-label) {
    text-shadow: 0 0 10px
      color-mix(in srgb, var(--color-primary) 70%, transparent);
    filter: brightness(1.2);
  }
  /* Rail stat block — compact heading scale, muted palette (#1276) */
  .seo-rail.seo-md :global(.seo-label) {
    color: color-mix(in srgb, var(--color-primary) 42%, var(--color-text));
    text-shadow: none;
    filter: none;
  }
  .seo-rail.seo-md :global(h3) {
    font-size: var(--type-helper);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: color-mix(in srgb, var(--color-text) 82%, transparent);
    margin: 0.875rem 0 0.375rem;
    border-bottom: none;
  }
  .seo-rail.seo-md :global(h2) {
    font-size: 0.8125rem;
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-border) 30%, transparent);
    margin: 1rem 0 0.5rem;
    color: color-mix(in srgb, var(--color-text) 88%, transparent);
  }
  .seo-rail.seo-md :global(strong) {
    color: color-mix(in srgb, var(--color-text) 92%, transparent);
  }
</style>
