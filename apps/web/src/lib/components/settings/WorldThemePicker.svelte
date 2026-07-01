<script lang="ts">
  import { THEMES, type WorldThemeId } from "schema";
  import { fade } from "svelte/transition";

  let {
    selectedThemeId,
    onSelect,
    onPreview,
    heading = "World Genre Theme",
    previewEnabled = false,
    descriptionClass = "text-xs text-theme-muted/70 leading-relaxed",
    cardClass = "bg-theme-surface border-theme-border hover:border-theme-primary/50",
  } = $props<{
    selectedThemeId: string;
    onSelect: (themeId: WorldThemeId) => void;
    onPreview?: (themeId: WorldThemeId | null) => void;
    heading?: string;
    previewEnabled?: boolean;
    descriptionClass?: string;
    cardClass?: string;
  }>();

  const worldThemes = Object.values(THEMES);

  const handlePreview = (themeId: WorldThemeId | null) => {
    if (!previewEnabled || !onPreview) return;
    onPreview(themeId);
  };

  const getDisplayName = (themeId: WorldThemeId, themeName: string) =>
    themeId === "workspace" ? "Workspace" : themeName;
</script>

<div class="space-y-2">
  <h3 class="text-xs font-bold tracking-widest uppercase text-chrome-muted/80">
    {heading}
  </h3>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {#each worldThemes as theme (theme.id)}
      {@const isSelected = selectedThemeId === theme.id}
      <button
        type="button"
        aria-pressed={isSelected}
        class={[
          "group relative flex min-h-[12.5rem] flex-col items-start gap-3 overflow-hidden rounded-lg border p-4 text-left transition-all",
          isSelected
            ? "bg-theme-surface border-theme-primary ring-1 ring-theme-primary"
            : cardClass,
        ]}
        onclick={() => onSelect(theme.id)}
        onmouseenter={() => handlePreview(theme.id)}
        onmouseleave={() => handlePreview(null)}
      >
        <div class="flex gap-1">
          <div
            class="h-4 w-4 rounded-full border border-white/10"
            style:background-color={theme.tokens.primary}
            title="Primary"
          ></div>
          <div
            class="h-4 w-4 rounded-full border border-white/10"
            style:background-color={theme.tokens.secondary}
            title="Secondary"
          ></div>
          <div
            class="h-4 w-4 rounded-full border border-white/10"
            style:background-color={theme.tokens.accent}
            title="Accent"
          ></div>
          <div
            class="h-4 w-4 rounded-full border border-white/10"
            style:background-color={theme.tokens.background}
            title="Background"
          ></div>
        </div>

        <div class="space-y-1">
          <div
            class={[
              "font-header text-xs font-bold uppercase tracking-widest transition-colors",
              isSelected
                ? "text-theme-primary"
                : "text-theme-text group-hover:text-theme-text/90",
            ]}
          >
            {getDisplayName(theme.id, theme.name)}
          </div>
          <p class={descriptionClass}>
            {theme.description}
          </p>
        </div>

        <div class="mt-auto text-[11px] text-theme-muted/70 font-mono italic">
          {theme.graph.nodeShape} nodes // {theme.graph.edgeStyle} edges
        </div>

        {#if isSelected}
          <div
            class="absolute right-2 top-2 text-theme-primary"
            transition:fade={{ duration: 150 }}
          >
            <span class="icon-[lucide--check-circle] h-4 w-4"></span>
          </div>
        {/if}

        {#if theme.tokens.texture}
          <div
            class="pointer-events-none absolute inset-0 opacity-5 mix-blend-overlay"
            style:background-image={`url('/themes/${theme.tokens.texture}')`}
          ></div>
        {/if}
      </button>
    {/each}
  </div>
</div>
