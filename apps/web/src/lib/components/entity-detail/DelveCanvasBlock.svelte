<script lang="ts">
  import type { Entity } from "schema";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { canvasRegistry } from "#lib/stores/canvas-registry.svelte.js";
  import { dungeonDelveService } from "#lib/services/dungeon-delve-service.js";
  import { goto } from "$app/navigation";
  import { openCanvasFromZen } from "#lib/stores/ui/navigation.js";
  import { getDelveCanvasLabel } from "#lib/utils/delve-terminology.js";

  let { entity }: { entity: Entity } = $props();

  const existingCanvas = $derived(
    canvasRegistry.findCanvasForEntity(entity.id, entity.title),
  );

  const delveCanvasLabel = $derived(
    getDelveCanvasLabel(themeStore.activeTheme.id),
  );
</script>

<div
  class="mb-4 p-3 bg-theme-primary/5 border border-theme-border rounded-xl flex items-center justify-between gap-3"
>
  <div class="flex items-center gap-2.5">
    <span
      aria-hidden="true"
      class="icon-[lucide--map] text-theme-primary w-5 h-5 shrink-0"
    ></span>
    <div>
      <span
        class="text-xs font-bold text-theme-text uppercase font-header tracking-wider block"
      >
        Spatial {delveCanvasLabel}
      </span>
      <span class="text-micro text-theme-text">
        {existingCanvas
          ? "Interactive room & sector floor plan on Spatial Canvas."
          : "Generate an interactive room & sector floor plan on Spatial Canvas."}
      </span>
    </div>
  </div>
  <div class="flex items-center gap-2">
    {#if existingCanvas}
      <button
        type="button"
        onclick={() => {
          openCanvasFromZen(existingCanvas, goto);
        }}
        class="px-3.5 py-1.5 bg-theme-primary text-theme-on-primary font-bold text-micro rounded-lg uppercase font-header tracking-widest hover:bg-theme-secondary transition-colors shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer"
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--external-link] w-3.5 h-3.5"
        ></span>
        Open {delveCanvasLabel}
      </button>
      <button
        type="button"
        title="Rebuild Canvas Map"
        aria-label="Rebuild Canvas Map"
        onclick={async () => {
          try {
            const canvasDoc =
              dungeonDelveService.buildDelveCanvasFromConcept(entity);
            const slug = await canvasRegistry.importCanvas(canvasDoc);
            openCanvasFromZen({ slug }, goto);
          } catch (err) {
            console.error("[DelveCanvas] Rebuild failed:", err);
          }
        }}
        class="p-1.5 text-theme-text hover:text-theme-primary transition-colors cursor-pointer"
      >
        <span aria-hidden="true" class="icon-[lucide--rotate-cw] w-3.5 h-3.5"
        ></span>
      </button>
    {:else}
      <button
        type="button"
        onclick={async () => {
          try {
            const canvasDoc =
              dungeonDelveService.buildDelveCanvasFromConcept(entity);
            const slug = await canvasRegistry.importCanvas(canvasDoc);
            openCanvasFromZen({ slug }, goto);
          } catch (err) {
            console.error("[DelveCanvas] Build failed:", err);
          }
        }}
        class="px-3.5 py-1.5 bg-theme-primary text-theme-on-primary font-bold text-micro rounded-lg uppercase font-header tracking-widest hover:bg-theme-secondary transition-colors shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer"
      >
        <span aria-hidden="true" class="icon-[lucide--map] w-3.5 h-3.5"></span>
        Build {delveCanvasLabel}
      </button>
    {/if}
  </div>
</div>
