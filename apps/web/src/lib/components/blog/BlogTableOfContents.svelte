<script lang="ts">
  import type { TocHeading } from "./blog-toc";

  let {
    headings = [],
  }: {
    headings: TocHeading[];
  } = $props();
</script>

{#if headings.length >= 2}
  <nav
    class="rounded-xl border border-theme-border/60 bg-theme-surface/30 p-5 text-xs backdrop-blur-sm"
    aria-label="Table of contents"
    data-testid="blog-toc"
  >
    <p
      class="font-mono text-micro uppercase tracking-widest text-theme-text mb-3 flex items-center gap-2"
    >
      <span
        class="icon-[lucide--list] h-3.5 w-3.5 text-theme-primary"
        aria-hidden="true"
      ></span>
      Contents
    </p>
    <ul class="space-y-1.5 list-none font-sans">
      {#each headings as heading (heading.id)}
        <li class={heading.level === 3 ? "pl-3 text-xs" : "font-medium"}>
          <a
            href="#{heading.id}"
            class="text-theme-text hover:text-theme-primary transition-colors block py-0.5 leading-snug"
          >
            {heading.text}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}
