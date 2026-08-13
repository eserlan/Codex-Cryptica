<script lang="ts">
  import { themeStore } from "$lib/stores/theme.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import WorldThemePicker from "./WorldThemePicker.svelte";
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

  <!-- Screen & Layout Preferences -->
  <div class="space-y-2">
    <h3
      class="text-xs font-bold tracking-widest uppercase text-chrome-muted/80"
    >
      Screen & Display
    </h3>
    <label
      class="flex items-center justify-between p-3 bg-chrome-surface border border-chrome-border rounded text-xs text-chrome-text hover:border-chrome-accent/50 cursor-pointer transition-colors"
    >
      <div class="space-y-0.5">
        <div class="font-bold">Auto Fullscreen on First Interaction</div>
        <div class="text-[11px] text-chrome-muted">
          Automatically request browser fullscreen mode when clicking or
          pressing keys on load.
        </div>
      </div>
      <input
        type="checkbox"
        class="h-4 w-4 rounded border-chrome-border text-chrome-accent focus:ring-chrome-accent bg-chrome-bg"
        checked={layoutUIStore.autoFullscreen}
        onchange={(e) =>
          layoutUIStore.setAutoFullscreen(
            (e.target as HTMLInputElement).checked,
          )}
      />
    </label>
  </div>

  <!-- World Genre Themes Settings -->
  <div class="space-y-2">
    <WorldThemePicker
      selectedThemeId={themeStore.currentThemeId}
      onSelect={(themeId) => themeStore.setTheme(themeId)}
      onPreview={(themeId) => themeStore.previewTheme(themeId)}
      previewEnabled={true}
      descriptionClass="text-xs text-theme-muted/60 leading-relaxed"
    />
  </div>
</div>
