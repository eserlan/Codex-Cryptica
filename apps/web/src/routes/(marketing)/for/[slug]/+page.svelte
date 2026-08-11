<script lang="ts">
  import { onDestroy } from "svelte";
  import { base } from "$app/paths";
  import type { PageData } from "./$types";
  import type {
    LandingPageConfig,
    LandingPageSection,
  } from "$lib/content/for/schema";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { hubThemeLabel, type HubThemeSlug } from "$lib/content/hub-themes";
  import LandingPageGraphPreview from "$lib/components/for/LandingPageGraphPreview.svelte";

  let { data }: { data: PageData } = $props();
  let config: LandingPageConfig = $derived(data.config);

  const DEFAULT_SECTION_ORDER: LandingPageSection[] = [
    "hero",
    "useCases",
    "graph",
    "tools",
    "hub",
    "cta",
    "disclaimer",
  ];

  let activeSectionOrder = $derived(
    config.sectionOrder ?? DEFAULT_SECTION_ORDER,
  );

  // Corner treatment is config-driven so a page can read as an archival
  // document rather than a stack of app cards, without forking the shell.
  const SURFACE_RADII = {
    soft: { surface: "0.75rem", panel: "1rem" },
    sharp: { surface: "3px", panel: "4px" },
  } as const;

  let radii = $derived(SURFACE_RADII[config.surfaceStyle ?? "soft"]);

  let graphSurface = $derived(config.exampleGraph?.surface ?? "page");
  let graphBadge = $derived(
    config.exampleGraph?.badgeLabel ?? "Interactive Graph View",
  );

  $effect(() => {
    if (config.theme) {
      themeStore.previewTheme(config.theme);
    }
  });

  onDestroy(() => {
    themeStore.previewTheme(null);
  });
</script>

