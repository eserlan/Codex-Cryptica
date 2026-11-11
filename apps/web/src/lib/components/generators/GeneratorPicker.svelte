<script lang="ts">
  import {
    getGenerator,
    listGenerators,
    type GeneratorId,
  } from "generator-engine";
  import { getDelveLocationTypeLabel } from "#lib/utils/delve-terminology.js";
  import type { GeneratorFavoritesStore } from "#lib/stores/ui/generator-favorites.svelte.js";
  import {
    GENERATOR_SECTION_CATEGORIES,
    resolveGeneratorSection,
    type GeneratorSectionId,
  } from "./generator-categories";
  import GeneratorPickerCard from "./GeneratorPickerCard.svelte";

  let {
    selectedId = $bindable(),
    generatorId,
    favoritesStore,
    categoryLabels = [],
    themeId = "workspace",
    disabled = false,
  }: {
    selectedId: GeneratorId;
    generatorId: GeneratorId | null;
    favoritesStore: GeneratorFavoritesStore;
    categoryLabels?: Array<{ id: string; label: string }>;
    themeId?: string;
    disabled?: boolean;
  } = $props();

  function resolveEntityTypeLabel(gen: {
    id: GeneratorId;
    entityType: string;
  }): string {
    const match = categoryLabels.find((c) => c.id === gen.entityType);
    if (gen.id === "dungeon" && gen.entityType === "location") {
      return getDelveLocationTypeLabel(themeId);
    }
    return (
      match?.label ??
      gen.entityType
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    );
  }

  const generators = listGenerators();
  let searchQuery = $state("");
  const normalizedQuery = $derived(searchQuery.trim().toLowerCase());

  function getSectionLabel(gen: {
    id: GeneratorId;
    entityType: string;
  }): string {
    const sectionId = resolveGeneratorSection(gen);
    return (
      GENERATOR_SECTION_CATEGORIES.find((c) => c.id === sectionId)?.label ?? ""
    );
  }

  function matchesQuery(gen: (typeof generators)[number]): boolean {
    if (!normalizedQuery) return true;
    const labelMatch = gen.label.toLowerCase().includes(normalizedQuery);
    const descMatch = gen.description.toLowerCase().includes(normalizedQuery);
    const typeLabel = resolveEntityTypeLabel(gen).toLowerCase();
    const sectionLabel = getSectionLabel(gen).toLowerCase();
    const typeMatch =
      typeLabel.includes(normalizedQuery) ||
      gen.entityType.toLowerCase().includes(normalizedQuery) ||
      sectionLabel.includes(normalizedQuery);
    return labelMatch || descMatch || typeMatch;
  }

  const filteredGenerators = $derived(generators.filter(matchesQuery));
  const favoriteGenerators = $derived(
    filteredGenerators.filter((g) => favoritesStore.isFavorite(g.id)),
  );

  // Group all generators into the shared generator categories
  // Pre-favourited generators remain present in their category
  interface GeneratorGroup {
    id: GeneratorSectionId;
    label: string;
    generators: typeof generators;
  }

  const generatorGroups = $derived.by(() => {
    const groups: GeneratorGroup[] = [];
    for (const section of GENERATOR_SECTION_CATEGORIES) {
      const items = filteredGenerators.filter(
        (gen) => resolveGeneratorSection(gen) === section.id,
      );
      if (items.length > 0) {
        groups.push({
          id: section.id,
          label: section.label,
          generators: items,
        });
      }
    }
    return groups;
  });

  // Track collapsed state per group id; default is collapsed
  let collapsedGroups = $state<Record<string, boolean>>({});

  function isGroupCollapsed(groupId: string): boolean {
    // When actively searching, expand all matching groups
    if (normalizedQuery) return false;
    const explicitlyCollapsed = collapsedGroups[groupId];
    if (explicitlyCollapsed !== undefined) return explicitlyCollapsed;

    // Make a non-favourite generator selected by the parent visible, without
    // overriding a category the user has explicitly collapsed. Favourites
    // already remain visible in their dedicated section.
    return (
      generatorId !== selectedId ||
      favoritesStore.isFavorite(selectedId) ||
      resolveGeneratorSection(selectedGenerator) !== groupId
    );
  }

  function toggleGroupCollapsed(groupId: string) {
    const current = isGroupCollapsed(groupId);
    collapsedGroups = {
      ...collapsedGroups,
      [groupId]: !current,
    };
  }

  const selectedGenerator = $derived(getGenerator(selectedId));
