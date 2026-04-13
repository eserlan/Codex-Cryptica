<script lang="ts">
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { IS_STAGING } from "$lib/config";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import VaultControls from "../VaultControls.svelte";
  import { openFrontPage } from "./app-header-actions";

  let {
    isMobileMenuOpen = $bindable(false),
    headerEl = $bindable(),
  }: {
    isMobileMenuOpen: boolean;
    headerEl?: HTMLElement;
  } = $props();

  const isStaging = $derived(IS_STAGING || uiStore.isStaging);

  const handleBrandClick = () => {
    openFrontPage();
    void goto(`${base}/`);
  };
</script>

<header
  bind:this={headerEl}
  class="px-4 md:px-6 py-3 md:py-4 bg-theme-surface border-b border-theme-border sticky top-0 z-[70] flex flex-col gap-3"
  style:background-image="var(--bg-texture-overlay)"
>
  {#if isStaging}
    <div
      class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 px-3 py-2 text-center text-[11px] font-medium tracking-[0.18em] text-amber-50 shadow-lg shadow-amber-950/20 md:text-xs"
      data-testid="staging-banner"
      aria-label="Staging preview banner"
    >
      <span class="icon-[lucide--flask-conical] h-4 w-4 text-amber-200"></span>
      <span>STAGING PREVIEW</span>
      <span class="hidden sm:inline text-amber-100/80 tracking-normal">
        Changes here do not affect production.
      </span>
      <a
        class="underline decoration-amber-200/60 underline-offset-4 transition-colors hover:text-white tracking-normal"
        href="https://codexcryptica.com"
        target="_blank"
        rel="noreferrer"
      >
        Open production
      </a>
    </div>
  {/if}

  <div class="flex items-center justify-between gap-2 md:gap-4">
    <!-- Mobile: Left (Menu + Brand) -->
    <div class="flex items-center gap-2 md:gap-3 shrink-0">
      <button
        class="md:hidden text-theme-muted hover:text-theme-primary transition-colors"
        onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <span class="icon-[lucide--menu] w-6 h-6"></span>
      </button>

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
        class="text-lg md:text-xl font-bold text-theme-text font-header tracking-wide flex items-center gap-2 md:gap-3 shrink-0 transition-colors"
        data-testid="header-title"
      >
        <button
          type="button"
          class="relative z-[70] flex items-center gap-2 md:gap-3 text-inherit hover:text-theme-primary transition-colors cursor-pointer text-left"
          onclick={handleBrandClick}
          aria-label="Go to front page"
          title="Go to front page"
          data-testid="header-front-page-button"
        >
          <span class="icon-[lucide--book-open] w-5 h-5 text-theme-primary">
          </span>
          <span class="hidden sm:inline">Codex Cryptica</span>
          <span class="sm:hidden text-theme-primary">CC</span>
        </button>
      </h1>
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
          aria-label="Search notes"
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
  </div>
</header>
