<script lang="ts">
  import { base } from "$app/paths";

  let { currentSlug }: { currentSlug: string } = $props();

  const series = [
    {
      slug: "lore-oracle-not-the-author",
      title: "The Lore Oracle Is Not the Author",
    },
    {
      slug: "worldbuilding-tool-without-ai",
      title: "A Worldbuilding Tool Should Still Work Without AI",
    },
    {
      slug: "worldbuilding-ai-needs-your-lore",
      title: "Why Worldbuilding AI Should Know Your Lore Before It Speaks",
    },
    { slug: "drafts-are-not-canon", title: "Drafts Are Not Canon" },
    {
      slug: "ai-campaign-prep-without-losing-your-voice",
      title: "Six Ways to Use AI in Campaign Prep Without Losing Your Voice",
    },
    {
      slug: "ai-slop-is-context-failure",
      title: "AI Slop Happens When the Tool Has No Memory",
    },
    {
      slug: "revising-your-lore-with-the-oracle",
      title: "Revising Your Lore with the Oracle",
    },
  ];
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
    {#each series as article, i}
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