</script>

<!-- Generator Search & Filter -->
<div class="relative">
  <label for="generator-search-input" class="sr-only">Search generators</label>
  <div class="relative flex items-center">
    <span
      aria-hidden="true"
      class="icon-[lucide--search] pointer-events-none absolute left-3 h-4 w-4 text-chrome-muted"
    ></span>
    <input
      id="generator-search-input"
      type="search"
      bind:value={searchQuery}
      onkeydown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      placeholder="Search generators by name, category, or description..."
      class="w-full rounded-lg border border-chrome-border bg-chrome-bg/50 py-2 pl-9 pr-8 text-sm text-chrome-text placeholder:text-chrome-muted focus:border-chrome-accent focus:outline-none focus:ring-1 focus:ring-chrome-accent"
      {disabled}
    />
    {#if searchQuery}
      <button
        type="button"
        onclick={() => (searchQuery = "")}
        class="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded text-chrome-muted hover:text-chrome-text"
        aria-label="Clear generator search"
      >
        <span aria-hidden="true" class="icon-[lucide--x] h-3.5 w-3.5"></span>
      </button>
    {/if}
  </div>
</div>

{#snippet favouriteGeneratorsList()}
  <fieldset class="flex flex-col gap-2">
    <legend
      class="mb-1 flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider text-chrome-muted"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--star] h-3.5 w-3.5 fill-amber-400 text-amber-400"
      ></span>
      Favourites
    </legend>
    {#each favoriteGenerators as gen (gen.id)}
      <GeneratorPickerCard
        {gen}
        entityTypeLabel={resolveEntityTypeLabel(gen)}
        {selectedId}
        isFavorite={favoritesStore.isFavorite(gen.id)}
        {disabled}
        idPrefix="fav-generator"
        onselect={(id) => (selectedId = id)}
        ontogglefavorite={(id) => favoritesStore.toggleFavorite(id)}
      />
    {/each}
  </fieldset>
{/snippet}
{#if favoriteGenerators.length > 0}
  {@render favouriteGeneratorsList()}
{:else if !searchQuery}
  <p class="text-xs text-chrome-muted/70 italic">
    Star generators you use often to keep them at the top.
  </p>
{/if}

{#snippet allGeneratorsList()}
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span
        class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
      >
        All Generators
      </span>
    </div>
    {#if filteredGenerators.length === 0}
      <p
        class="rounded-lg border border-chrome-border/60 bg-chrome-bg/20 px-3 py-4 text-center text-xs text-chrome-muted"
      >
        No generators match "{searchQuery}".
      </p>
    {:else}
      {#each generatorGroups as group (group.id)}
        {@const isCollapsed = isGroupCollapsed(group.id)}
        <div
          class="rounded-lg border border-chrome-border/70 bg-chrome-bg/20 overflow-hidden"
        >
          <button
            type="button"
            onclick={() => toggleGroupCollapsed(group.id)}
            class="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-chrome-bg/40 focus:outline-none focus:ring-1 focus:ring-chrome-accent"
            aria-expanded={!isCollapsed}
          >
            <span class="flex items-center gap-2">
              <span
                aria-hidden="true"
                class={[
                  "h-3.5 w-3.5 text-chrome-muted transition-transform duration-150",
                  isCollapsed
                    ? "icon-[lucide--chevron-right]"
                    : "icon-[lucide--chevron-down]",
                ]}
              ></span>
              <span
                class="text-xs font-semibold uppercase tracking-wider text-chrome-text"
              >
                {group.label}
              </span>
            </span>
            <span
              class="rounded-full bg-chrome-bg/60 px-2 py-0.5 text-micro font-medium text-chrome-muted"
            >
              {group.generators.length}
            </span>
          </button>

          {#if !isCollapsed}
            <div
              class="flex flex-col gap-2 border-t border-chrome-border/50 p-2.5"
            >
              {#each group.generators as gen (gen.id)}
                <GeneratorPickerCard
                  {gen}
                  entityTypeLabel={resolveEntityTypeLabel(gen)}
                  {selectedId}
                  isFavorite={favoritesStore.isFavorite(gen.id)}
                  {disabled}
                  idPrefix="generator"
                  onselect={(id) => (selectedId = id)}
                  ontogglefavorite={(id) => favoritesStore.toggleFavorite(id)}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
{/snippet}
{@render allGeneratorsList()}
