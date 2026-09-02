<script lang="ts">
  import { base } from "$app/paths";
  import { SILHOUETTES } from "schema";
  import type {
    SilhouetteDefinition,
    SilhouetteGenre,
    SilhouetteCategory,
  } from "schema";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";

  interface ThemePalette {
    id: string;
    name: string;
    color: string;
    bgGlow: string;
    description: string;
  }

  const PALETTES: ThemePalette[] = [
    {
      id: "amber",
      name: "Amber Gold",
      color: "#d4af37",
      bgGlow: "rgba(212, 175, 55, 0.15)",
      description: "Classic fantasy & antique parchment gold",
    },
    {
      id: "crimson",
      name: "Blood Crimson",
      color: "#e11d48",
      bgGlow: "rgba(225, 29, 72, 0.15)",
      description: "Gothic horror, vampire clans & combat",
    },
    {
      id: "neon-cyan",
      name: "Neon Cyan",
      color: "#06b6d4",
      bgGlow: "rgba(6, 182, 212, 0.15)",
      description: "Cyberpunk terminals & sci-fi holograms",
    },
    {
      id: "sylvan-emerald",
      name: "Sylvan Emerald",
      color: "#10b981",
      bgGlow: "rgba(16, 185, 129, 0.15)",
      description: "Ancient forests, druidic lore & relics",
    },
    {
      id: "void-amethyst",
      name: "Void Amethyst",
      color: "#a855f7",
      bgGlow: "rgba(168, 85, 247, 0.15)",
      description: "Cosmic occult, arcane spires & the void",
    },
    {
      id: "monochrome",
      name: "Monochrome",
      color: "#e2e8f0",
      bgGlow: "rgba(226, 232, 240, 0.12)",
      description: "Clean stark contrast, print & linework",
    },
  ];

  const GENRE_CHIPS: { id: SilhouetteGenre | "all"; label: string }[] = [
    { id: "all", label: "All Genres" },
    { id: "fantasy", label: "Fantasy" },
    { id: "gothic", label: "Gothic / Occult" },
    { id: "scifi", label: "Sci-Fi" },
    { id: "cyberpunk", label: "Cyberpunk" },
    { id: "western", label: "Western" },
    { id: "cosmic-horror", label: "Cosmic Horror" },
  ];

  const CATEGORY_CHIPS: { id: SilhouetteCategory | "all"; label: string }[] = [
    { id: "all", label: "All Types" },
    { id: "character", label: "Characters" },
    { id: "creature", label: "Creatures" },
    { id: "location", label: "Locations" },
    { id: "item", label: "Items" },
    { id: "faction", label: "Factions" },
  ];

  // State
  let searchQuery = $state("");
  let selectedGenre = $state<SilhouetteGenre | "all">("all");
  let selectedCategory = $state<SilhouetteCategory | "all">("all");
  let selectedPalette = $state<ThemePalette>(PALETTES[0]);

  // Active selection & hover state
  let selectedSilhouetteId = $state<string>(SILHOUETTES[0]?.id ?? "");
  let hoveredSilhouette = $state<SilhouetteDefinition | null>(null);

  // Toast notification state
  let toastMessage = $state<string | null>(null);
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;
  let copiedAction = $state<"svg" | "cdn" | null>(null);

  function showToast(msg: string, action?: "svg" | "cdn") {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMessage = msg;
    if (action) copiedAction = action;
    toastTimeout = setTimeout(() => {
      toastMessage = null;
      copiedAction = null;
    }, 2400);
  }

  // Derived active silhouette
  const selectedSilhouette = $derived.by(() => {
    const match = filteredSilhouettes.find(
      (s) => s.id === selectedSilhouetteId,
    );
    if (match) return match;
    return filteredSilhouettes[0] || SILHOUETTES[0];
  });

  const previewSilhouette = $derived(hoveredSilhouette || selectedSilhouette);

  // Filtered list
  const filteredSilhouettes = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    return SILHOUETTES.filter((s) => {
      if (selectedGenre !== "all" && !s.genres.includes(selectedGenre)) {
        return false;
      }
      if (selectedCategory !== "all" && s.category !== selectedCategory) {
        return false;
      }
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

  function clearAllFilters() {
    searchQuery = "";
    selectedGenre = "all";
    selectedCategory = "all";
  }

  function getExportSvg(svg: string, color: string): string {
    return svg.replace(/fill="currentColor"/g, `fill="${color}"`);
  }

  async function handleCopySvg() {
    if (!previewSilhouette) return;
    try {
      const coloredSvg = getExportSvg(
        previewSilhouette.svgContent,
        selectedPalette.color,
      );
      await navigator.clipboard.writeText(coloredSvg);
      showToast(`Copied ${previewSilhouette.name} SVG markup!`, "svg");
    } catch (err) {
      console.error("Failed to copy SVG:", err);
      showToast("Failed to copy SVG to clipboard.");
    }
  }

  async function handleCopyCdnLink() {
    if (!previewSilhouette) return;
    const cdnUrl = `https://assets.codexcryptica.com/silhouettes/${previewSilhouette.id}.svg`;
    try {
      await navigator.clipboard.writeText(cdnUrl);
      showToast(`Copied CDN URL: ${cdnUrl}`, "cdn");
    } catch (err) {
      console.error("Failed to copy CDN URL:", err);
      showToast("Failed to copy CDN link.");
    }
  }

  function handleDownloadSvg() {
    if (!previewSilhouette) return;
    const coloredSvg = getExportSvg(
      previewSilhouette.svgContent,
      selectedPalette.color,
    );
    const blob = new Blob([coloredSvg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${previewSilhouette.id}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${previewSilhouette.id}.svg`);
  }
</script>

<SeoHead
  title="Vector RPG Silhouettes & Token Art | Codex Cryptica"
  description="Explore 48+ curated, CC-licensed vector RPG silhouettes with live theme palette previews, one-click SVG export, and VTT token assets."
  canonicalUrl={buildAbsoluteUrl("/silhouettes")}
  keywords={[
    "rpg silhouettes",
    "vector rpg tokens",
    "vtt token art",
    "ttrpg svg silhouettes",
    "free tabletop tokens",
    "character silhouettes svg",
  ]}
/>

<!-- Toast notification banner -->
{#if toastMessage}
  <aside
    aria-label="Notification"
    class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-theme-surface/95 border border-theme-accent/60 shadow-2xl text-theme-primary text-xs font-medium backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200"
  >
    <span
      class="icon-[lucide--check-circle-2] h-4 w-4 text-theme-accent shrink-0"
    ></span>
    <span>{toastMessage}</span>
  </aside>
{/if}

<div
  class="min-h-screen bg-theme-base text-theme-primary transition-colors duration-200"
>
  <!-- Hero Section -->
  <header
    class="relative border-b border-theme-border/60 overflow-hidden pt-12 pb-10 px-4 sm:px-6 lg:px-8"
  >
    <!-- Ambient theme-reactive background glow -->
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-80 pointer-events-none transition-all duration-500 rounded-full blur-3xl opacity-30"
      style="background: radial-gradient(circle, {selectedPalette.color} 0%, transparent 70%);"
    ></div>

    <div class="relative max-w-7xl mx-auto space-y-6 text-center">
      <!-- Eyebrow Pill -->
      <div
        class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-theme-surface border border-theme-border/80 shadow-xs"
      >
        <span class="icon-[lucide--sparkles] h-3.5 w-3.5 text-theme-accent"
        ></span>
        <span class="text-theme-muted">Free &amp; Open Assets</span>
        <span class="text-theme-border">•</span>
        <span class="text-theme-primary">48+ Vector Silhouettes</span>
        <span class="text-theme-border">•</span>
        <span class="text-theme-accent font-mono text-[11px]">CC-BY-4.0</span>
      </div>

      <!-- Main Heading -->
      <div class="space-y-3 max-w-3xl mx-auto">
        <h1
          class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-theme-primary"
        >
          Vector RPG Silhouettes &amp; Token Art
        </h1>
        <p class="text-sm sm:text-base text-theme-muted leading-relaxed">
          High-contrast, scalable vector silhouettes for tabletop RPG
          characters, monstrous creatures, places, items, and faction heraldry.
          All 48+ silhouettes are CC-licensed, vector-scaled, and free to use in
          your notes, virtual tabletops, and campaigns.
        </p>
      </div>

      <!-- Live Theme Palette Switcher -->
      <div class="pt-2 max-w-2xl mx-auto">
        <div
          class="p-3.5 rounded-2xl bg-theme-surface/80 border border-theme-border/80 shadow-lg backdrop-blur-xs space-y-2.5"
        >
          <div class="flex items-center justify-between px-1">
            <span
              class="text-xs font-semibold uppercase tracking-wider text-theme-muted flex items-center gap-1.5"
            >
              <span class="icon-[lucide--palette] h-3.5 w-3.5 text-theme-accent"
              ></span>
              Live Theme Palette Preview
            </span>
            <span class="text-xs font-medium text-theme-primary">
              {selectedPalette.name}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {#each PALETTES as palette (palette.id)}
              {@const isSelected = selectedPalette.id === palette.id}
              <button
                type="button"
                onclick={() => (selectedPalette = palette)}
                class="flex items-center gap-2 p-2 rounded-xl text-left border transition-all cursor-pointer {isSelected
                  ? 'bg-theme-base border-theme-accent ring-2 ring-theme-accent/40 shadow-sm'
                  : 'bg-theme-base/50 border-theme-border/60 hover:bg-theme-base hover:border-theme-border'}"
              >
                <span
                  class="w-4 h-4 rounded-full shrink-0 shadow-xs border border-white/20 transition-transform duration-200 {isSelected
                    ? 'scale-115 ring-2 ring-white/40'
                    : ''}"
                  style="background-color: {palette.color};"
                ></span>
                <span
                  class="text-xs font-medium truncate {isSelected
                    ? 'text-theme-primary font-semibold'
                    : 'text-theme-muted'}"
                >
                  {palette.name}
                </span>
              </button>
            {/each}
          </div>
          <div class="text-[11px] text-theme-muted/80 text-left px-1">
            {selectedPalette.description} — dynamically updates vector fills and exports
            below.
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content Container -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Controls Bar: Search & Filter Chips -->
    <section
      class="space-y-4 bg-theme-surface/70 border border-theme-border/70 p-4 sm:p-5 rounded-2xl shadow-sm backdrop-blur-xs"
    >
      <!-- Search Input -->
      <div class="relative">
        <span
          class="icon-[lucide--search] absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted pointer-events-none"
        ></span>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search silhouettes by archetype, title, tags, or keywords (e.g. vampire, knight, tavern, alien, dragon)..."
          class="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl bg-theme-base border border-theme-border/80 text-theme-primary placeholder-theme-muted/60 focus:outline-hidden focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/30 transition-colors shadow-inner"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => (searchQuery = "")}
            class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-primary rounded-md transition-colors"
            aria-label="Clear search query"
          >
            <span class="icon-[lucide--x] h-4 w-4"></span>
          </button>
        {/if}
      </div>

      <!-- Filter Rows: Genre & Category -->
      <div
        class="flex flex-col sm:flex-row gap-4 sm:items-center justify-between pt-1"
      >
        <!-- Genre Filter Chips -->
        <div class="space-y-1.5 flex-1 min-w-0">
          <div
            class="text-[11px] font-semibold uppercase tracking-wider text-theme-muted flex items-center gap-1"
          >
            <span class="icon-[lucide--swords] h-3 w-3 text-theme-accent"
            ></span>
            Genre
          </div>
          <div
            class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs"
          >
            {#each GENRE_CHIPS as chip (chip.id)}
              {@const isActive = selectedGenre === chip.id}
              <button
                type="button"
                data-testid="genre-filter-{chip.id}"
                onclick={() => (selectedGenre = chip.id)}
                class="px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer {isActive
                  ? 'bg-theme-accent text-theme-accent-contrast font-semibold shadow-xs'
                  : 'bg-theme-base text-theme-muted hover:text-theme-primary hover:bg-theme-border/40 border border-theme-border/60'}"
              >
                {chip.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Category Filter Chips -->
        <div class="space-y-1.5 shrink-0">
          <div
            class="text-[11px] font-semibold uppercase tracking-wider text-theme-muted flex items-center gap-1"
          >
            <span class="icon-[lucide--layout-grid] h-3 w-3 text-theme-accent"
            ></span>
            Category
          </div>
          <div
            class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs"
          >
            {#each CATEGORY_CHIPS as chip (chip.id)}
              {@const isActive = selectedCategory === chip.id}
              <button
                type="button"
                data-testid="category-filter-{chip.id}"
                onclick={() => (selectedCategory = chip.id)}
                class="px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer {isActive
                  ? 'bg-theme-border text-theme-primary font-semibold'
                  : 'text-theme-muted hover:text-theme-primary hover:bg-theme-base/80'}"
              >
                {chip.label}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Active Filters Status Bar -->
      <div
        class="flex items-center justify-between text-xs text-theme-muted pt-1 border-t border-theme-border/40"
      >
        <span>
          Showing <strong class="text-theme-primary font-medium"
            >{filteredSilhouettes.length}</strong
          >
          of {SILHOUETTES.length} vector silhouettes
        </span>
        {#if searchQuery || selectedGenre !== "all" || selectedCategory !== "all"}
          <button
            type="button"
            onclick={clearAllFilters}
            class="text-theme-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <span class="icon-[lucide--rotate-ccw] h-3 w-3"></span>
            Reset all filters
          </button>
        {/if}
      </div>
    </section>

    <!-- Split View: Grid & Large Preview Pane -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left: Silhouette Cards Grid (7 or 8 columns on large screens) -->
      <div class="lg:col-span-7 xl:col-span-8 space-y-4">
        {#if filteredSilhouettes.length === 0}
          <div
            class="py-16 text-center rounded-2xl border border-dashed border-theme-border/80 bg-theme-surface/40 p-8 space-y-3"
          >
            <span
              class="icon-[lucide--search-x] h-10 w-10 mx-auto text-theme-muted/50"
            ></span>
            <div class="space-y-1">
              <h3 class="text-base font-semibold text-theme-primary">
                No silhouettes found
              </h3>
              <p class="text-xs text-theme-muted max-w-sm mx-auto">
                No vector silhouettes matched "{searchQuery}" under the selected
                filters.
              </p>
            </div>
            <button
              type="button"
              onclick={clearAllFilters}
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-theme-accent text-theme-accent-contrast hover:opacity-90 transition-opacity cursor-pointer"
            >
              <span class="icon-[lucide--rotate-ccw] h-3.5 w-3.5"></span>
              Clear search &amp; filters
            </button>
          </div>
        {:else}
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {#each filteredSilhouettes as s (s.id)}
              {@const isSelected = selectedSilhouetteId === s.id}
              {@const isHovered = hoveredSilhouette?.id === s.id}
              <button
                type="button"
                data-testid="silhouette-card"
                data-silhouette-id={s.id}
                onclick={() => (selectedSilhouetteId = s.id)}
                onmouseenter={() => (hoveredSilhouette = s)}
                onmouseleave={() => (hoveredSilhouette = null)}
                onfocus={() => (hoveredSilhouette = s)}
                onblur={() => (hoveredSilhouette = null)}
                class="relative flex flex-col items-center text-center p-3.5 rounded-2xl border transition-all cursor-pointer group text-left {isSelected
                  ? 'bg-theme-surface border-theme-accent ring-2 ring-theme-accent/40 shadow-md'
                  : isHovered
                    ? 'bg-theme-surface/90 border-theme-accent/60 shadow-sm scale-102'
                    : 'bg-theme-surface/50 border-theme-border/60 hover:bg-theme-surface hover:border-theme-border'}"
              >
                <!-- Selection Checkmark Badge -->
                {#if isSelected}
                  <div
                    class="absolute top-2 right-2 w-4 h-4 rounded-full bg-theme-accent text-theme-accent-contrast flex items-center justify-center shadow-xs"
                  >
                    <span class="icon-[lucide--check] h-2.5 w-2.5"></span>
                  </div>
                {/if}

                <!-- Category Badge -->
                <div
                  class="self-start text-[9px] uppercase tracking-wider font-semibold text-theme-muted px-1.5 py-0.5 rounded-sm bg-theme-base/60 border border-theme-border/40"
                >
                  {s.category}
                </div>

                <!-- Silhouette Vector Icon (Reacts to selectedPalette.color) -->
                <div
                  class="w-16 h-16 sm:w-20 sm:h-20 p-2 my-2 rounded-xl bg-theme-base/80 border border-theme-border/50 flex items-center justify-center group-hover:scale-105 transition-all duration-200 shadow-inner"
                  style="color: {selectedPalette.color};"
                >
                  <div class="w-full h-full flex items-center justify-center">
                    {@html s.svgContent}
                  </div>
                </div>

                <!-- Title & Archetype -->
                <div class="w-full text-center space-y-0.5 mt-1">
                  <div
                    class="text-xs font-bold text-theme-primary truncate"
                    title={s.name}
                  >
                    {s.name}
                  </div>
                  <div class="text-[10px] text-theme-muted capitalize truncate">
                    {s.archetype}
                  </div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Right: Sticky Large Preview & Creator Export Panel -->
      <aside class="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6 space-y-5">
        <div
          class="p-6 rounded-2xl bg-theme-surface border border-theme-border shadow-xl space-y-6 relative overflow-hidden backdrop-blur-md"
        >
          <!-- Subtle top gradient accent -->
          <div
            class="absolute top-0 left-0 right-0 h-1 transition-colors duration-300"
            style="background-color: {selectedPalette.color};"
          ></div>

          <!-- Preview Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="icon-[lucide--eye] h-4 w-4 text-theme-accent"></span>
              <span
                class="text-xs font-bold uppercase tracking-wider text-theme-primary"
              >
                Vector Preview
              </span>
            </div>
            <span
              class="text-[11px] px-2 py-0.5 rounded-full bg-theme-base border border-theme-border/60 text-theme-muted font-mono"
            >
              {previewSilhouette.id}
            </span>
          </div>

          <!-- Large Vector Canvas Display (240px x 240px) -->
          <div
            class="relative w-56 h-56 md:w-60 md:h-60 mx-auto p-6 rounded-2xl bg-theme-base/90 border border-theme-border shadow-inner flex items-center justify-center overflow-hidden transition-all duration-200"
            style="color: {selectedPalette.color};"
          >
            <!-- Radial background highlight using active palette color -->
            <div
              class="absolute inset-0 pointer-events-none transition-all duration-300"
              style="background: radial-gradient(circle, {selectedPalette.bgGlow} 0%, transparent 75%);"
            ></div>

            <div
              class="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-200 hover:scale-105"
            >
              {@html previewSilhouette.svgContent}
            </div>
          </div>

          <!-- Metadata & Details -->
          <div class="space-y-3 text-center sm:text-left">
            <div>
              <h2
                data-testid="preview-title"
                class="text-lg font-bold text-theme-primary tracking-tight"
              >
                {previewSilhouette.name}
              </h2>
              <div
                class="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-theme-muted mt-1"
              >
                <span class="font-semibold text-theme-accent capitalize">
                  {previewSilhouette.category}
                </span>
                <span>•</span>
                <span class="capitalize">
                  {previewSilhouette.archetype}
                </span>
                {#if previewSilhouette.gender && previewSilhouette.gender !== "neutral"}
                  <span>•</span>
                  <span class="capitalize">
                    {previewSilhouette.gender}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Supported Genres -->
            <div class="space-y-1 text-left">
              <div
                class="text-[10px] uppercase font-bold tracking-wider text-theme-muted"
              >
                Supported Genres
              </div>
              <div class="flex flex-wrap gap-1.5">
                {#each previewSilhouette.genres as genre}
                  <span
                    class="px-2 py-0.5 rounded-md text-[11px] bg-theme-base border border-theme-border/60 text-theme-primary capitalize"
                  >
                    {genre}
                  </span>
                {/each}
              </div>
            </div>

            <!-- Keywords & Tags -->
            <div class="space-y-1 text-left">
              <div
                class="text-[10px] uppercase font-bold tracking-wider text-theme-muted"
              >
                Tags &amp; Keywords
              </div>
              <div
                class="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1 scrollbar-thin"
              >
                {#each previewSilhouette.tags as tag}
                  <span
                    class="px-1.5 py-0.5 rounded-xs text-[10px] bg-theme-base/80 border border-theme-border/50 text-theme-muted"
                  >
                    #{tag}
                  </span>
                {/each}
              </div>
            </div>
          </div>

          <!-- Creator Utilities / Export Actions -->
          <div class="pt-4 border-t border-theme-border/50 space-y-2.5">
            <div
              class="text-[11px] font-bold uppercase tracking-wider text-theme-muted flex items-center justify-between"
            >
              <span>Creator Utilities</span>
              <span class="font-mono text-[10px] text-theme-muted/70"
                >SVG 1024×1024</span
              >
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <!-- Download SVG -->
              <button
                type="button"
                onclick={handleDownloadSvg}
                class="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-theme-accent text-theme-accent-contrast hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span class="icon-[lucide--download] h-4 w-4"></span>
                Download SVG
              </button>

              <!-- Copy SVG Markup -->
              <button
                type="button"
                onclick={handleCopySvg}
                class="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-theme-base border border-theme-border/80 text-theme-primary hover:border-theme-accent hover:text-theme-accent transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {#if copiedAction === "svg"}
                  <span class="icon-[lucide--check] h-4 w-4 text-theme-accent"
                  ></span>
                  Copied!
                {:else}
                  <span class="icon-[lucide--code] h-4 w-4"></span>
                  Copy SVG
                {/if}
              </button>
            </div>

            <!-- Copy Cloudflare CDN URL -->
            <button
              type="button"
              onclick={handleCopyCdnLink}
              class="w-full py-2 px-3 rounded-xl text-xs font-medium bg-theme-base/60 border border-theme-border/60 text-theme-muted hover:text-theme-primary hover:border-theme-border transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {#if copiedAction === "cdn"}
                <span class="icon-[lucide--check] h-3.5 w-3.5 text-theme-accent"
                ></span>
                <span>Copied CDN link to clipboard!</span>
              {:else}
                <span class="icon-[lucide--link] h-3.5 w-3.5"></span>
                <span>Copy Cloudflare CDN Link</span>
              {/if}
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Codex Cryptica In-App Integration CTA -->
    <section
      class="mt-16 p-8 rounded-3xl bg-theme-surface/90 border border-theme-border/80 shadow-xl relative overflow-hidden backdrop-blur-md"
    >
      <div
        class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style="background: {selectedPalette.color};"
      ></div>

      <div class="relative max-w-3xl space-y-4">
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-theme-base border border-theme-border text-theme-accent"
        >
          <span class="icon-[lucide--shield-check] h-3.5 w-3.5"></span>
          Integrated with Codex Cryptica Vault
        </div>

        <h3
          class="text-xl sm:text-2xl font-bold text-theme-primary tracking-tight"
        >
          Auto-Match Silhouettes Directly in Offline Vaults
        </h3>

        <p class="text-sm text-theme-muted leading-relaxed">
          In Codex Cryptica campaigns, our deterministic inference engine
          automatically analyzes your entity types, archetypes, tags, and
          campaign themes to auto-assign fitting vector silhouettes without
          external AI calls or token costs. Silhouettes dynamically react to
          your chosen campaign skin across character sheets, location dossiers,
          and graph nodes.
        </p>

        <div class="pt-2 flex flex-wrap gap-3 items-center">
          <a
            href="{base}/free-rpg-campaign-manager"
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-theme-accent text-theme-accent-contrast hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md"
          >
            <span class="icon-[lucide--castle] h-4 w-4"></span>
            Explore Campaign Workspace
          </a>
          <a
            href="{base}/tools"
            class="px-5 py-2.5 rounded-xl text-xs font-semibold bg-theme-base border border-theme-border text-theme-primary hover:border-theme-accent transition-colors flex items-center gap-2"
          >
            <span class="icon-[lucide--wrench] h-4 w-4"></span>
            Browse All RPG Tools &amp; Generators
          </a>
        </div>
      </div>
    </section>
  </main>
</div>
