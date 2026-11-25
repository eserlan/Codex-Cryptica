<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import type { GeneratorGuide } from "./generator-page-guides";

  const cleanBase = basePath();

  let {
    introTitle,
    guide,
  }: {
    introTitle: string;
    guide?: GeneratorGuide;
  } = $props();
</script>

{#if guide}
  <section class="border-t border-theme-border/60 px-6 py-12">
    <div class="max-w-4xl mx-auto">
      <h2
        class="font-header font-bold text-xl uppercase tracking-wider text-theme-primary mb-3"
      >
        How to use the {introTitle}
      </h2>
      <p class="text-sm sm:text-base text-theme-text leading-relaxed mb-6">
        {guide.summary}
      </p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each guide.tips as tip (tip.title)}
          <article
            class="border border-theme-border/50 bg-theme-surface/20 rounded-xl p-4"
          >
            <h3 class="font-header font-bold text-sm text-theme-text mb-1.5">
              {tip.title}
            </h3>
            <p class="text-xs sm:text-sm text-theme-text leading-relaxed">
              {tip.detail}
            </p>
          </article>
        {/each}
      </div>
      {#if guide.links && guide.links.length > 0}
        <div class="mt-5 flex flex-wrap items-center gap-3">
          <span
            class="text-xs font-bold uppercase tracking-wider text-theme-text"
          >
            Further reading:
          </span>
          {#each guide.links as link (link.href)}
            <a
              href="{cleanBase}{link.href}"
              class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold text-theme-text underline decoration-theme-primary underline-offset-4 hover:bg-theme-primary/15 transition-colors"
            >
              <span>{link.label}</span>
              <span
                class="icon-[lucide--arrow-right] w-3.5 h-3.5"
                aria-hidden="true"
              ></span>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}
