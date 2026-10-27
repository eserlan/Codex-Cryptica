<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import SeoHead from "#lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "#lib/seo/site.js";
  import {
    FLOORPLAN_CATEGORIES,
    CASTLE_FLOORPLAN_RESOURCES,
    getResourcesByCategory,
  } from "#lib/content/resources/castle-floorplans.js";
  import {
    buildCastleFloorplansJsonLd,
    buildCastleFloorplansBreadcrumbJsonLd,
  } from "#lib/content/resources/json-ld.js";

  const cleanBase = basePath();

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
  <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
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
        hall, which window a rope trick reaches. The sources below are worth
        keeping open next to your map while you draw one.
      </p>
      <p class="mt-4 text-base leading-relaxed text-theme-muted">
        This page links out to the original publishers rather than copying their
        plans. Neither Codex Cryptica nor this page claims any rights over the
        linked material; read each source's own licensing notes before reusing
        an image from it.
      </p>
    </div>

    <div class="lg:grid lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16">
      <div class="min-w-0 lg:col-span-8">
        {#each categoriesWithResources as { category, resources } (category.id)}
          <section class="mb-14">
            <h2 class="font-header text-xl font-bold text-theme-text">
              {category.label}
            </h2>

            <p class="mt-1 max-w-2xl text-sm leading-relaxed text-theme-text">
              {category.description}
            </p>

            <ul class="mt-6 grid list-none gap-6">
              {#each resources as resource (resource.id)}
                <li
                  id={resource.id}
                  class="flex flex-col rounded-xl border border-theme-border bg-theme-surface p-5 shadow-sm"
                  style:background-image="var(--bg-texture-overlay)"
                >
                  <div
                    class="flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <h3 class="font-header text-lg font-bold text-theme-text">
                      {resource.name}
                    </h3>
                    <span
                      class="font-mono text-xs uppercase tracking-[0.14em] text-theme-text"
                    >
                      {COMPLEXITY_LABEL[resource.complexity]} · {resource.complexityNote}
                    </span>
                  </div>

                  <p class="mt-3 text-base leading-relaxed text-theme-text">
                    {resource.description}
                  </p>

                  <p
                    class="mt-3 flex-1 text-base leading-relaxed text-theme-text"
                  >
                    <strong class="text-theme-text">Why it is useful:</strong>
                    {resource.whyUseful}
                  </p>

                  <div
                    class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-theme-border pt-4"
                  >
                    <div>
                      <p class="font-mono text-xs text-theme-text">
                        Source: {resource.sourceName}
                      </p>
                      {#if resource.sourceNote}
                        <p class="mt-1 max-w-sm text-xs text-theme-text italic">
                          {resource.sourceNote}
                        </p>
                      {/if}
                    </div>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-sm font-semibold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
                    >
                      View the {resource.name} floor plans
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
      </div>

      <!-- Next steps live in a sticky framed rail beside the sources, like the
         blog and Answers; on phones it follows the sources. -->
      <aside
        class="mt-6 lg:col-span-4 lg:mt-0 lg:self-start lg:sticky lg:top-24"
        aria-labelledby="floorplan-next-steps"
        data-testid="floorplan-next-steps"
      >
        <div
          class="rounded-xl border border-theme-border/60 bg-theme-surface/30 p-5 backdrop-blur-sm"
        >
          <h2
            id="floorplan-next-steps"
            class="font-header text-xl font-bold text-theme-text"
          >
            Put a floor plan to work in your campaign
          </h2>
          <p class="mt-2 text-base leading-relaxed text-theme-text">
            A borrowed floor plan is a starting shape, not a finished location.
            These pages cover turning one into something your table can run.
          </p>
          <ul class="mt-4 list-none border-l border-theme-border">
            <li>
              <a
                href="{cleanBase}/answers/what-should-an-rpg-settlement-contain"
                class="group -ml-px block border-l border-transparent py-1.5 pl-3 transition-colors hover:border-theme-primary"
              >
                <span
                  class="block font-header text-lg font-bold leading-snug text-theme-text transition-colors group-hover:text-theme-primary"
                  >What should an RPG settlement contain?</span
                >
                <span class="block text-base leading-snug text-theme-text"
                  >Turn a building's footprint into a place with people,
                  factions, and reasons to return.</span
                >
              </a>
            </li>
            <li>
              <a
                href="{cleanBase}/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg"
                class="group -ml-px block border-l border-transparent py-1.5 pl-3 transition-colors hover:border-theme-primary"
              >
                <span
                  class="block font-header text-lg font-bold leading-snug text-theme-text transition-colors group-hover:text-theme-primary"
                  >What makes a good heist target?</span
                >
                <span class="block text-base leading-snug text-theme-text"
                  >A palace-scale floor plan like Biltmore's is a ready-made
                  heist target once it has guards and a vault.</span
                >
              </a>
            </li>
            <li>
              <a
                href="{cleanBase}/generators/settlement"
                class="group -ml-px block border-l border-transparent py-1.5 pl-3 transition-colors hover:border-theme-primary"
              >
                <span
                  class="block font-header text-lg font-bold leading-snug text-theme-text transition-colors group-hover:text-theme-primary"
                  >Settlement generator</span
                >
                <span class="block text-base leading-snug text-theme-text"
                  >Generate the town or district around the castle whose plan
                  you just borrowed.</span
                >
              </a>
            </li>
            <li>
              <a
                href="{cleanBase}/worldbuilding-tool"
                class="group -ml-px block border-l border-transparent py-1.5 pl-3 transition-colors hover:border-theme-primary"
              >
                <span
                  class="block font-header text-lg font-bold leading-snug text-theme-text transition-colors group-hover:text-theme-primary"
                  >Codex Cryptica worldbuilding tool</span
                >
                <span class="block text-base leading-snug text-theme-text"
                  >Note rooms, NPCs, and factions against your map and link them
                  into the rest of your campaign.</span
                >
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</div>
