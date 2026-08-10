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

<div class="bg-theme-background min-h-screen pt-24 pb-16">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="mb-16 text-center">
      <h1
        class="text-theme-primary text-4xl font-bold tracking-tight sm:text-5xl"
      >
        Find the right Codex Cryptica for your world
      </h1>
      <p
        class="text-theme-secondary mx-auto mt-4 max-w-2xl text-xl leading-relaxed"
      >
        Different campaigns get complicated in different ways. See how Codex
        Cryptica helps organize, connect, and expand the kind of world you're
        building.
      </p>
    </div>

    <!-- Game Systems Section -->
    {#if systemPages.length > 0}
      <section class="mb-16">
        <div class="mb-8 border-b border-theme-border pb-4">
          <h2 class="text-theme-primary text-2xl font-bold">Game Systems</h2>
          <p class="text-theme-secondary mt-1 text-sm">
            Tailored tools and relationship structures for specific tabletop RPG
            systems.
          </p>
        </div>

        <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {#each systemPages as page}
            <a
              href="{base}/for/{page.slug}"
              class="bg-theme-surface border-theme-border group flex h-full flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 hover:border-theme-accent hover:shadow-lg"
            >
              <div class="flex flex-1 flex-col p-8">
                <div class="mb-4 flex items-center justify-between">
                  <span
                    class="bg-theme-accent/10 text-theme-accent rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                  >
                    Game System
                  </span>
                </div>
                <h3
                  class="text-theme-primary mb-3 text-2xl font-bold transition-colors group-hover:text-theme-accent"
                >
                  {page.hero.title}
                </h3>
                <p
                  class="text-theme-secondary flex-1 text-base leading-relaxed"
                >
                  {page.hero.tagline}
                </p>
                <div
                  class="text-theme-accent mt-6 flex items-center text-sm font-semibold"
                >
                  Explore system
                  <span
                    class="icon-[lucide--arrow-right] ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
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
        <div class="mb-8 border-b border-theme-border pb-4">
          <h2 class="text-theme-primary text-2xl font-bold">
            Genres & Settings
          </h2>
          <p class="text-theme-secondary mt-1 text-sm">
            System-agnostic worldbuilding frameworks for fantasy, sci-fi, and
            horror realms.
          </p>
        </div>

        <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {#each genrePages as page}
            <a
              href="{base}/for/{page.slug}"
              class="bg-theme-surface border-theme-border group flex h-full flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 hover:border-theme-accent hover:shadow-lg"
            >
              <div class="flex flex-1 flex-col p-8">
                <div class="mb-4 flex items-center justify-between">
                  <span
                    class="bg-theme-accent/10 text-theme-accent rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                  >
                    Genre
                  </span>
                </div>
                <h3
                  class="text-theme-primary mb-3 text-2xl font-bold transition-colors group-hover:text-theme-accent"
                >
                  {page.hero.title}
                </h3>
                <p
                  class="text-theme-secondary flex-1 text-base leading-relaxed"
                >
                  {page.hero.tagline}
                </p>
                <div
                  class="text-theme-accent mt-6 flex items-center text-sm font-semibold"
                >
                  Explore genre
                  <span
                    class="icon-[lucide--arrow-right] ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
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
