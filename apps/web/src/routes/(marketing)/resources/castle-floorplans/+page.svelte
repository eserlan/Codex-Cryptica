<script lang="ts">
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import {
    FLOORPLAN_CATEGORIES,
    CASTLE_FLOORPLAN_RESOURCES,
    getResourcesByCategory,
  } from "$lib/content/resources/castle-floorplans";
  import {
    buildCastleFloorplansJsonLd,
    buildCastleFloorplansBreadcrumbJsonLd,
  } from "$lib/content/resources/json-ld";

  const cleanBase = base === "/" ? "" : base;

  const TITLE = "Great Castle Floorplans for RPGs and Worldbuilding";
  const DESCRIPTION =
    "Curated links to real castle, palace, and fortress floor plans, chosen as reference for medieval and fantasy RPG maps rather than reproduced from their original publishers.";

  const categoriesWithResources = FLOORPLAN_CATEGORIES.map((category) => ({
    category,
    resources: getResourcesByCategory(category.id),
  })).filter(({ resources }) => resources.length > 0);

  const COMPLEXITY_LABEL: Record<string, string> = {
    compact: "Compact",
    moderate: "Moderate",
    large: "Large",
    sprawling: "Sprawling",
    directory: "Directory of many sites",
  };
</script>

<SeoHead
  title="{TITLE} | Codex Cryptica"
  description={DESCRIPTION}
  canonicalUrl={buildAbsoluteUrl("/resources/castle-floorplans")}
  keywords={[
    "castle floorplans for rpgs",
    "medieval castle maps",
    "realistic castle layouts",
    "castle floorplans for dnd",
  ]}
  jsonLd={[
    buildCastleFloorplansJsonLd(CASTLE_FLOORPLAN_RESOURCES),
    buildCastleFloorplansBreadcrumbJsonLd(),
  ]}
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
    <nav aria-label="Breadcrumb" class="mb-8">
      <a
        href="{cleanBase}/explore"
        class="inline-flex items-center gap-2 font-mono text-xs text-theme-muted transition-colors hover:text-theme-primary"
      >
        <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Explore
      </a>
    </nav>

    <div class="mb-12 max-w-2xl">
      <h1
        class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        {TITLE}
      </h1>
      <p class="text-lg leading-relaxed text-theme-muted">
        A real building's floor plan settles arguments a description never does:
        where the guards actually stand, how far the kitchen is from the great
        hall, which window a rope trick reaches. The two sources below are worth
        keeping open next to your map while you draw one.
      </p>
      <p class="mt-4 text-base leading-relaxed text-theme-muted">
        This page links out to the original publishers rather than copying their
        plans. Neither Codex Cryptica nor this page claims any rights over the
        linked material; read each source's own licensing notes before reusing
        an image from it.
      </p>
    </div>

    {#each categoriesWithResources as { category, resources } (category.id)}
      <section class="mb-14">
        <h2 class="font-header text-xl font-bold text-theme-text">
          {category.label}
        </h2>
        <p class="mt-1 text-sm leading-relaxed text-theme-muted">
          {category.description}
        </p>

        <ul class="mt-6 grid list-none gap-6">
          {#each resources as resource (resource.id)}
            <li
              id={resource.id}
              class="border border-theme-border bg-theme-surface p-5"
            >
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h3 class="font-header text-lg font-bold text-theme-text">
                  {resource.name}
                </h3>
                <span
                  class="font-mono text-xs uppercase tracking-[0.14em] text-theme-muted"
                >
                  {COMPLEXITY_LABEL[resource.complexity]} · {resource.complexityNote}
                </span>
              </div>

              <p class="mt-3 text-base leading-relaxed text-theme-text">
                {resource.description}
              </p>

              <p class="mt-3 text-base leading-relaxed text-theme-muted">
                <strong class="text-theme-text">Why it is useful:</strong>
                {resource.whyUseful}
              </p>

              <div
                class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-theme-border pt-4"
              >
                <p class="font-mono text-xs text-theme-muted">
                  Source: {resource.sourceName}
                </p>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-sm font-semibold text-theme-primary transition-colors hover:underline"
                >
                  View the floor plans
                  <span
                    class="icon-[lucide--external-link] h-3.5 w-3.5"
                    aria-hidden="true"
                  ></span>
                </a>
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/each}

    <section class="border-t border-theme-border pt-10">
      <h2 class="font-header text-xl font-bold text-theme-text">
        Put a floor plan to work in your campaign
      </h2>
      <p class="mt-2 max-w-2xl text-base leading-relaxed text-theme-muted">
        A borrowed floor plan is a starting shape, not a finished location.
        These Codex Cryptica pages cover turning one into something your table
        can actually run.
      </p>
      <ul class="mt-5 grid list-none gap-4 sm:grid-cols-2">
        <li>
          <a
            href="{cleanBase}/answers/what-should-an-rpg-settlement-contain"
            class="group block border border-theme-border bg-theme-surface p-4 transition-colors hover:border-theme-primary/50"
          >
            <p
              class="font-header font-bold text-theme-text group-hover:text-theme-primary"
            >
              What should an RPG settlement contain?
            </p>
            <p class="mt-1 text-sm text-theme-muted">
              Turn a building's footprint into a place with people, factions,
              and reasons to return.
            </p>
          </a>
        </li>
        <li>
          <a
            href="{cleanBase}/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg"
            class="group block border border-theme-border bg-theme-surface p-4 transition-colors hover:border-theme-primary/50"
          >
            <p
              class="font-header font-bold text-theme-text group-hover:text-theme-primary"
            >
              What makes a good heist target?
            </p>
            <p class="mt-1 text-sm text-theme-muted">
              A palace-scale floor plan like Biltmore's is a ready-made heist
              target once it has guards and a vault.
            </p>
          </a>
        </li>
        <li>
          <a
            href="{cleanBase}/generators/settlement"
            class="group block border border-theme-border bg-theme-surface p-4 transition-colors hover:border-theme-primary/50"
          >
            <p
              class="font-header font-bold text-theme-text group-hover:text-theme-primary"
            >
              Settlement generator
            </p>
            <p class="mt-1 text-sm text-theme-muted">
              Generate the town or district around the castle whose plan you
              just borrowed.
            </p>
          </a>
        </li>
        <li>
          <a
            href="{cleanBase}/worldbuilding-tool"
            class="group block border border-theme-border bg-theme-surface p-4 transition-colors hover:border-theme-primary/50"
          >
            <p
              class="font-header font-bold text-theme-text group-hover:text-theme-primary"
            >
              Codex Cryptica worldbuilding tool
            </p>
            <p class="mt-1 text-sm text-theme-muted">
              Note rooms, NPCs, and factions against your map and link them into
              the rest of your campaign.
            </p>
          </a>
        </li>
      </ul>
    </section>
  </div>
</div>
