<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import type { LandingPageConfig } from "#lib/content/for/schema.js";
  const cleanBase = basePath();
  let { pages }: { pages: LandingPageConfig[] } = $props();
  // ui-check-ignore: Preserve existing hub styles during behaviour-neutral extraction.
  const introClass = "text-base text-theme-muted leading-relaxed mb-6";
  // ui-check-ignore: Preserve existing hub styles during behaviour-neutral extraction.
  const summaryClass = "block text-sm text-theme-muted leading-relaxed";
</script>

{#if pages.length > 0}
  <section class="mt-14 border-t border-theme-border/60 pt-10">
    <h2 class="font-header text-xl font-bold mb-2">
      Campaign guides for these worlds
    </h2>
    <p class={introClass}>
      How Codex Cryptica handles the systems, genres and campaign styles these
      generators are built for.
    </p>
    <ul class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each pages as page (page.slug)}
        <li>
          <a
            href="{cleanBase}/for/{page.slug}"
            class="group flex h-full items-start justify-between gap-4 rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
          >
            <span>
              <span
                class="block font-header text-base font-bold text-theme-text mb-2 group-hover:text-theme-primary transition-colors"
              >
                {page.hero.title}
              </span>
              <span class={summaryClass}>
                {page.hero.tagline}
              </span>
            </span>
            <span
              class="icon-[lucide--arrow-right] h-4 w-4 shrink-0 mt-0.5 text-theme-primary transition-transform group-hover:translate-x-1"
            ></span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}
