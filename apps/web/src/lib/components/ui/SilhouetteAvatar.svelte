<script lang="ts">
  import type { Entity, SilhouetteDefinition } from "schema";
  import { resolveEntitySilhouette, SILHOUETTE_MAP } from "schema";
  import { themeStore } from "$lib/stores/theme.svelte";
  import SilhouetteGlyph from "./SilhouetteGlyph.svelte";

  let {
    entity = undefined,
    silhouetteId = undefined,
    class: className = "",
    size = "md",
    showBadge = false,
  }: {
    entity?: Partial<Entity>;
    silhouetteId?: string;
    class?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";
    showBadge?: boolean;
  } = $props();

  const currentTheme = $derived(themeStore.activeTheme?.id || "default");

  const resolvedSilhouette = $derived.by<SilhouetteDefinition>(() => {
    if (silhouetteId) {
      const match = SILHOUETTE_MAP.get(silhouetteId);
      if (match) return match;
    }
    if (entity) {
      return resolveEntitySilhouette(entity, { worldTheme: currentTheme });
    }
    return SILHOUETTE_MAP.get("generic-humanoid-unknown")!;
  });

  const sizeClasses = {
    xs: "w-6 h-6 p-0.5",
    sm: "w-8 h-8 p-1",
    md: "w-12 h-12 p-1.5",
    lg: "w-24 h-24 p-2",
    xl: "w-36 h-36 md:w-44 md:h-44 p-3",
    "2xl": "w-48 h-48 md:w-56 md:h-56 p-4",
    "3xl": "w-56 h-56 md:w-68 md:h-68 p-4",
    "4xl": "w-72 h-72 md:w-84 md:h-84 p-5",
    full: "w-full h-full p-2",
  };
</script>

<div
  class="relative flex items-center justify-center rounded-lg bg-theme-surface/60 text-theme-primary shadow-xs border border-theme-border/40 overflow-hidden {sizeClasses[
    size
  ]} {className}"
  title={resolvedSilhouette.name}
>
  <!-- Background radial subtle aura -->
  <div
    class="absolute inset-0 bg-radial from-theme-primary/10 via-transparent to-transparent pointer-events-none"
  ></div>

  <!-- Artwork, fetched from R2 -->
  <div
    class="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-200 pointer-events-none"
  >
    <SilhouetteGlyph silhouette={resolvedSilhouette} eager />
  </div>

  {#if showBadge}
    <div
      class="absolute bottom-1 right-1 z-20 px-1.5 py-0.5 text-[10px] font-mono rounded-xs bg-theme-base/90 text-theme-muted border border-theme-border/40 backdrop-blur-xs"
    >
      {resolvedSilhouette.archetype}
    </div>
  {/if}
</div>
