<script lang="ts">
  import { base } from "$app/paths";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let systemPages = $derived(data.pages.filter((p) => p.kind === "system"));
  let genrePages = $derived(data.pages.filter((p) => p.kind === "genre"));
</script>

<svelte:head>
  <title>Find the right Codex Cryptica for your world</title>
  <meta
    name="description"
    content="Different campaigns get complicated in different ways. See how Codex Cryptica helps organize, connect, and expand the kind of world you're building."
  />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg transition-colors duration-300 overflow-y-auto"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
    <header class="mb-16 text-center">
      <p
        class="mb-3 text-xs font-mono font-bold uppercase tracking-[0.24em] text-theme-primary"
      >
        Campaign Directory
      </p>
      <h1
        class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        Find the right Codex Cryptica for your world
      </h1>
      <p
        class="mx-auto max-w-2xl font-light text-lg leading-relaxed text-theme-muted"
      >
        Different campaigns get complicated in different ways. See how Codex
        Cryptica helps organize, connect, and expand the kind of world you're
        building.
      </p>
    </header>

    <!-- Game Systems Section -->
    {#if systemPages.length > 0}
      <section class="mb-16">
        <div class="mb-8 border-b border-theme-border/60 pb-4">
          <h2 class="font-header text-2xl font-bold text-theme-text">
            Game Systems
          </h2>
          <p class="mt-1 font-light text-sm text-theme-muted">
            Tailored tools and relationship structures for specific tabletop RPG
            systems.
          </p>
        </div>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each systemPages as page}
            <a
              href="{base}/for/{page.slug}"
              class="group flex h-full flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface p-6 shadow-md transition-all hover:border-theme-primary/50 hover:shadow-lg"
              style:background-image="var(--bg-texture-overlay)"
            >
              <div class="flex flex-1 flex-col">
                <div class="mb-3 flex items-center justify-between">
                  <span
                    class="rounded-full border border-theme-primary/20 bg-theme-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-theme-primary"
                  >
                    Game System
                  </span>
                </div>
                <h3
                  class="mb-2 font-header text-xl font-bold text-theme-text transition-colors group-hover:text-theme-primary"
                >
                  {page.hero.title}
                </h3>
                <p
                  class="flex-1 font-light text-sm leading-relaxed text-theme-muted"
                >
                  {page.hero.tagline}
                </p>
                <div
                  class="mt-6 flex items-center font-header text-xs font-bold text-theme-primary"
                >
                  Explore system
                  <span
                    class="icon-[lucide--arrow-right] ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1"
                  ></span>
                </div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Genres Section -->
    {#if genrePages.length > 0}
      <section class="mb-16">
        <div class="mb-8 border-b border-theme-border/60 pb-4">
          <h2 class="font-header text-2xl font-bold text-theme-text">
            Genres & Settings
          </h2>
          <p class="mt-1 font-light text-sm text-theme-muted">
            System-agnostic approaches to worldbuilding across fantasy, sci-fi,
            horror, and other genres.
          </p>
        </div>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each genrePages as page}
            <a
              href="{base}/for/{page.slug}"
              class="group flex h-full flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface p-6 shadow-md transition-all hover:border-theme-primary/50 hover:shadow-lg"
              style:background-image="var(--bg-texture-overlay)"
            >
              <div class="flex flex-1 flex-col">
                <div class="mb-3 flex items-center justify-between">
                  <span
                    class="rounded-full border border-theme-primary/20 bg-theme-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-theme-primary"
                  >
                    Genre
                  </span>
                </div>
                <h3
                  class="mb-2 font-header text-xl font-bold text-theme-text transition-colors group-hover:text-theme-primary"
                >
                  {page.hero.title}
                </h3>
                <p
                  class="flex-1 font-light text-sm leading-relaxed text-theme-muted"
                >
                  {page.hero.tagline}
                </p>
                <div
                  class="mt-6 flex items-center font-header text-xs font-bold text-theme-primary"
                >
                  Explore genre
                  <span
                    class="icon-[lucide--arrow-right] ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1"
                  ></span>
                </div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>
