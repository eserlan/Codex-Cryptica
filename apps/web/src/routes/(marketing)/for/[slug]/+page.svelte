<script lang="ts">
  import { base } from "$app/paths";
  import type { PageData } from "./$types";
  import type { LandingPageConfig } from "$lib/content/for/schema";

  let { data }: { data: PageData } = $props();
  let config: LandingPageConfig = $derived(data.config);
</script>

<svelte:head>
  <title>{config.seo.title}</title>
  <meta name="description" content={config.seo.description} />
  {#if config.seo.canonical}
    <link rel="canonical" href={config.seo.canonical} />
  {/if}
</svelte:head>

<div data-theme={config.theme} class="bg-theme-base min-h-screen">
  <!-- Hero Section -->
  <header
    class="bg-theme-surface border-theme-border flex flex-col items-center justify-center border-b px-4 py-20 text-center"
  >
    {#if config.hero.eyebrow}
      <p
        class="text-theme-accent mb-2 text-sm font-semibold uppercase tracking-wider"
      >
        {config.hero.eyebrow}
      </p>
    {/if}
    <h1
      class="text-theme-primary mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
    >
      {config.hero.title}
    </h1>
    <p class="text-theme-secondary mb-8 max-w-2xl text-xl">
      {config.hero.tagline}
    </p>
    <p class="text-theme-tertiary max-w-3xl text-lg italic">
      "{config.hero.problemStatement}"
    </p>
  </header>

  <!-- Main Content -->
  <main class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <!-- Use Cases -->
    {#if config.useCases.length > 0}
      <section class="mb-24">
        <h2 class="text-theme-primary mb-12 text-center text-3xl font-bold">
          Why Codex Cryptica?
        </h2>
        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          {#each config.useCases as useCase}
            <div
              class="bg-theme-surface border-theme-border flex flex-col rounded-xl border p-6 shadow-sm transition-all hover:shadow-md"
            >
              {#if useCase.icon}
                <div
                  class="text-theme-accent mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-theme-surface-hover"
                >
                  <span class={useCase.icon + " h-6 w-6"}></span>
                </div>
              {/if}
              <h3 class="text-theme-primary mb-2 text-xl font-semibold">
                {useCase.title}
              </h3>
              <p class="text-theme-secondary flex-1 leading-relaxed">
                {useCase.description}
              </p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Example Graph Preview (US1 requirement) -->
    {#if config.exampleGraph}
      <section
        class="bg-theme-surface border-theme-border mb-24 overflow-hidden rounded-2xl border"
      >
        <div class="border-theme-border border-b px-8 py-6">
          <h2 class="text-theme-primary text-2xl font-bold">
            {config.exampleGraph.title}
          </h2>
          {#if config.exampleGraph.description}
            <p class="text-theme-secondary mt-2">
              {config.exampleGraph.description}
            </p>
          {/if}
        </div>
        <div class="bg-theme-base p-8">
          <div class="flex flex-wrap items-center justify-center gap-4">
            {#each config.exampleGraph.steps as step, index}
              <div
                class="bg-theme-surface border-theme-border flex flex-col items-center rounded-lg border px-6 py-4 shadow-sm"
              >
                <span class="text-theme-primary font-bold">{step.label}</span>
                {#if step.sublabel}
                  <span
                    class="text-theme-tertiary mt-1 text-xs uppercase tracking-wider"
                    >{step.sublabel}</span
                  >
                {/if}
              </div>
              {#if index < config.exampleGraph.steps.length - 1}
                <span
                  class="icon-[lucide--arrow-right] text-theme-tertiary h-6 w-6"
                ></span>
              {/if}
            {/each}
          </div>
        </div>
      </section>
    {/if}

    <!-- Recommended Tools -->
    {#if config.recommendedTools.length > 0}
      <section class="mb-24">
        <h2 class="text-theme-primary mb-12 text-center text-3xl font-bold">
          Featured Tools
        </h2>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          {#each config.recommendedTools as tool}
            <a
              href="{base}{tool.href}"
              class="bg-theme-surface border-theme-border group flex flex-col rounded-xl border p-6 transition-all hover:border-theme-accent hover:shadow-md"
            >
              <div class="mb-2 flex items-center justify-between">
                <h3
                  class="text-theme-primary font-bold transition-colors group-hover:text-theme-accent"
                >
                  {tool.title}
                </h3>
                {#if tool.badge}
                  <span
                    class="bg-theme-surface-hover text-theme-secondary rounded-full px-3 py-1 text-xs font-medium"
                    >{tool.badge}</span
                  >
                {/if}
              </div>
              <p class="text-theme-secondary">{tool.description}</p>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- CTA -->
    <section
      class="bg-theme-accent/10 border-theme-accent/20 rounded-3xl border px-6 py-16 text-center shadow-inner sm:px-12"
    >
      <h2 class="text-theme-primary mb-4 text-3xl font-bold">
        {config.cta.title}
      </h2>
      {#if config.cta.description}
        <p class="text-theme-secondary mb-8 text-xl">
          {config.cta.description}
        </p>
      {/if}
      <a
        href="{base}{config.cta.buttonHref}"
        class="bg-theme-accent text-theme-primary-inverse inline-flex items-center justify-center rounded-lg px-8 py-4 font-bold transition-transform hover:scale-105 active:scale-95"
      >
        {config.cta.buttonText}
      </a>
    </section>

    <!-- Disclaimer (US1 requirement) -->
    {#if config.disclaimer}
      <footer class="mt-24 border-t border-theme-border pt-8 text-center">
        <p
          class="text-theme-tertiary mx-auto max-w-4xl text-sm leading-relaxed"
        >
          {config.disclaimer}
        </p>
      </footer>
    {/if}
  </main>
</div>
