<script lang="ts">
  import type {
    SilhouetteGenre,
    SilhouetteCategory,
    SilhouetteDefinition,
  } from "schema";
  import { SILHOUETTES, resolveEntitySilhouette } from "schema";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import SilhouetteGlyph from "$lib/components/ui/SilhouetteGlyph.svelte";

  const entity = $derived(modalUIStore.silhouettePickerState.entity);
  const currentTheme = $derived(themeStore.activeTheme?.id || "default");

  let searchQuery = $state("");
  let selectedGenre = $state<SilhouetteGenre | "all">("all");
  let selectedCategory = $state<SilhouetteCategory | "all">("all");
  let hoveredSilhouette = $state<SilhouetteDefinition | null>(null);

  // Initial selection is either existing silhouette or the auto-inferred best match
  const autoMatch = $derived.by(() => {
    if (!entity) return SILHOUETTES[0];
    return resolveEntitySilhouette(entity, { worldTheme: currentTheme });
  });

  let activeSelectedId = $state<string>("");
  let isSaving = $state(false);

  $effect(() => {
    if (entity) {
      activeSelectedId = entity.silhouette || autoMatch.id;
    }
  });

  const selectedSilhouette = $derived.by(() => {
    return SILHOUETTES.find((s) => s.id === activeSelectedId) || autoMatch;
  });

  const previewSilhouette = $derived(hoveredSilhouette || selectedSilhouette);

  const filteredSilhouettes = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    return SILHOUETTES.filter((s) => {
      // Genre filter
      if (selectedGenre !== "all" && !s.genres.includes(selectedGenre)) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && s.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (q) {
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesArchetype = s.archetype.toLowerCase().includes(q);
        const matchesTags = s.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesArchetype && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  });

  const genreChips: { id: SilhouetteGenre | "all"; label: string }[] = [
    { id: "all", label: "All Genres" },
    { id: "fantasy", label: "Fantasy" },
    { id: "gothic", label: "Gothic / Occult" },
    { id: "scifi", label: "Sci-Fi" },
    { id: "cyberpunk", label: "Cyberpunk" },
    { id: "western", label: "Western" },
    { id: "cosmic-horror", label: "Cosmic Horror" },
  ];

  const categoryChips: { id: SilhouetteCategory | "all"; label: string }[] = [
    { id: "all", label: "All Types" },
    { id: "character", label: "Characters" },
    { id: "creature", label: "Creatures" },
    { id: "location", label: "Locations" },
    { id: "item", label: "Items" },
    { id: "faction", label: "Factions" },
  ];

  async function handleSave() {
    if (!entity || isSaving) return;
    isSaving = true;
    try {
      await vault.updateEntity(entity.id, {
        silhouette: activeSelectedId,
      });
      notificationStore.notify(
        `Set silhouette for "${entity.title}".`,
        "success",
      );
      modalUIStore.closeSilhouettePicker();
    } catch (err) {
      console.error("[SilhouettePickerModal] Failed to save silhouette:", err);
      notificationStore.notify("Could not save silhouette to entity.", "error");
    } finally {
      isSaving = false;
    }
  }

  async function handleResetAuto() {
    if (!entity || isSaving) return;
    isSaving = true;
    try {
      await vault.updateEntity(entity.id, {
        silhouette: undefined,
      });
      notificationStore.notify(`Restored auto-detect silhouette.`, "info");
      modalUIStore.closeSilhouettePicker();
    } catch (err) {
      console.error("[SilhouettePickerModal] Failed to reset silhouette:", err);
    } finally {
      isSaving = false;
    }
  }

  function handleClose() {
    modalUIStore.closeSilhouettePicker();
  }
</script>

{#if modalUIStore.silhouettePickerState.open && entity}
  <div
    class="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
    aria-labelledby="silhouette-picker-title"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === "Escape") handleClose();
    }}
    onclick={(e) => {
      if (e.target === e.currentTarget) handleClose();
    }}
  >
    <div
      class="flex flex-col w-full h-full md:h-auto md:max-w-5xl md:max-h-[90vh] rounded-none md:rounded-xl bg-theme-surface border-0 md:border border-theme-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-theme-border/60 bg-theme-base/40"
      >
        <div>
          <h2
            id="silhouette-picker-title"
            class="text-lg font-semibold text-theme-primary flex items-center gap-2"
          >
            <span class="icon-[lucide--user] h-5 w-5 text-theme-accent"></span>
            Choose Entity Silhouette
          </h2>
          <p class="text-xs text-theme-muted mt-0.5">
            Select a vector silhouette for <strong class="text-theme-primary"
              >{entity.title}</strong
            >
          </p>
        </div>
        <button
          type="button"
          onclick={handleClose}
          class="p-1.5 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-border/40 transition-colors"
          aria-label="Close modal"
        >
          <span class="icon-[lucide--x] h-5 w-5"></span>
        </button>
      </div>

      <!-- Controls: Search & Filters -->
      <div
        class="p-3 md:p-4 border-b border-theme-border/40 bg-theme-surface space-y-2.5 md:space-y-3"
      >
        <!-- Search Input -->
        <div class="relative">
          <span
            class="icon-[lucide--search] absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted"
          ></span>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search by archetype, name, or keywords (e.g. vampire, blade, knight, village, tavern)..."
            class="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-theme-base border border-theme-border/60 text-theme-primary placeholder-theme-muted/60 focus:outline-hidden focus:border-theme-accent focus:ring-1 focus:ring-theme-accent/30 transition-colors"
          />
          {#if searchQuery}
            <button
              type="button"
              onclick={() => (searchQuery = "")}
              class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-primary"
              aria-label="Clear search"
            >
              <span class="icon-[lucide--x] h-3.5 w-3.5"></span>
            </button>
          {/if}
        </div>

        <!-- Filter Chips: Genre -->
        <div
          class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs"
        >
          {#each genreChips as chip}
            <button
              type="button"
              onclick={() => (selectedGenre = chip.id)}
              class="px-2.5 py-1 rounded-full whitespace-nowrap transition-colors {selectedGenre ===
              chip.id
                ? 'bg-theme-accent text-theme-accent-contrast font-medium'
                : 'bg-theme-base/80 text-theme-muted hover:text-theme-primary hover:bg-theme-border/40 border border-theme-border/40'}"
            >
              {chip.label}
            </button>
          {/each}
        </div>

        <!-- Filter Chips: Category -->
        <div class="flex items-center gap-1.5 overflow-x-auto text-xs">
          {#each categoryChips as chip}
            <button
              type="button"
              onclick={() => (selectedCategory = chip.id)}
              class="px-2 py-0.5 rounded-md whitespace-nowrap transition-colors {selectedCategory ===
              chip.id
                ? 'bg-theme-border text-theme-primary font-medium'
                : 'text-theme-muted hover:text-theme-primary hover:bg-theme-base/60'}"
            >
              {chip.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Main Split: Grid on Left, Large Live Preview on Right -->
      <div class="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
        <!-- Left: Grid Area -->
        <div
          class="flex-1 overflow-y-auto p-3 md:p-5 space-y-3 md:space-y-4 border-b md:border-b-0 md:border-r border-theme-border/40"
        >
          <!-- Auto-match suggestion header if unconfigured -->
          {#if !entity.silhouette && !searchQuery && selectedGenre === "all" && selectedCategory === "all"}
            <div
              class="p-3 rounded-lg bg-theme-accent/10 border border-theme-accent/30 flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 p-1.5 rounded-lg bg-theme-surface text-theme-accent border border-theme-accent/30 flex items-center justify-center overflow-hidden"
                >
                  <SilhouetteGlyph
                    silhouette={autoMatch}
                    class="pointer-events-none"
                    eager
                  />
                </div>
                <div>
                  <div
                    class="flex items-center gap-2 text-xs font-semibold text-theme-accent"
                  >
                    <span class="icon-[lucide--sparkles] h-3.5 w-3.5"></span>
                    Auto-Inferred Match
                  </div>
                  <div class="text-sm font-medium text-theme-primary">
                    {autoMatch.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onclick={() => (activeSelectedId = autoMatch.id)}
                class="text-xs px-3 py-1.5 rounded-lg bg-theme-accent text-theme-accent-contrast font-medium hover:opacity-90 transition-opacity"
              >
                Select Best Match
              </button>
            </div>
          {/if}

          <!-- Grid of Silhouettes -->
          <div
            class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3"
          >
            {#each filteredSilhouettes as s (s.id)}
              {@const isSelected = activeSelectedId === s.id}
              {@const isAuto = autoMatch.id === s.id}
              {@const isHovered = hoveredSilhouette?.id === s.id}
              <button
                type="button"
                onclick={() => (activeSelectedId = s.id)}
                onmouseenter={() => (hoveredSilhouette = s)}
                onmouseleave={() => (hoveredSilhouette = null)}
                onfocus={() => (hoveredSilhouette = s)}
                onblur={() => (hoveredSilhouette = null)}
                class="relative flex flex-col items-center text-center p-3 rounded-xl border transition-all cursor-pointer group overflow-hidden {isSelected
                  ? 'bg-theme-accent/15 border-theme-accent ring-2 ring-theme-accent/40 shadow-sm'
                  : isHovered
                    ? 'bg-theme-base border-theme-accent/60 shadow-xs scale-102'
                    : 'bg-theme-base/40 border-theme-border/50 hover:bg-theme-base hover:border-theme-border'}"
              >
                <!-- Auto Badge -->
                {#if isAuto}
                  <div
                    class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-xs text-[9px] font-semibold bg-theme-accent/20 text-theme-accent border border-theme-accent/30 flex items-center gap-1"
                  >
                    <span class="icon-[lucide--sparkles] h-2.5 w-2.5"></span>
                    auto
                  </div>
                {/if}

                <!-- Selection Check -->
                {#if isSelected}
                  <div
                    class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-theme-accent text-theme-accent-contrast flex items-center justify-center"
                  >
                    <span class="icon-[lucide--check] h-3 w-3"></span>
                  </div>
                {/if}

                <!-- Vector Canvas Thumbnail -->
                <div
                  class="w-14 h-14 p-1.5 rounded-lg bg-theme-surface/80 text-theme-primary group-hover:text-theme-accent group-hover:scale-105 transition-all duration-150 flex items-center justify-center my-1 shadow-inner overflow-hidden"
                >
                  <SilhouetteGlyph silhouette={s} class="pointer-events-none" />
                </div>

                <!-- Name & Archetype -->
                <div
                  class="text-xs font-semibold text-theme-primary truncate max-w-full mt-1"
                >
                  {s.name}
                </div>
                <div class="text-[10px] text-theme-muted capitalize mt-0.5">
                  {s.archetype}
                </div>
              </button>
            {/each}
          </div>

          {#if filteredSilhouettes.length === 0}
            <div class="py-12 text-center text-theme-muted space-y-2">
              <span class="icon-[lucide--search-x] h-8 w-8 mx-auto opacity-50"
              ></span>
              <p class="text-sm">No silhouettes match your current filters.</p>
              <button
                type="button"
                onclick={() => {
                  searchQuery = "";
                  selectedGenre = "all";
                  selectedCategory = "all";
                }}
                class="text-xs text-theme-accent hover:underline"
              >
                Clear filters
              </button>
            </div>
          {/if}
        </div>

        <!-- Right: Large Live Preview Panel (desktop only — on a phone this
             column would eat the grid it is meant to support) -->
        <div
          class="hidden md:flex w-full md:w-80 shrink-0 bg-theme-base/20 p-5 flex-col justify-between overflow-y-auto"
        >
          <div class="w-full flex flex-col items-center text-center space-y-4">
            <!-- Status Badge -->
            <div
              class="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full {hoveredSilhouette
                ? 'bg-theme-accent/20 text-theme-accent border border-theme-accent/40'
                : 'bg-theme-border/60 text-theme-muted'}"
            >
              {#if hoveredSilhouette}
                <span class="icon-[lucide--eye] h-3 w-3"></span>
                Hover Preview
              {:else if activeSelectedId === previewSilhouette.id}
                <span
                  class="icon-[lucide--check-circle] h-3 w-3 text-theme-accent"
                ></span>
                Active Selection
              {:else}
                <span class="icon-[lucide--sparkles] h-3 w-3 text-theme-accent"
                ></span>
                Auto-Detected
              {/if}
            </div>

            <!-- Large Silhouette Display Canvas -->
            <div
              class="relative w-52 h-52 md:w-60 md:h-60 p-4 rounded-2xl bg-theme-surface/90 border border-theme-border shadow-xl flex items-center justify-center text-theme-primary overflow-hidden"
            >
              <div
                class="absolute inset-0 bg-radial from-theme-primary/15 via-transparent to-transparent pointer-events-none"
              ></div>
              <div
                class="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-200 pointer-events-none"
              >
                <SilhouetteGlyph silhouette={previewSilhouette} eager />
              </div>
            </div>

            <!-- Info Heading -->
            <div class="w-full space-y-1">
              <h3 class="text-base font-bold text-theme-primary tracking-wide">
                {previewSilhouette.name}
              </h3>
              <div
                class="flex items-center justify-center gap-1.5 text-xs text-theme-muted"
              >
                <span class="capitalize font-medium text-theme-accent"
                  >{previewSilhouette.category}</span
                >
                <span>•</span>
                <span class="capitalize">{previewSilhouette.archetype}</span>
                {#if previewSilhouette.gender && previewSilhouette.gender !== "neutral"}
                  <span>•</span>
                  <span class="capitalize">{previewSilhouette.gender}</span>
                {/if}
              </div>
            </div>

            <!-- Tags & Keywords -->
            <div
              class="w-full pt-3 border-t border-theme-border/30 space-y-2 text-left"
            >
              <div
                class="text-[10px] uppercase font-bold tracking-wider text-theme-muted"
              >
                Keywords & Tags
              </div>
              <div class="flex flex-wrap gap-1">
                {#each previewSilhouette.tags as tag}
                  <span
                    class="px-2 py-0.5 rounded-md text-[10px] bg-theme-base/80 border border-theme-border/60 text-theme-text/80"
                  >
                    {tag}
                  </span>
                {/each}
              </div>
            </div>
          </div>

          <!-- Quick Select CTA button if hovered card is not currently selected -->
          {#if hoveredSilhouette && activeSelectedId !== hoveredSilhouette.id}
            <button
              type="button"
              onclick={() => (activeSelectedId = hoveredSilhouette!.id)}
              class="w-full mt-4 py-2 px-3 rounded-lg text-xs font-semibold bg-theme-accent/20 hover:bg-theme-accent hover:text-theme-accent-contrast text-theme-accent border border-theme-accent/40 transition-all flex items-center justify-center gap-1.5"
            >
              <span class="icon-[lucide--pointer] h-3.5 w-3.5"></span>
              Select {hoveredSilhouette.name}
            </button>
          {/if}
        </div>
      </div>

      <!-- What is selected, for phones, where the preview column is hidden.
           One line so the grid above it keeps the screen. -->
      <div
        class="md:hidden flex items-center gap-3 px-4 py-2 border-t border-theme-border/40 bg-theme-base/30"
        data-testid="silhouette-picker-mobile-summary"
      >
        <div
          class="w-9 h-9 shrink-0 p-1 rounded-lg bg-theme-surface text-theme-accent border border-theme-border/60 flex items-center justify-center overflow-hidden"
        >
          <SilhouetteGlyph
            silhouette={selectedSilhouette}
            class="pointer-events-none"
            eager
          />
        </div>
        <div class="min-w-0">
          <div class="text-sm font-medium text-theme-primary truncate">
            {selectedSilhouette.name}
          </div>
          <div class="text-[11px] text-theme-muted capitalize truncate">
            {selectedSilhouette.category} &middot; {selectedSilhouette.archetype}
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div
        class="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-t border-theme-border/60 bg-theme-base/40"
      >
        <div>
          {#if entity.silhouette}
            <button
              type="button"
              onclick={handleResetAuto}
              disabled={isSaving}
              class="text-xs text-theme-muted hover:text-theme-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-theme-border/30 transition-colors disabled:opacity-50"
            >
              <span class="icon-[lucide--rotate-ccw] h-3.5 w-3.5"></span>
              Reset to Auto-Detect
            </button>
          {/if}
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            onclick={handleClose}
            disabled={isSaving}
            class="px-4 py-2 text-xs font-medium rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-border/40 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={handleSave}
            disabled={isSaving}
            class="px-4 py-2 text-xs font-medium rounded-lg bg-theme-accent text-theme-accent-contrast hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <span class="icon-[lucide--check] h-4 w-4"></span>
            {isSaving ? "Saving..." : "Apply Silhouette"}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
