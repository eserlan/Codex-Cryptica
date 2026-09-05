<script lang="ts">
  import { base } from "$app/paths";
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
  to carry that weight. Community links (Discord, GitHub, Reddit, Patreon),
  Sitemap, LLM Docs and the Groupfinder badge moved to /explore's
  "Community & Legal" section rather than being duplicated here.
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
    </div>
  </div>
</footer>
