<script lang="ts">
  import { base } from "$app/paths";
  import { RA_SERIES } from "$lib/content/responsible-ai-series";

  let { currentSlug }: { currentSlug: string } = $props();
</script>

<aside
  class="mt-16 p-6 rounded-xl border border-theme-border/60 bg-theme-surface/20"
  aria-label="Responsible AI series navigation"
>
  <p
    class="text-[10px] font-mono text-theme-muted uppercase tracking-widest mb-4"
  >
    Part of the Codex Cryptica Responsible AI Series
  </p>
  <ol class="space-y-2">
    {#each RA_SERIES as article, i}
      <li class="flex items-start gap-3">
        <span
          class="text-[10px] font-mono text-theme-muted mt-0.5 w-4 shrink-0 text-right"
          >{i + 1}.</span
        >
        {#if article.slug === currentSlug}
          <span
            class="text-sm font-bold text-theme-primary leading-snug"
            aria-current="page"
          >
            {article.title}
            <span
              class="ml-1.5 text-[10px] font-mono text-theme-muted normal-case tracking-normal"
              >(this article)</span
            >
          </span>
        {:else}
          <a
            href="{base}/blog/{article.slug}"
            class="text-sm text-theme-text hover:text-theme-primary transition-colors leading-snug"
          >
            {article.title}
          </a>
        {/if}
      </li>
    {/each}
  </ol>
</aside>
