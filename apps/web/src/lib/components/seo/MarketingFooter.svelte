<script lang="ts">
  import { base } from "$app/paths";
  import { PATREON_URL } from "$lib/config";
  const cleanBase = base === "/" ? "" : base;

  let {
    extraLinks = [],
  }: {
    /** Page-specific links rendered before the standard set (Terms, Privacy, Explore). */
    extraLinks?: { href: string; label: string }[];
  } = $props();
</script>

<!--
  Deliberately minimal (#2760): everything that isn't a legal requirement or
  the single onward-navigation link lives on /explore instead, which is built
  to carry that weight. Discord, GitHub, Reddit, and Sitemap/LLM Docs moved
  into /explore's "Community & Legal" section; the Groupfinder badge moved to
  /explore too, as its own element below that section. Patreon gets a
  symbol-only link here rather than a full move, since supporting the project
  is a lower-friction ask than the other links.
-->
<!-- chrome-shield: see app.css and #2578. -->
<footer
  class="chrome-shield border-t border-theme-border/60 bg-theme-surface/20 px-6 py-4 mt-auto text-center text-[10px] text-theme-muted tracking-wider uppercase font-header"
>
  <div
    class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"
  >
    <div>© 2026 Codex Cryptica. All rights reserved.</div>
    <div class="flex flex-wrap items-center justify-center gap-6">
      {#each extraLinks as link (link.href)}
        <a
          href="{cleanBase}{link.href}"
          class="hover:text-theme-primary transition-colors">{link.label}</a
        >
      {/each}
      <a
        href="{cleanBase}/terms"
        class="hover:text-theme-primary transition-colors">Terms</a
      >
      <a
        href="{cleanBase}/privacy"
        class="hover:text-theme-primary transition-colors">Privacy</a
      >
      <a
        href="{cleanBase}/explore"
        class="hover:text-theme-primary transition-colors">Explore</a
      >
      {#if PATREON_URL}
        <a
          href={PATREON_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
          aria-label="Support Codex Cryptica on Patreon"
          title="Support on Patreon"
        >
          <span class="icon-[lucide--heart] h-3.5 w-3.5" aria-hidden="true"
          ></span>
        </a>
      {/if}
    </div>
  </div>
</footer>
