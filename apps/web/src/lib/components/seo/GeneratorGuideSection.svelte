<script lang="ts">
  import GeneratorGuideLinks from "./GeneratorGuideLinks.svelte";
  import type { GeneratorGuide } from "./generator-page-guides";

  let {
    introTitle,
    guide,
  }: {
    introTitle: string;
    guide?: GeneratorGuide;
  } = $props();
</script>

{#if guide}
  <section
    class="border-t border-theme-border/60 px-6 py-12"
    style="content-visibility: auto; contain-intrinsic-size: auto 360px;"
  >
    <div class="max-w-4xl mx-auto">
      <h2
        class="font-header font-bold text-xl uppercase tracking-wider text-theme-primary mb-3"
      >
        How to use the {introTitle}
      </h2>
      <p class="text-lg md:text-base text-theme-text leading-relaxed mb-6">
        {guide.summary}
      </p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each guide.tips as tip (tip.title)}
          <article
            class="border border-theme-border/50 bg-theme-surface/20 rounded-xl p-4"
          >
            <h3
              class="font-header font-bold text-xl md:text-lg leading-snug uppercase tracking-wide text-theme-text mb-2.5 pb-2 border-b border-theme-primary/40"
            >
              {tip.title}
            </h3>
            <p class="text-lg md:text-base text-theme-text leading-relaxed">
              {tip.detail}
            </p>
          </article>
        {/each}
      </div>
      {#if guide.links && guide.links.length > 0}
        <GeneratorGuideLinks
          linksTitle={guide.linksTitle}
          links={guide.links}
        />
      {/if}
    </div>
  </section>
{/if}
