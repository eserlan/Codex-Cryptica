<script lang="ts">
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import VaultControls from "../VaultControls.svelte";

  let {
    isMobileMenuOpen = $bindable(false),
    headerEl = $bindable(),
  }: {
    isMobileMenuOpen: boolean;
    headerEl?: HTMLElement;
  } = $props();
</script>

<header
  bind:this={headerEl}
  class="px-4 md:px-6 py-3 md:py-4 bg-theme-surface border-b border-theme-border flex items-center justify-between sticky top-0 z-50 gap-2 md:gap-4"
>
  <!-- Mobile: Left (Menu + Brand) -->
  <div class="flex items-center gap-2 md:gap-3 shrink-0">
    <button
      class="md:hidden text-theme-muted hover:text-theme-primary transition-colors"
      onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
      aria-label="Toggle menu"
    >
      <span class="icon-[lucide--menu] w-6 h-6"></span>
    </button>

    <!-- Oracle Toggle (Sidebar) -->
    {#if !uiStore.leftSidebarOpen}
      <button
        class="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg bg-theme-surface border border-theme-border text-theme-primary shadow-lg hover:bg-theme-primary/10 transition-all duration-300 group relative"
        onclick={() => uiStore.toggleSidebarTool("oracle")}
        aria-label="Open Lore Oracle"
        title="Open Lore Oracle"
        data-testid="sidebar-oracle-button"
      >
        <span
          class="icon-[heroicons--sparkles] w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110"
        ></span>
      </button>
    {/if}

    <!-- Die Roller Toggle -->
    <button
      class="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg bg-theme-surface border border-theme-border text-theme-primary shadow-lg hover:bg-theme-primary/10 transition-all duration-300 group relative"
      onclick={() => (uiStore.showDiceModal = true)}
      aria-label="Open Die Roller"
      title="Open Die Roller"
      data-testid="dice-roller-button"
    >
      <span
        class="icon-[lucide--dices] w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110"
      ></span>
    </button>

    <h1
      class="text-lg md:text-xl font-bold text-theme-text font-header tracking-wide flex items-center gap-2 md:gap-3 shrink-0 transition-all duration-300 {uiStore.isStaging
        ? 'bg-red-600 text-white px-3 py-1 rounded-full border-2 border-white shadow-[0_0_15px_rgba(220,38,38,0.5)]'
        : ''}"
      data-testid={uiStore.isStaging ? "staging-indicator" : "header-title"}
    >
      <a
        href="{base}/"
        class="flex items-center gap-2 md:gap-3 text-inherit hover:text-theme-primary transition-colors"
        onclick={() => {
          uiStore.dismissedCampaignPage = false;
        }}
        aria-label="Go to front page"
        title="Go to front page"
      >
        <span
          class="icon-[lucide--book-open] w-5 h-5 {uiStore.isStaging
            ? 'text-white'
            : 'text-theme-primary'}"
        ></span>
        <span class="hidden sm:inline">Codex Cryptica</span>
        <span
          class="sm:hidden {uiStore.isStaging
            ? 'text-white'
            : 'text-theme-primary'}"
        >
          CC
        </span>
      </a>
    </h1>

    <nav
      class="hidden md:flex items-center gap-1 ml-4 border-l border-theme-border pl-4 relative z-10"
    >
      <a
        href="{base}/"
        class="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-colors font-header {page
          .url.pathname === `${base}/`
          ? 'bg-theme-primary/10 text-theme-primary'
          : 'text-theme-muted hover:text-theme-text'}"
        data-testid="nav-graph"
      >
        GRAPH
      </a>
      <a
        href="{base}/map"
        class="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-colors font-header {page.url.pathname.startsWith(
          `${base}/map`,
        )
          ? 'bg-theme-primary/10 text-theme-primary'
          : 'text-theme-muted hover:text-theme-text'}"
        data-testid="nav-map"
      >
        MAP
      </a>
      <a
        href="{base}/canvas"
        class="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-colors font-header {page.url.pathname.startsWith(
          `${base}/canvas`,
        )
          ? 'bg-theme-primary/10 text-theme-primary'
          : 'text-theme-muted hover:text-theme-text'}"
        data-testid="nav-canvas"
      >
        CANVAS
      </a>
    </nav>
  </div>

  <!-- Search (Desktop: Input, Mobile: Button) -->
  <div class="flex-1 max-w-xl md:px-4 flex justify-end md:justify-center">
    <div class="hidden md:block w-full relative group">
      <span
        class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors"
      ></span>
      <input
        type="text"
        placeholder="Search (Cmd+K)..."
        class="w-full bg-theme-bg border border-theme-border hover:border-theme-primary/50 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/50 rounded py-1.5 pl-10 pr-4 text-sm font-body text-theme-text transition-all placeholder:text-theme-muted/50"
        onfocus={() => searchStore.open()}
        value={searchStore.query}
        oninput={(e) => searchStore.setQuery(e.currentTarget.value)}
        data-testid="search-input"
      />
    </div>
    <button
      class="md:hidden p-2 text-theme-muted hover:text-theme-primary transition-colors"
      onclick={() => searchStore.open()}
      aria-label="Search"
    >
      <span class="icon-[heroicons--magnifying-glass] w-6 h-6"></span>
    </button>
  </div>

  <!-- Desktop: Right Controls -->
  <div class="hidden md:flex items-center gap-4 shrink-0">
    <VaultControls />
    <button
      class="w-8 h-8 flex items-center justify-center border transition-all {uiStore.showSettings
        ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
        : 'border-theme-border hover:border-theme-primary text-theme-muted hover:text-theme-primary'} relative"
      onclick={() => uiStore.toggleSettings("vault")}
      title="Application Settings"
      aria-label="Open Application Settings"
      data-testid="settings-button"
    >
      <span class="w-5 h-5 icon-[lucide--settings]"></span>
    </button>
  </div>
</header>
