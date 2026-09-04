<script lang="ts">
  import { base } from "$app/paths";
  import {
    DISCORD_URL,
    GITHUB_URL,
    REDDIT_URL,
    PATREON_URL,
  } from "$lib/config";
  const cleanBase = base === "/" ? "" : base;

  let {
    extraLinks = [],
  }: {
    /** Page-specific links rendered before the standard set (Terms, Privacy, Tools, Sitemap, LLM Docs). */
    extraLinks?: { href: string; label: string }[];
  } = $props();
</script>

<!-- chrome-shield: see app.css and #2578. -->
<footer
  class="chrome-shield border-t border-theme-border/60 bg-theme-surface/20 px-6 py-8 mt-auto text-center text-[10px] text-theme-muted tracking-wider uppercase font-header"
>
  <div
    class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"
  >
    <div>© 2026 Codex Cryptica. All rights reserved.</div>
    <div class="flex flex-wrap items-center justify-center gap-6">
      {#if DISCORD_URL}
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-theme-primary transition-colors">Discord</a
        >
      {/if}
      {#if REDDIT_URL}
        <a
          href={REDDIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-theme-primary transition-colors">Reddit</a
        >
      {/if}
      {#if GITHUB_URL}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-theme-primary transition-colors">GitHub</a
        >
      {/if}
      {#if PATREON_URL}
        <a
          href={PATREON_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-theme-primary transition-colors">Patreon</a
        >
      {/if}
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
        href="{cleanBase}/tools"
        class="hover:text-theme-primary transition-colors">Tools</a
      >
      <a
        href="{cleanBase}/answers"
        class="hover:text-theme-primary transition-colors">Answers</a
      >
      <a
        href="{cleanBase}/sitemap.xml"
        class="hover:text-theme-primary transition-colors">Sitemap</a
      >
      <a
        href="{cleanBase}/llms.txt"
        class="hover:text-theme-primary transition-colors">LLM Docs</a
      >
      <a
        href="https://groupfinder.gg/library/codex-cryptica"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Codex Cryptica on Groupfinder"
      >
        <img
          src="https://groupfinder.gg/images/badges/gf-badge-light.svg"
          alt="Codex Cryptica on Groupfinder"
          width="164"
          height="45"
          loading="lazy"
          class="h-6 w-auto normal-case"
        />
      </a>
    </div>
  </div>
</footer>
