<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import EntityList from "./EntityList.svelte";
  import { Database, X } from "lucide-svelte";

  import type { Entity } from "schema";

  function handleSelect(entity: Entity) {
    uiStore.focusEntity(entity.id);
  }
</script>

<div class="flex flex-col h-full bg-theme-surface font-body">
  <!-- Header -->
  <div
    class="p-4 border-b border-theme-border flex items-center justify-between shrink-0"
  >
    <div class="flex items-center gap-2">
      <div
        class="w-8 h-8 rounded-lg bg-theme-primary/10 flex items-center justify-center text-theme-primary"
      >
        <Database class="w-4 h-4" />
      </div>
      <div>
        <div
          class="text-[9px] font-mono text-theme-muted uppercase tracking-[0.2em] leading-none mb-1"
        >
          Catalog
        </div>
        <h2
          class="text-xs font-bold text-theme-text uppercase font-header tracking-tight"
        >
          Entity Explorer
        </h2>
      </div>
    </div>
    <button
      onclick={() => uiStore.toggleSidebarTool("explorer")}
      class="p-1.5 rounded-md text-theme-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-all"
      aria-label="Close Explorer"
    >
      <X class="w-4 h-4" />
    </button>
  </div>

  <!-- List -->
  <div class="flex-1 min-h-0">
    <EntityList onSelect={handleSelect} />
  </div>
</div>
