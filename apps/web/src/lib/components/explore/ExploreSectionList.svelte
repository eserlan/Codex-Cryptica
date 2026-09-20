<script lang="ts">
  import ExploreLinkCard from "./ExploreLinkCard.svelte";
  import type { ExploreSection } from "./explore-sections";

  let {
    sections,
    cleanBase,
  }: {
    sections: ExploreSection[];
    cleanBase: string;
  } = $props();
</script>

{#each sections as section}
  <section class="mb-14">
    <div class="mb-6 border-b border-theme-border/60 pb-3">
      <h2 class="font-header text-xl font-bold text-theme-text sm:text-2xl">
        {section.title}
      </h2>
      {#if section.description}
        <p class="mt-1 font-light text-sm text-theme-muted">
          {section.description}
        </p>
      {/if}
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      {#each section.links as link}
        <ExploreLinkCard {link} {cleanBase} />
      {/each}
    </div>
  </section>
{/each}
