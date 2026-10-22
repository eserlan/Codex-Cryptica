<script lang="ts">
  import type { BiomeSource } from "biome-engine";

  let { biomeId, sources }: { biomeId: string; sources: BiomeSource[] } =
    $props();
</script>

<section aria-labelledby="biome-{biomeId}-sources" class="text-sm">
  <h3
    id="biome-{biomeId}-sources"
    class="mb-2 font-header text-lg text-theme-text"
  >
    Sources
  </h3>
  <ol
    aria-label="Sources"
    class="m-0 flex flex-col gap-1 pl-5 text-theme-muted"
  >
    {#each sources as source (source.id)}
      <li id="{biomeId}-source-{source.id}">
        {#if source.url}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-theme-primary hover:underline">{source.title}</a
          >
        {:else}
          {source.title}
        {/if}
        {#if source.author}<span> · {source.author}</span>{/if}
        {#if source.year}<span> ({source.year})</span>{/if}
      </li>
    {/each}
  </ol>
</section>
