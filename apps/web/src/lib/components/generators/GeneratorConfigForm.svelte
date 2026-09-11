<script lang="ts">
  import {
    dungeonConfig,
    factionTypesForTheme,
    forDungeonGenre,
    getGenerator,
    listGenerators,
    npcRacesForTheme,
    npcRolesForTheme,
    settlementTypesForTheme,
    themeIdToLabel,
    worldConfig,
  } from "generator-engine";
  import type {
    AIPolicy,
    GeneratorId,
    GeneratorRunRequest,
  } from "generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";
  import { getDelveLocationTypeLabel } from "$lib/utils/delve-terminology";
  import type { DetectedVaultLanguage } from "$lib/services/generators/generator-vault-context";
  import {
    GeneratorFavoritesStore,
    generatorFavoritesStore,
  } from "$lib/stores/ui/generator-favorites.svelte";

  interface Props {
    generatorId: GeneratorId | null;
    onsubmit: (
      req: Pick<
        GeneratorRunRequest,
        | "generatorId"
        | "options"
        | "useAI"
        | "instructions"
        | "primaryLanguageId"
      >,
    ) => void;
    disabled?: boolean;
    aiPolicy?: AIPolicy;
    categoryLabels?: Array<{ id: string; label: string }>;
    themeId?: string;
    languages?: DetectedVaultLanguage[];
    suggestedLanguageId?: string;
    favoritesStore?: GeneratorFavoritesStore;
  }

  let {
    generatorId = $bindable(null),
    onsubmit,
    disabled = false,
    aiPolicy,
    categoryLabels = [],
    themeId = "workspace",
    languages = [],
    suggestedLanguageId,
    favoritesStore = generatorFavoritesStore,
  }: Props = $props();

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

  const aiAvailable = $derived(
    !!(aiPolicy?.isEnabled && aiPolicy?.isAvailable),
  );

  const aiUnavailableReason = $derived(
    aiPolicy && (!aiPolicy.isEnabled || !aiPolicy.isAvailable)
      ? !aiPolicy.isEnabled
        ? "AI generation is disabled. Content will be generated locally."
        : "AI generation requires an account. Content will be generated locally."
      : null,
  );

  const generators = listGenerators();
  let selectedId = $state<GeneratorId>(generators[0].id);
  let searchQuery = $state("");
  let useAI = $state(true);
  let instructions = $state("");
  let primaryLanguageId = $state("");
  let optionValues = $state<Record<string, unknown>>({});
  let lastOptionsGeneratorId = $state<GeneratorId | null>(null);

  const normalizedQuery = $derived(searchQuery.trim().toLowerCase());

  function matchesQuery(gen: (typeof generators)[number]): boolean {
    if (!normalizedQuery) return true;
    const labelMatch = gen.label.toLowerCase().includes(normalizedQuery);
    const descMatch = gen.description.toLowerCase().includes(normalizedQuery);
    const typeLabel = resolveEntityTypeLabel(gen).toLowerCase();
    const typeMatch =
      typeLabel.includes(normalizedQuery) ||
      gen.entityType.toLowerCase().includes(normalizedQuery);
    return labelMatch || descMatch || typeMatch;
  }

  const filteredGenerators = $derived(generators.filter(matchesQuery));
  const favoriteGenerators = $derived(
    filteredGenerators.filter((g) => favoritesStore.isFavorite(g.id)),
  );
  const allFilteredGenerators = $derived(
    filteredGenerators.filter((g) => !favoritesStore.isFavorite(g.id)),
  );

  // Group generators by category/entityType
  interface GeneratorGroup {
    id: string;
    label: string;
    generators: typeof generators;
  }

  const generatorGroups = $derived.by(() => {
    const map = new Map<string, { label: string; items: typeof generators }>();
    for (const gen of allFilteredGenerators) {
      const typeLabel = resolveEntityTypeLabel(gen);
      const groupKey = gen.entityType;
      if (!map.has(groupKey)) {
        map.set(groupKey, { label: typeLabel, items: [] });
      }
      map.get(groupKey)!.items.push(gen);
    }
    const groups: GeneratorGroup[] = [];
    for (const [id, data] of map.entries()) {
      groups.push({
        id,
        label: data.label,
        generators: data.items,
      });
    }
    return groups;
  });

  // Track collapsed state per group id; default is collapsed
  let collapsedGroups = $state<Record<string, boolean>>({});

  function isGroupCollapsed(groupId: string): boolean {
    // When actively searching, expand all matching groups
    if (normalizedQuery) return false;
    return collapsedGroups[groupId] ?? true;
  }

  function toggleGroupCollapsed(groupId: string) {
    const current = isGroupCollapsed(groupId);
    collapsedGroups = {
      ...collapsedGroups,
      [groupId]: !current,
    };
  }

  const selectedGenerator = $derived(getGenerator(selectedId));
  const supportsPrimaryLanguage = $derived(
    ["npc", "faction", "settlement", "ship"].includes(selectedId),
  );
  const suggestedLanguage = $derived(
    languages.find((language) => language.id === suggestedLanguageId),
  );
  const dungeonGenre = $derived(themeIdToLabel[themeId] ?? "Classic Fantasy");
  const availableDungeonPurposes = $derived(
    forDungeonGenre(dungeonConfig.purposesByGenre, dungeonGenre),
  );
  const availableDungeonStates = $derived(
    forDungeonGenre(dungeonConfig.currentStatesByGenre, dungeonGenre),
  );
  const visibleOptions = $derived(
    selectedGenerator.options.filter((option) => {
      if (!option.visibleWhen) return true;
      const currentValue = stringValue(option.visibleWhen.optionId);
      if (
        option.visibleWhen.values &&
        !option.visibleWhen.values.includes(currentValue)
      ) {
        return false;
      }
      if (option.visibleWhen.notValues?.includes(currentValue)) return false;
      return true;
    }),
  );

  function choicesForOption(option: {
    id: string;
    choices?: Array<{ value: string; label: string }>;
  }): Array<{ value: string; label: string }> {
    if (selectedId === "world" && option.id === "campaignPressure") {
      const values =
        stringValue("genre") === "Lancer"
          ? worldConfig.lancerConflicts
          : worldConfig.campaignPressures;
      return values.map((value) => ({ value, label: value }));
    }
    if (selectedId === "npc" && option.id === "race") {
      return npcRacesForTheme(themeId).map((value) => ({
        value,
        label: value,
      }));
    }
    if (selectedId === "npc" && option.id === "role") {
      return npcRolesForTheme(themeId).map((value) => ({
        value,
        label: value,
      }));
    }
    if (selectedId === "faction" && option.id === "type") {
      return factionTypesForTheme(themeId).map((value) => ({
        value,
        label: value,
      }));
    }
    if (selectedId === "settlement" && option.id === "type") {
      return settlementTypesForTheme(themeId).map((value) => ({
        value,
        label: value,
      }));
    }
    if (selectedId !== "dungeon") return option.choices ?? [];
    if (option.id === "purpose") {
      return availableDungeonPurposes.map((value) => ({ value, label: value }));
    }
    if (option.id === "currentState") {
      return availableDungeonStates.map((value) => ({ value, label: value }));
    }
    return option.choices ?? [];
  }

  $effect(() => {
    if (generatorId) selectedId = generatorId;
  });
  $effect(() => {
    if (lastOptionsGeneratorId === selectedId) return;
    lastOptionsGeneratorId = selectedId;
    const definition = getGenerator(selectedId);
    const previousValues = optionValues;
    // ⚡ Bolt Optimization: Replace Object.fromEntries(array.map(...)) with an imperative loop
    // to prevent intermediate array allocations and reduce GC overhead.
    const nextValues: Record<string, unknown> = {};
    for (const option of definition.options) {
      nextValues[option.id] =
        typeof previousValues[option.id] !== "undefined"
          ? previousValues[option.id]
          : (definition.defaults[option.id] ?? option.defaultValue ?? "");
    }
    optionValues = nextValues;
  });
  $effect(() => {
    if (selectedId !== "dungeon") return;
    const nextValues = { ...optionValues };
    let changed = false;
    const purpose = nextValues.purpose;
    if (
      typeof purpose === "string" &&
      dungeonConfig.purposes.includes(purpose) &&
      !availableDungeonPurposes.includes(purpose)
    ) {
      nextValues.purpose = availableDungeonPurposes[0] ?? "";
      changed = true;
    }
    const currentState = nextValues.currentState;
    if (
      typeof currentState === "string" &&
      dungeonConfig.currentStates.includes(currentState) &&
      !availableDungeonStates.includes(currentState)
    ) {
      nextValues.currentState = availableDungeonStates[0] ?? "";
      changed = true;
    }
    if (changed) optionValues = nextValues;
  });
  function updateOptionValue(optionId: string, value: unknown) {
    const nextValues = {
      ...optionValues,
      [optionId]: value,
    };
    if (selectedId === "world" && optionId === "genre") {
      const availablePressures: readonly string[] =
        value === "Lancer"
          ? worldConfig.lancerConflicts
          : worldConfig.campaignPressures;
      const currentPressure = optionValues.campaignPressure;
      const knownPressures: readonly string[] = [
        ...worldConfig.campaignPressures,
        ...worldConfig.lancerConflicts,
      ];
      if (
        typeof currentPressure !== "string" ||
        (knownPressures.includes(currentPressure) &&
          !availablePressures.includes(currentPressure))
      ) {
        nextValues.campaignPressure = availablePressures[0] ?? "";
      }
    }
    optionValues = nextValues;
  }

  function stringValue(optionId: string): string {
    const value = optionValues[optionId];
    return typeof value === "string" ? value : "";
  }

  function numberValue(optionId: string): number | undefined {
    const value = optionValues[optionId];
    return typeof value === "number" ? value : undefined;
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    generatorId = selectedId;
    onsubmit({
      generatorId: selectedId,
      options: optionValues,
      useAI: aiAvailable && useAI,
      instructions: instructions.trim() || undefined,
      primaryLanguageId:
        supportsPrimaryLanguage && primaryLanguageId
          ? primaryLanguageId
          : undefined,
    });
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
  <!-- Generator Search & Filter -->
  <div class="relative">
    <label for="generator-search-input" class="sr-only">Search generators</label
    >
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

  {#if favoriteGenerators.length > 0}
    <fieldset class="flex flex-col gap-2">
      <legend
        class="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--star] h-3.5 w-3.5 fill-amber-400 text-amber-400"
        ></span>
        Favourites
      </legend>
      {#each favoriteGenerators as gen (gen.id)}
        {@const entityTypeLabel = resolveEntityTypeLabel(gen)}
        {@const isFav = favoritesStore.isFavorite(gen.id)}
        <div
          class={[
            "group relative flex items-start rounded-lg border transition-colors",
            selectedId === gen.id
              ? "border-chrome-accent/60 bg-chrome-accent/10"
              : "border-chrome-border bg-chrome-bg/30 hover:border-chrome-accent/35 hover:bg-chrome-bg/60",
          ]}
        >
          <label
            class="flex flex-1 cursor-pointer items-start gap-3 px-3 py-2.5"
          >
            <input
              type="radio"
              name="generator"
              value={gen.id}
              bind:group={selectedId}
              {disabled}
              aria-labelledby="fav-generator-label-{gen.id}"
              aria-describedby={selectedId === gen.id
                ? `fav-generator-description-${gen.id}`
                : undefined}
              class="mt-1 accent-chrome-accent"
            />
            <span class="min-w-0 flex-1 pr-6">
              <span
                id="fav-generator-label-{gen.id}"
                class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
              >
                <span class="text-sm font-semibold text-chrome-text">
                  {gen.label}
                </span>
                <span
                  class="text-[10px] uppercase tracking-wider text-chrome-muted"
                >
                  Creates {entityTypeLabel}
                </span>
              </span>
              {#if selectedId === gen.id}
                <span
                  id="fav-generator-description-{gen.id}"
                  class="mt-1 block text-xs leading-relaxed text-chrome-muted"
                >
                  {gen.description}
                </span>
              {/if}
            </span>
          </label>
          <button
            type="button"
            onclick={(e) => {
              e.stopPropagation();
              favoritesStore.toggleFavorite(gen.id);
            }}
            class="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded text-chrome-muted transition hover:text-amber-400 focus:outline-none focus:ring-1 focus:ring-chrome-accent"
            aria-label={isFav
              ? `Remove ${gen.label} from favourites`
              : `Add ${gen.label} to favourites`}
            aria-pressed={isFav}
            {disabled}
            title={isFav ? "Remove from favourites" : "Add to favourites"}
          >
            <span
              aria-hidden="true"
              class={[
                "h-4 w-4 transition-transform group-hover:scale-110",
                isFav
                  ? "icon-[lucide--star] fill-amber-400 text-amber-400"
                  : "icon-[lucide--star] text-chrome-muted hover:text-amber-400",
              ]}
            ></span>
          </button>
        </div>
      {/each}
    </fieldset>
  {:else if !searchQuery}
    <p class="text-xs text-chrome-muted/70 italic">
      Star generators you use often to keep them at the top.
    </p>
  {/if}

  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span
        class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
      >
        All Generators
      </span>
    </div>
    {#if allFilteredGenerators.length === 0}
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
              class="rounded-full bg-chrome-bg/60 px-2 py-0.5 text-[10px] font-medium text-chrome-muted"
            >
              {group.generators.length}
            </span>
          </button>

          {#if !isCollapsed}
            <div
              class="flex flex-col gap-2 border-t border-chrome-border/50 p-2.5"
            >
              {#each group.generators as gen (gen.id)}
                {@const entityTypeLabel = resolveEntityTypeLabel(gen)}
                {@const isFav = favoritesStore.isFavorite(gen.id)}
                <div
                  class={[
                    "group relative flex items-start rounded-lg border transition-colors",
                    selectedId === gen.id
                      ? "border-chrome-accent/60 bg-chrome-accent/10"
                      : "border-chrome-border bg-chrome-bg/30 hover:border-chrome-accent/35 hover:bg-chrome-bg/60",
                  ]}
                >
                  <label
                    class="flex flex-1 cursor-pointer items-start gap-3 px-3 py-2.5"
                  >
                    <input
                      type="radio"
                      name="generator"
                      value={gen.id}
                      bind:group={selectedId}
                      {disabled}
                      aria-labelledby="generator-label-{gen.id}"
                      aria-describedby={selectedId === gen.id
                        ? `generator-description-${gen.id}`
                        : undefined}
                      class="mt-1 accent-chrome-accent"
                    />
                    <span class="min-w-0 flex-1 pr-6">
                      <span
                        id="generator-label-{gen.id}"
                        class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
                      >
                        <span class="text-sm font-semibold text-chrome-text">
                          {gen.label}
                        </span>
                        <span
                          class="text-[10px] uppercase tracking-wider text-chrome-muted"
                        >
                          Creates {entityTypeLabel}
                        </span>
                      </span>
                      {#if selectedId === gen.id}
                        <span
                          id="generator-description-{gen.id}"
                          class="mt-1 block text-xs leading-relaxed text-chrome-muted"
                        >
                          {gen.description}
                        </span>
                      {/if}
                    </span>
                  </label>
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      favoritesStore.toggleFavorite(gen.id);
                    }}
                    class="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded text-chrome-muted transition hover:text-amber-400 focus:outline-none focus:ring-1 focus:ring-chrome-accent"
                    aria-label={isFav
                      ? `Remove ${gen.label} from favourites`
                      : `Add ${gen.label} to favourites`}
                    aria-pressed={isFav}
                    {disabled}
                    title={isFav
                      ? "Remove from favourites"
                      : "Add to favourites"}
                  >
                    <span
                      aria-hidden="true"
                      class={[
                        "h-4 w-4 transition-transform group-hover:scale-110",
                        isFav
                          ? "icon-[lucide--star] fill-amber-400 text-amber-400"
                          : "icon-[lucide--star] text-chrome-muted hover:text-amber-400",
                      ]}
                    ></span>
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  {#if visibleOptions.length > 0}
    <fieldset class="flex flex-col gap-3">
      <legend
        class="mb-1 text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
      >
        Generator options
      </legend>
      {#each visibleOptions as option (option.id)}
        {@const inputId = `generator-option-${option.id}`}
        {#if option.control === "select" && option.choices}
          <SelectWithCustomOption
            id={inputId}
            name={option.id}
            label={option.label}
            value={stringValue(option.id)}
            onvaluechange={(nextValue) =>
              updateOptionValue(option.id, nextValue)}
            choices={choicesForOption(option)}
            {disabled}
            className="flex flex-col gap-1.5"
            labelClass="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
            inputClass="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
            customPlaceholder={`Enter a custom ${option.label.toLowerCase()}`}
          />
        {:else if option.control === "checkbox"}
          <label class="flex cursor-pointer items-center gap-2">
            <input
              id={inputId}
              type="checkbox"
              checked={Boolean(optionValues[option.id])}
              onchange={(event) =>
                updateOptionValue(
                  option.id,
                  (event.currentTarget as HTMLInputElement).checked,
                )}
              {disabled}
              class="accent-chrome-accent"
            />
            <span class="text-sm text-chrome-text">{option.label}</span>
          </label>
        {:else if option.control === "textarea"}
          <div class="flex flex-col gap-1">
            <label
              for={inputId}
              class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
            >
              {option.label}
            </label>
            <textarea
              id={inputId}
              rows={3}
              value={stringValue(option.id)}
              oninput={(event) =>
                updateOptionValue(
                  option.id,
                  (event.currentTarget as HTMLTextAreaElement).value,
                )}
              {disabled}
              class="w-full resize-y rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
            ></textarea>
          </div>
        {:else if option.control === "number"}
          <div class="flex flex-col gap-1">
            <label
              for={inputId}
              class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
            >
              {option.label}
            </label>
            <input
              id={inputId}
              type="number"
              value={numberValue(option.id)}
              oninput={(event) => {
                const rawValue = (event.currentTarget as HTMLInputElement)
                  .value;
                updateOptionValue(
                  option.id,
                  rawValue === "" ? "" : Number(rawValue),
                );
              }}
              {disabled}
              class="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
            />
          </div>
        {:else}
          <div class="flex flex-col gap-1">
            <label
              for={inputId}
              class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
            >
              {option.label}
            </label>
            <input
              id={inputId}
              type="text"
              value={stringValue(option.id)}
              oninput={(event) =>
                updateOptionValue(
                  option.id,
                  (event.currentTarget as HTMLInputElement).value,
                )}
              {disabled}
              class="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
            />
          </div>
        {/if}
      {/each}
    </fieldset>
  {/if}

  {#if supportsPrimaryLanguage && languages.length}
    <div class="flex flex-col gap-1.5">
      <label
        for="generator-primary-language"
        class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
      >
        Naming language
      </label>
      <select
        id="generator-primary-language"
        name="primaryLanguageId"
        bind:value={primaryLanguageId}
        aria-describedby="generator-primary-language-help"
        {disabled}
        class="min-h-12 w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-base leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
      >
        <option value="">No saved language</option>
        {#each languages as language (language.id)}
          <option value={language.id}>
            {language.title}{language.legacy ? " (legacy notes)" : ""}
          </option>
        {/each}
      </select>
      <p
        id="generator-primary-language-help"
        class="text-xs leading-relaxed text-chrome-muted"
      >
        {#if suggestedLanguage && !primaryLanguageId}
          Suggested from the source relationship: {suggestedLanguage.title}.
          Select it above to apply its rules.
        {:else if primaryLanguageId}
          Only this language supplies authoritative naming and terminology
          rules.
        {:else}
          No saved language rules will be applied.
        {/if}
      </p>
    </div>
  {/if}

  <div class="flex flex-col gap-1">
    <label
      for="gen-instructions"
      class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
    >
      Instructions <span class="normal-case font-normal">(optional)</span>
    </label>
    <textarea
      id="gen-instructions"
      bind:value={instructions}
      {disabled}
      rows={3}
      placeholder="e.g. Make them a spy working for the Thieves Guild, female, morally grey…"
      class="w-full resize-none rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition placeholder:text-chrome-muted/60 focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
    ></textarea>
  </div>

  {#if aiAvailable}
    <label class="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        bind:checked={useAI}
        {disabled}
        class="accent-chrome-accent"
        data-testid="use-ai-toggle"
      />
      <span class="text-sm text-chrome-text">Use AI generation</span>
    </label>
  {:else if aiUnavailableReason}
    <p
      class="rounded border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-400"
      data-testid="ai-unavailable-notice"
    >
      {aiUnavailableReason}
    </p>
  {/if}

  <div class="flex justify-end border-t border-chrome-border pt-4">
    <button
      type="submit"
      {disabled}
      class="px-5 py-2 bg-chrome-accent text-chrome-surface font-bold uppercase tracking-wider text-xs rounded-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
    >
      Generate
    </button>
  </div>
</form>
