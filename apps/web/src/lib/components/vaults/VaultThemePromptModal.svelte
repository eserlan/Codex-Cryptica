<script lang="ts">
  import WorldThemePicker from "$lib/components/settings/WorldThemePicker.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { fade, scale } from "svelte/transition";
  import { DEFAULT_THEME, type WorldThemeId } from "schema";

  let selectedThemeId = $state<WorldThemeId>(DEFAULT_THEME.id);
  let isLoading = $state(false);

  const close = () => {
    modalUIStore.closeVaultThemePrompt();
  };

  const applyTheme = async () => {
    isLoading = true;
    try {
      await themeStore.setTheme(selectedThemeId);
      close();
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  };
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && close()} />

<div
  class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
  transition:fade
  role="button"
  tabindex="0"
  onclick={(e) => {
    if (e.target === e.currentTarget) close();
  }}
  onkeydown={(e) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      close();
    }
  }}
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="vault-theme-title"
    class="bg-theme-surface border border-theme-border rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
    transition:scale
    data-testid="vault-theme-modal"
  >
    <div
      class="p-4 border-b border-theme-border flex justify-between items-center bg-theme-bg"
    >
      <div>
        <h2
          id="vault-theme-title"
          class="text-lg font-bold text-theme-primary tracking-wide"
        >
          CHOOSE VAULT THEME
        </h2>
        <p class="mt-1 text-xs text-theme-muted">
          Pick a tone now that your vault has its first lore.
        </p>
      </div>
      <button
        onclick={close}
        class="text-theme-muted hover:text-theme-text"
        title="Close Theme Selector"
        aria-label="Close Theme Selector"
      >
        <span class="icon-[lucide--x] w-5 h-5"></span>
      </button>
    </div>

    <div class="overflow-y-auto p-4 flex-1 bg-theme-bg/50">
      <WorldThemePicker
        {selectedThemeId}
        onSelect={(themeId) => (selectedThemeId = themeId)}
        heading="World Theme"
        descriptionClass="text-xs text-theme-muted/70 leading-relaxed"
        cardClass="bg-theme-bg/70 border-theme-border hover:border-theme-primary/40"
      />
    </div>

    <div
      class="p-4 border-t border-theme-border bg-theme-surface flex justify-end gap-3"
    >
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text transition-colors"
        onclick={close}
        disabled={isLoading}
      >
        LATER
      </button>
      <button
        type="button"
        class="px-6 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold text-sm rounded shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        disabled={isLoading}
        aria-busy={isLoading}
        onclick={applyTheme}
      >
        {#if isLoading}
          <span
            class="icon-[lucide--loader-2] w-4 h-4 animate-spin"
            aria-hidden="true"
          ></span>
          APPLYING...
        {:else}
          USE THEME
        {/if}
      </button>
    </div>
  </div>
</div>
