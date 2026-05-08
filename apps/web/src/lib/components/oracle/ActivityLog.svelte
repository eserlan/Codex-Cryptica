<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { sessionActivity } from "$lib/services/SessionActivityService";
  import {
    DEFAULT_SEARCH_ENTITY_ZOOM,
    dispatchSearchEntityFocus,
  } from "$lib/components/search/search-focus";
  import { slide } from "svelte/transition";

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const icons: Record<string, string> = {
    discovery: "icon-[lucide--search]",
    archive: "icon-[lucide--archive]",
    update: "icon-[lucide--refresh-cw]",
  };

  const colors: Record<string, string> = {
    discovery: "text-theme-primary",
    archive: "text-theme-accent",
    update: "text-theme-text/70",
  };

  function focusEntity(entityId: string | undefined) {
    if (!entityId) return;

    vault.selectedEntityId = entityId;
    dispatchSearchEntityFocus(entityId, DEFAULT_SEARCH_ENTITY_ZOOM);
  }
</script>

<div
  class="flex flex-col h-full bg-theme-surface/50 border-l border-theme-border overflow-hidden font-body"
>
  <div
    class="p-3 border-b border-theme-border flex items-center justify-between bg-theme-surface"
  >
    <h3
      class="text-xs font-bold uppercase tracking-widest text-theme-primary font-header"
    >
      Session Lore Activity
    </h3>
    <button
      onclick={() => sessionActivity.clear()}
      class="text-[10px] text-theme-muted hover:text-theme-text transition-colors uppercase font-header font-bold"
      aria-label="Clear activity log"
    >
      Clear
    </button>
  </div>

  <div class="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
    {#if uiStore.archiveActivityLog.length === 0}
      <div
        class="flex flex-col items-center justify-center h-full opacity-30 text-center p-4"
      >
        <span class="icon-[lucide--activity] w-8 h-8 mb-2"></span>
        <p class="text-xs uppercase font-header tracking-tighter">
          No recent activity detected.
        </p>
        <p class="text-[10px] mt-1">Talk to the Oracle to discover new lore.</p>
      </div>
    {:else}
      {#each uiStore.archiveActivityLog as event (event.id)}
        {#if event.entityId}
          <button
            type="button"
            onclick={() => focusEntity(event.entityId)}
            aria-label={`Open ${event.title} in the graph`}
            in:slide={{ duration: 200 }}
            class="w-full p-2 rounded bg-theme-surface border border-theme-border/50 hover:border-theme-primary/30 transition-all group text-left cursor-pointer"
          >
            <div class="flex items-start gap-2">
              <span
                class="{icons[event.type]} {colors[
                  event.type
                ]} w-3.5 h-3.5 mt-0.5"
              ></span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="text-[10px] font-bold uppercase truncate font-header tracking-tight"
                  >
                    {event.type === "discovery"
                      ? "Found"
                      : event.type === "archive"
                        ? "Archived"
                        : "Updated"}
                  </span>
                  <span class="text-[9px] text-theme-muted/60 font-mono"
                    >{formatTime(event.timestamp)}</span
                  >
                </div>
                <p class="text-xs font-medium truncate text-theme-text/90">
                  {event.title}
                </p>
                <p
                  class="text-[9px] uppercase opacity-40 font-mono tracking-tighter"
                >
                  {event.entityType}
                </p>
              </div>
            </div>
          </button>
        {:else}
          <div
            in:slide={{ duration: 200 }}
            class="w-full p-2 rounded bg-theme-surface border border-theme-border/50 hover:border-theme-primary/30 transition-all group"
          >
            <div class="flex items-start gap-2">
              <span
                class="{icons[event.type]} {colors[
                  event.type
                ]} w-3.5 h-3.5 mt-0.5"
              ></span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="text-[10px] font-bold uppercase truncate font-header tracking-tight"
                  >
                    {event.type === "discovery"
                      ? "Found"
                      : event.type === "archive"
                        ? "Archived"
                        : "Updated"}
                  </span>
                  <span class="text-[9px] text-theme-muted/60 font-mono"
                    >{formatTime(event.timestamp)}</span
                  >
                </div>
                <p class="text-xs font-medium truncate text-theme-text/90">
                  {event.title}
                </p>
                <p
                  class="text-[9px] uppercase opacity-40 font-mono tracking-tighter"
                >
                  {event.entityType}
                </p>
              </div>
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
