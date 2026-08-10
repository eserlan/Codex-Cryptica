<script lang="ts">
  import { base } from "$app/paths";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Codex Cryptica For...</title>
  <meta
    name="description"
    content="Discover how Codex Cryptica helps you build and manage campaigns across different tabletop RPG systems and worldbuilding genres."
  />
</svelte:head>

<div class="bg-theme-background min-h-screen pt-24 pb-16">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="mb-16 text-center">
      <h1
        class="text-theme-primary text-4xl font-bold tracking-tight sm:text-5xl"
      >
        Codex Cryptica For...
      </h1>
      <p class="text-theme-secondary mx-auto mt-4 max-w-2xl text-xl">
        Whether you are running a specific tabletop system or building a custom
        setting, explore how our tools adapt to your campaign.
      </p>
    </div>

    <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.pages as page}
        <a
          href="{base}/for/{page.slug}"
          class="bg-theme-surface border-theme-border group flex h-full flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 hover:border-theme-accent hover:shadow-lg"
        >
          <div class="flex flex-1 flex-col p-8">
            <h2
              class="text-theme-primary mb-3 text-2xl font-bold transition-colors group-hover:text-theme-accent"
            >
              {page.hero.title}
            </h2>
            <p class="text-theme-secondary flex-1 text-base leading-relaxed">
              {page.hero.subtitle}
            </p>
            <div
              class="text-theme-accent mt-6 flex items-center text-sm font-semibold"
            >
              Explore capabilities
              <span
                class="icon-[lucide--arrow-right] ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
              ></span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </div>
</div>
