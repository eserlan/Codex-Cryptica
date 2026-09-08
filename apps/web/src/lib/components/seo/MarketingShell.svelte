<script lang="ts">
  /**
   * The public site's shell: wordmark, navigation, main landmark, footer.
   *
   * Rendered once by `(marketing)/+layout.svelte`, so every public page gets
   * it. Before this existed the route-group layout rendered nothing shared and
   * three partial shells had grown around the gap: SEOPageLayout's header,
   * SEOGeneratorLayout's near-identical copy, and a bare MarketingFooter
   * imported by a handful of pages. Ten of thirty pages had no chrome at all.
   *
   * Follows docs/design/public-shell-grammar.md, with one deliberate omission:
   * the shell does **not** constrain content width. Every page still owns its
   * container, because wrapping thirty pages in a new max-width at once would
   * reflow all of them in a single commit. Widths converge on the grammar's
   * three tokens page by page in phase 3, where each can be looked at.
   */
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { DISCORD_URL, GITHUB_URL } from "$lib/config";
  import MarketingFooter from "./MarketingFooter.svelte";
  import {
    MARKETING_NAV,
    shellCtaHref,
    shellFooterLinks,
    runShellCtaHandler,
  } from "./marketing-shell";

  let {
    onCtaClick,
    footerLinks,
    children,
  }: {
    /** Extra work on the header CTA, e.g. the generator pages' action tracking. */
    onCtaClick?: () => void;
    /**
     * Page-specific footer links, rendered before the standard set. Defaults to
     * the path-derived set, preserving what SEOPageLayout used to pass.
     */
    footerLinks?: { href: string; label: string }[];
    children?: import("svelte").Snippet;
  } = $props();

  const cleanBase = $derived(base === "/" ? "" : base);
  const logoHref = $derived(shellCtaHref(base, page.url.pathname, "logo"));
  const ctaHref = $derived(shellCtaHref(base, page.url.pathname, "nav"));

  const isCurrent = (href: string) =>
    page.url.pathname.startsWith(`${cleanBase}${href}`) ? "page" : undefined;
</script>

<div class="min-h-screen flex flex-col">
  <!-- chrome-shield: opts this header into the neutral chrome palette so world
       themes cannot bleed into site navigation. See app.css and #2578. -->
  <header
    class="chrome-shield w-full border-b border-theme-border/60 bg-theme-surface/40 backdrop-blur-md px-4 sm:px-6 py-4 sticky top-0 z-50"
  >
    <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
      <a
        href={logoHref}
        class="flex items-center gap-2 group min-w-0"
        id="logo-link"
        data-testid="shell-wordmark"
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--castle] text-theme-primary w-6 h-6 shrink-0 transition-transform group-hover:rotate-12"
        ></span>
        <span
          class="font-header font-bold text-sm uppercase tracking-[0.2em] text-theme-text group-hover:text-theme-primary transition-colors whitespace-nowrap truncate"
        >
          <!-- Non-breaking space: prettier collapses a leading literal space
               inside the span, which rendered the wordmark as "CodexCryptica". -->
          Codex<span class="hidden sm:inline">&nbsp;Cryptica</span>
        </span>
      </a>

      <nav
        aria-label="Site"
        class="hidden md:flex items-center gap-6 text-sm font-header text-theme-muted"
        data-testid="shell-nav"
      >
        {#each MARKETING_NAV as item (item.href)}
          <a
            href="{cleanBase}{item.href}"
            class="hover:text-theme-primary transition-colors"
            aria-current={isCurrent(item.href)}>{item.label}</a
          >
        {/each}
      </nav>

      <div class="flex items-center gap-2 shrink-0">
        {#if DISCORD_URL}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="hidden sm:inline-flex items-center justify-center min-w-[24px] min-h-[24px] p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-surface/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
            aria-label="Discord Community"
            title="Discord Community"
            data-testid="shell-discord-link"
          >
            <span
              class="icon-[lucide--message-square] w-4 h-4"
              aria-hidden="true"
            ></span>
          </a>
        {/if}
        {#if GITHUB_URL}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="hidden sm:inline-flex items-center justify-center min-w-[24px] min-h-[24px] p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-surface/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
            aria-label="GitHub Repository"
            title="GitHub Repository"
            data-testid="shell-github-link"
          >
            <span class="icon-[lucide--github] w-4 h-4" aria-hidden="true"
            ></span>
          </a>
        {/if}
        <a
          href={ctaHref}
          class="min-h-[24px] px-4 sm:px-5 py-2.5 bg-theme-primary text-theme-bg font-bold font-header text-xs rounded-lg hover:brightness-110 active:brightness-95 shadow-sm transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
          id="nav-cta-btn"
          data-testid="shell-cta"
          onclick={() => {
            onCtaClick?.();
            runShellCtaHandler();
          }}
        >
          Open Codex
        </a>
        <a
          href="{cleanBase}/explore"
          class="md:hidden inline-flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-bg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent font-header text-xs"
          aria-label="Explore Codex Cryptica"
          title="Explore"
          data-testid="shell-explore-link"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--compass] w-4 h-4 block"
          ></span>
          <span>Explore</span>
        </a>
      </div>
    </div>
  </header>

  <main class="flex-grow w-full">
    {#if children}
      {@render children()}
    {/if}
  </main>

  <MarketingFooter
    extraLinks={footerLinks ?? shellFooterLinks(page.url.pathname)}
  />
</div>
