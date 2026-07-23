<script lang="ts">
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { IS_STAGING } from "$lib/config";
  import { searchStore } from "$lib/stores/search.svelte";
  import VaultControls from "../VaultControls.svelte";
  import DriveStatus from "./DriveStatus.svelte";
  import P2PStatus from "./P2PStatus.svelte";
  import VoiceChatControls from "../vtt/VoiceChatControls.svelte";
  import { openFrontPage } from "./app-header-actions";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { guestVault } from "$lib/stores/guest-vault.svelte";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let {
    isMobileMenuOpen = $bindable(false),
    headerEl = $bindable(),
  }: {
    isMobileMenuOpen: boolean;
    headerEl?: HTMLElement;
  } = $props();

  const isStaging = $derived(IS_STAGING || sessionModeStore.isStaging);

  const handleBrandClick = () => {
    if (sessionModeStore.isGuestMode && guestVault.publishId) {
      modalUIStore.closeZenMode();
      vault.selectedEntityId = null;
      onboardingStore.restoreWorldPage();
      void goto(`${base}/guest/${guestVault.publishId}`);
      return;
    }
    openFrontPage();
    void goto(`${base}/`);
  };
</script>

<header
  bind:this={headerEl}
  class="px-4 md:px-6 py-3 md:py-4 bg-chrome-surface border-b border-chrome-border sticky top-0 z-[70] flex flex-col gap-3"
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
        class="md:hidden text-chrome-muted hover:text-chrome-text transition-colors"
        onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <span class="icon-[lucide--menu] w-6 h-6" aria-hidden="true"></span>
      </button>

      <!-- Die Roller Toggle -->
      <button
        class="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg bg-chrome-surface border border-chrome-border text-chrome-text shadow hover:bg-chrome-bg/50 transition-all duration-300 group relative"
        onclick={() => (modalUIStore.showDiceModal = true)}
        aria-label="Open Die Roller"
        title="Open Die Roller"
        data-testid="dice-roller-button"
      >
        <span
          class="icon-[lucide--dices] w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110"
          aria-hidden="true"
        ></span>
      </button>

      <h1
        class="text-lg md:text-xl font-bold text-chrome-text font-sans tracking-wide flex items-center gap-2 md:gap-3 shrink-0 transition-colors"
        data-testid="header-title"
      >
        <button
          type="button"
          class="relative z-[70] flex items-center gap-2 md:gap-3 text-inherit hover:text-chrome-accent transition-colors cursor-pointer text-left"
          onclick={handleBrandClick}
          aria-label="Go to front page"
          title="Go to front page"
          data-testid="header-front-page-button"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--book-open] w-5 h-5 text-chrome-accent"
          >
          </span>
          <span class="hidden sm:inline">Codex Cryptica</span>
          <span class="sm:hidden text-chrome-accent">CC</span>
        </button>
      </h1>
    </div>

    <!-- Search — full input at lg+, compact icon button below (frees space on
         tablet-range viewports where the right cluster is crowded, #1785). -->
    <div class="flex-1 max-w-xl lg:px-4 flex justify-end lg:justify-center">
      <div class="hidden lg:block w-full relative group">
        <span
          class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-4 h-4 text-chrome-muted group-focus-within:text-chrome-accent transition-colors"
        ></span>
        <input
          type="text"
          placeholder="Search (Cmd+K)..."
          aria-label="Search notes"
          class="w-full bg-chrome-bg border border-chrome-border hover:border-chrome-text/30 focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent/30 rounded py-1.5 pl-10 pr-4 text-sm font-sans text-chrome-text transition-all placeholder:text-chrome-muted/50"
          onfocus={() => searchStore.open()}
          value={searchStore.query}
          oninput={(e) => searchStore.setQuery(e.currentTarget.value)}
          data-testid="search-input"
        />
      </div>
      <button
        type="button"
        class="lg:hidden p-2 text-chrome-muted hover:text-chrome-text transition-colors"
        onclick={() => searchStore.open()}
        aria-label="Search"
        data-testid="mobile-search-button"
      >
        <span
          class="icon-[heroicons--magnifying-glass] w-6 h-6"
          aria-hidden="true"
        ></span>
      </button>
    </div>

    <!-- Desktop: Right Controls -->
    <div class="hidden md:flex items-center gap-4 shrink-0">
      {#if sessionModeStore.isGuestMode}
        <span
          class="text-xs font-mono px-2.5 py-1 rounded bg-chrome-accent/15 border border-chrome-accent/30 text-chrome-accent flex items-center gap-1.5"
        >
          <span class="icon-[lucide--eye] h-3.5 w-3.5"></span>
          READ-ONLY GUEST
        </span>
        <VoiceChatControls />
        <a
          href="{base}/worlds"
          class="px-3 py-1.5 rounded-lg border border-chrome-border hover:border-chrome-accent hover:text-chrome-accent text-xs font-medium transition-all flex items-center gap-1.5"
        >
          <span class="icon-[lucide--compass] h-3.5 w-3.5"></span>
          Explore Worlds
        </a>
        <button
          class="px-3 py-1.5 rounded-lg border border-chrome-border hover:border-chrome-accent hover:text-chrome-accent text-xs font-medium transition-all"
          onclick={() => {
            sessionModeStore.isGuestMode = false;
            guestVault.clear();
            void goto(`${base}/`);
          }}
        >
          Exit Guest Mode
        </button>
      {:else}
        <DriveStatus />
        <P2PStatus />
        <VoiceChatControls />
        <VaultControls />
        <a
          href="{base}/worlds"
          class="w-8 h-8 flex items-center justify-center border border-chrome-border hover:border-chrome-accent text-chrome-muted hover:text-chrome-accent transition-all"
          title="Explore public worlds"
          aria-label="Explore public worlds"
        >
          <span class="w-5 h-5 icon-[lucide--compass]" aria-hidden="true"
          ></span>
        </a>
        <button
          class="w-8 h-8 flex items-center justify-center border transition-all {modalUIStore.showSettings
            ? 'border-chrome-accent bg-chrome-accent/10 text-chrome-accent'
            : 'border-chrome-border hover:border-chrome-accent text-chrome-muted hover:text-chrome-accent'} relative"
          onclick={() => modalUIStore.toggleSettings("vault")}
          title="Application Settings"
          aria-label="Open Application Settings"
          data-testid="settings-button"
        >
          <span class="w-5 h-5 icon-[lucide--settings]" aria-hidden="true"
          ></span>
        </button>
      {/if}
    </div>
  </div>
</header>
