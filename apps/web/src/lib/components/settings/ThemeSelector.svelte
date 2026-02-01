<script lang="ts">
  import { themeStore } from "$lib/stores/theme.svelte";
  import { THEMES } from "schema";
  import { fade } from "svelte/transition";

  const themes = Object.values(THEMES);
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {#each themes as theme}
    <button
      class="group relative flex flex-col items-start p-4 bg-theme-surface border transition-all rounded overflow-hidden
      {themeStore.currentThemeId === theme.id
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
        class="text-xs font-bold tracking-widest uppercase mb-1 transition-colors
        {themeStore.currentThemeId === theme.id
          ? 'text-theme-primary'
          : 'text-theme-text/40 group-hover:text-theme-text/80'}"
      >
        {theme.name}
      </div>

      <div class="text-xs text-theme-muted/60 font-mono italic">
        {theme.graph.nodeShape} nodes // {theme.graph.edgeStyle} edges
      </div>

      {#if themeStore.currentThemeId === theme.id}
        <div
          class="absolute top-2 right-2 text-theme-primary"
          transition:fade={{ duration: 150 }}
        >
          <span class="icon-[lucide--check-circle] w-4 h-4"></span>
        </div>
      {/if}

      <!-- Background Texture Preview (simplified) -->
      {#if theme.tokens.texture}
        <div
          class="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay"
          style:background-image="url('/themes/{theme.tokens.texture}')"
        ></div>
      {/if}
    </button>
  {/each}
</div>

<style>
  /* Local alias for primary color to use in template before it's fully applied */
  button {
    --theme-primary: var(--color-accent-primary);
  }
</style>
