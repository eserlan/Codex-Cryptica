<script lang="ts">
  import { themeStore } from "$lib/stores/theme.svelte";
  import { THEMES } from "schema";
  import { fade } from "svelte/transition";

  const worldThemes = Object.values(THEMES);
</script>

<div class="space-y-6">
  <!-- App Appearance Settings -->
  <div class="space-y-2">
    <h3
      class="text-xs font-bold tracking-widest uppercase text-chrome-muted/80"
    >
      App Appearance
    </h3>
    <div class="grid grid-cols-3 gap-2">
      <button
        type="button"
        aria-pressed={themeStore.appAppearanceId === "system"}
        class="flex items-center justify-center gap-2 p-3 bg-chrome-surface border transition-all rounded text-xs font-bold tracking-wide uppercase
        {themeStore.appAppearanceId === 'system'
          ? 'border-chrome-accent ring-1 ring-chrome-accent text-chrome-accent'
          : 'border-chrome-border text-chrome-muted hover:border-chrome-accent/50 hover:text-chrome-text'}"
        onclick={() => themeStore.setAppAppearance("system")}
      >
        <span class="icon-[lucide--monitor] w-4 h-4"></span>
        System
      </button>
      <button
        type="button"
        aria-pressed={themeStore.appAppearanceId === "neutral-light"}
        class="flex items-center justify-center gap-2 p-3 bg-chrome-surface border transition-all rounded text-xs font-bold tracking-wide uppercase
        {themeStore.appAppearanceId === 'neutral-light'
          ? 'border-chrome-accent ring-1 ring-chrome-accent text-chrome-accent'
          : 'border-chrome-border text-chrome-muted hover:border-chrome-accent/50 hover:text-chrome-text'}"
        onclick={() => themeStore.setAppAppearance("neutral-light")}
      >
        <span class="icon-[lucide--sun] w-4 h-4"></span>
        Light
      </button>
      <button
        type="button"
        aria-pressed={themeStore.appAppearanceId === "neutral-dark"}
        class="flex items-center justify-center gap-2 p-3 bg-chrome-surface border transition-all rounded text-xs font-bold tracking-wide uppercase
        {themeStore.appAppearanceId === 'neutral-dark'
          ? 'border-chrome-accent ring-1 ring-chrome-accent text-chrome-accent'
          : 'border-chrome-border text-chrome-muted hover:border-chrome-accent/50 hover:text-chrome-text'}"
        onclick={() => themeStore.setAppAppearance("neutral-dark")}
      >
        <span class="icon-[lucide--moon] w-4 h-4"></span>
        Dark
      </button>
    </div>
  </div>

  <!-- World Genre Themes Settings -->
  <div class="space-y-2">
    <h3
      class="text-xs font-bold tracking-widest uppercase text-chrome-muted/80"
    >
      World Genre Theme
    </h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {#each worldThemes as theme}
        {@const isSelected = themeStore.currentThemeId === theme.id}
        <button
          type="button"
          aria-pressed={isSelected}
          class="group relative flex flex-col items-start p-4 bg-theme-surface border transition-all rounded overflow-hidden
          {isSelected
            ? 'border-theme-primary ring-1 ring-theme-primary'
            : 'border-theme-border hover:border-theme-primary/50'}"
          onclick={() => themeStore.setTheme(theme.id)}
          onmouseenter={() => themeStore.previewTheme(theme.id)}
          onmouseleave={() => themeStore.previewTheme(null)}
        >
          <!-- Preview Swatches -->
          <div class="flex gap-1 mb-3">
            <div
              class="w-4 h-4 rounded-full border border-white/10"
              style:background-color={theme.tokens.primary}
              title="Primary"
            ></div>
            <div
              class="w-4 h-4 rounded-full border border-white/10"
              style:background-color={theme.tokens.secondary}
              title="Secondary"
            ></div>
            <div
              class="w-4 h-4 rounded-full border border-white/10"
              style:background-color={theme.tokens.accent}
              title="Accent"
            ></div>
            <div
              class="w-4 h-4 rounded-full border border-white/10"
              style:background-color={theme.tokens.background}
              title="Background"
            ></div>
          </div>

          <div
            class="text-xs font-bold tracking-widest uppercase font-header mb-1 transition-colors
            {isSelected
              ? 'text-theme-primary'
              : 'text-theme-text/40 group-hover:text-theme-text/80'}"
          >
            {theme.id === "workspace" ? "Workspace" : theme.name}
          </div>

          <div class="text-xs text-theme-muted/60 font-mono italic">
            {theme.graph.nodeShape} nodes // {theme.graph.edgeStyle} edges
          </div>

          {#if isSelected}
            <div
              class="absolute top-2 right-2 text-theme-primary"
              transition:fade={{ duration: 150 }}
            >
              <span class="icon-[lucide--check-circle] w-4 h-4"></span>
            </div>
          {/if}

          <!-- Background Texture Preview (simplified) -->
          {#if (theme.tokens as any).texture}
            <div
              class="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay"
              style:background-image="url('/themes/{(theme.tokens as any)
                .texture}')"
            ></div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  /* Local alias for primary color to use in template before it's fully applied */
  button {
    --theme-primary: var(--color-accent-primary);
  }
</style>