<svelte:head>
  <title>{config.seo.title}</title>
  <meta name="description" content={config.seo.description} />
  <meta property="og:title" content={config.seo.title} />
  <meta property="og:description" content={config.seo.description} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={config.seo.title} />
  <meta name="twitter:description" content={config.seo.description} />
  {#if config.seo.canonical}
    <link rel="canonical" href={config.seo.canonical} />
  {/if}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg transition-colors duration-300 overflow-y-auto"
  style:background-image="var(--bg-texture-overlay)"
  style:--for-surface-radius={radii.surface}
  style:--for-panel-radius={radii.panel}
>
  <div class="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
    {#each activeSectionOrder as section}
      {#if section === "hero"}
        <!-- Hero Section -->
        <header class="mb-14 text-center">
          {#if config.hero.eyebrow}
            <p
              class="mb-3 text-xs font-mono font-bold uppercase tracking-[0.24em] text-theme-primary"
            >
              {config.hero.eyebrow}
            </p>
          {/if}
          <h1
            class="mb-6 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-4xl lg:text-5xl"
          >
            {config.hero.title}
          </h1>
          <p
            class="mx-auto mb-8 max-w-2xl text-lg sm:text-xl font-light leading-relaxed text-theme-muted"
          >
            {config.hero.tagline}
          </p>

          <div
            class="mx-auto max-w-2xl rounded-[var(--for-surface-radius)] border border-theme-border/70 bg-theme-surface/50 p-6 text-left shadow-sm sm:p-8"
            style:background-image="var(--bg-texture-overlay)"
          >
            <h2
              class="mb-2 font-header text-base font-bold text-theme-text sm:text-lg"
            >
              Why {config.kind === "system" ? "chronicles" : "fantasy worlds"} get
              complicated
            </h2>
            <p
              class="font-light text-sm sm:text-base leading-relaxed text-theme-muted"
            >
              {config.hero.problemStatement}
            </p>
          </div>
        </header>
      {:else if section === "useCases" && config.useCases.length > 0}
        <!-- Use Cases -->
        <section class="mb-16">
          <h2
            class="mb-8 text-center font-header text-2xl font-bold text-theme-text sm:text-3xl"
          >
            Why Codex Cryptica?
          </h2>
          <div class="grid gap-6 md:grid-cols-2">
            {#each config.useCases as useCase}
              <div
                class="group relative overflow-hidden rounded-[var(--for-surface-radius)] border border-theme-border bg-theme-surface p-6 shadow-md transition-all hover:border-theme-primary/40 sm:p-8"
                style:background-image="var(--bg-texture-overlay)"
              >
                <div class="flex items-center gap-4 mb-3">
                  {#if useCase.icon}
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--for-surface-radius)] border border-theme-primary/20 bg-theme-primary/10 transition-transform duration-300 group-hover:scale-110"
                    >
                      <span class={useCase.icon + " h-5 w-5 text-theme-primary"}
                      ></span>
                    </div>
                  {/if}
                  <h3 class="font-header text-lg font-bold text-theme-text">
                    {useCase.title}
                  </h3>
                </div>
                <p
                  class="font-light leading-relaxed text-theme-muted text-sm sm:text-base"
                >
                  {useCase.description}
                </p>
              </div>
            {/each}
          </div>
        </section>
      {:else if section === "graph" && config.exampleGraph}
        {@const isDark = graphSurface === "dark"}
        <!-- Example Graph Preview -->
        <section
          class="mb-16 overflow-hidden rounded-[var(--for-surface-radius)] border p-6 sm:p-8 {isDark
            ? 'border-red-950/80 bg-[#0c0707] text-slate-100 shadow-2xl'
            : 'border-theme-border bg-theme-surface shadow-lg'}"
          style={isDark
            ? "background-image: radial-gradient(ellipse at top, rgba(128,20,20,0.18), transparent 70%), var(--bg-texture-overlay)"
            : "background-image: var(--bg-texture-overlay)"}
        >
          <div
            class="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center border-b pb-4 {isDark
              ? 'border-red-950/80'
              : 'border-theme-border/60'}"
          >
            <div>
              <h2
                class="font-header text-xl font-bold sm:text-2xl {isDark
                  ? 'text-red-100'
                  : 'text-theme-text'}"
              >
                {config.exampleGraph.title}
              </h2>
              {#if config.exampleGraph.description}
                <p
                  class="mt-1 font-light text-sm {isDark
                    ? 'text-red-200/70'
                    : 'text-theme-muted'}"
                >
                  {config.exampleGraph.description}
                </p>
              {/if}
            </div>
            <span
              class="self-start sm:self-auto rounded-[var(--for-surface-radius)] border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider {isDark
                ? 'border-red-900/60 bg-red-950/80 text-red-300'
                : 'border-theme-primary/20 bg-theme-primary/10 text-theme-primary'}"
            >
              {graphBadge}
            </span>
          </div>

          <LandingPageGraphPreview
            steps={config.exampleGraph.steps}
            palette={config.exampleGraph.palette}
            surfaceStyle={config.surfaceStyle}
          />
        </section>
      {:else if section === "tools" && config.recommendedTools.length > 0}
        <!-- Recommended Tools -->
        <section class="mb-16">
          <h2
            class="mb-8 text-center font-header text-2xl font-bold text-theme-text sm:text-3xl"
          >
            Featured Tools
          </h2>
          <div class="grid gap-6 md:grid-cols-2">
            {#each config.recommendedTools as tool}
              <a
                href="{base}{tool.href}"
                class="group block rounded-[var(--for-surface-radius)] border border-theme-border bg-theme-surface p-6 shadow-md transition-all hover:border-theme-primary/50"
                style:background-image="var(--bg-texture-overlay)"
              >
                <div class="mb-2 flex items-center justify-between">
                  <h3
                    class="font-header text-base font-bold text-theme-text transition-colors group-hover:text-theme-primary"
                  >
                    {tool.title}
                  </h3>
                  {#if tool.badge}
                    <span
                      class="rounded-[var(--for-surface-radius)] border border-theme-primary/20 bg-theme-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-theme-primary"
                      >{tool.badge}</span
                    >
                  {/if}
                </div>
                <p class="font-light text-sm leading-relaxed text-theme-muted">
                  {tool.description}
                </p>
              </a>
            {/each}
          </div>
        </section>
      {:else if section === "hub" && config.hub}
        {@const hub = config.hub as HubThemeSlug}
        <!-- Theme hub cross-link -->
        <section class="mb-16">
          <a
            href="{base}/generators/{hub}"
            class="group flex flex-col gap-3 rounded-[var(--for-surface-radius)] border border-theme-border bg-theme-surface p-6 shadow-md transition-all hover:border-theme-primary/50 sm:flex-row sm:items-center sm:justify-between sm:p-8"
            style:background-image="var(--bg-texture-overlay)"
          >
            <div>
              <h2
                class="font-header text-lg font-bold text-theme-text transition-colors group-hover:text-theme-primary sm:text-xl"
              >
                Browse all {hubThemeLabel(hub)} generators
              </h2>
              <p
                class="mt-1 font-light text-sm leading-relaxed text-theme-muted"
              >
                Every {hubThemeLabel(hub).toLowerCase()} generator in one place —
                free, no login required.
              </p>
            </div>
            <span
              class="inline-flex shrink-0 items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-theme-primary"
            >
              Visit the hub
              <span
                class="icon-[lucide--arrow-right] h-4 w-4 transition-transform group-hover:translate-x-1"
              ></span>
            </span>
          </a>
        </section>
      {:else if section === "cta"}
        <!-- CTA -->
        <section
          class="mx-auto mb-16 max-w-3xl rounded-[var(--for-panel-radius)] border border-theme-border bg-theme-surface px-6 py-12 text-center shadow-xl sm:px-12"
          style:background-image="var(--bg-texture-overlay)"
        >
          <h2
            class="mb-4 font-header text-2xl font-bold text-theme-text sm:text-3xl"
          >
            {config.cta.title}
          </h2>
          {#if config.cta.description}
            <p
              class="mx-auto mb-8 max-w-xl font-light text-base sm:text-lg leading-relaxed text-theme-muted"
            >
              {config.cta.description}
            </p>
          {/if}
          <a
            href="{base}{config.cta.buttonHref}"
            class="inline-block rounded-[var(--for-surface-radius)] bg-theme-primary px-10 py-4 font-header text-sm font-bold text-theme-bg transition-all hover:bg-theme-primary/90 hover:shadow-[0_0_30px_var(--color-accent-primary)] active:scale-95"
          >
            {config.cta.buttonText}
          </a>
        </section>
      {:else if section === "disclaimer" && config.disclaimer}
        <!-- Disclaimer -->
        <footer class="mt-8 border-t border-theme-border/60 pt-6 text-center">
          <p
            class="mx-auto max-w-3xl font-mono text-xs leading-relaxed text-theme-muted"
          >
            {config.disclaimer}
          </p>
        </footer>
      {/if}
    {/each}
  </div>
</div>
