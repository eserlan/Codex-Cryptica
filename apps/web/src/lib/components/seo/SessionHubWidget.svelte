<script lang="ts">
  import { sessionHubStore } from "$lib/stores/session-hub.svelte";
  import type { SessionEntity } from "generator-engine";

  let {
    onSelect,
    onSave,
  }: {
    onSelect?: (entity: SessionEntity) => void;
    onSave?: (entitiesToSave: SessionEntity[]) => void;
  } = $props();

  const entities = $derived(sessionHubStore.entities.slice().reverse()); // Show most recent at top
</script>

<div
  class="flex flex-col gap-2 w-full bg-theme-surface/30 p-4 border border-theme-border/60 rounded-xl"
>
  <div
    class="flex items-center justify-between pb-2 border-b border-theme-border/50"
  >
    <h3
      class="text-xs font-bold uppercase tracking-wider text-theme-text/70 font-header"
    >
      Session Hub
    </h3>
    {#if entities.length > 0}
      <button
        type="button"
        onclick={() => sessionHubStore.clear()}
        class="text-[9px] uppercase font-bold text-rose-400 hover:text-rose-300 transition-colors"
      >
        Clear
      </button>
    {/if}
  </div>

  {#if entities.length === 0}
    <p class="text-[10px] text-theme-muted leading-relaxed">
      Generate drafts and click "Link to Hub" to build a connected campaign
      vault before exporting.
    </p>
  {:else}
    <ul class="flex flex-col gap-1.5 overflow-y-auto max-h-[500px] pr-1">
      {#each entities as entity (entity.id)}
        <li class="flex items-center gap-1">
          <button
            type="button"
            title={entity.summary}
            onclick={() => onSelect?.(entity)}
            class="flex-grow text-left p-2.5 rounded-lg bg-theme-surface/20 hover:bg-theme-surface/60 transition-colors border border-theme-border/30 hover:border-theme-border/50 flex flex-col gap-1 group relative"
          >
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-sm font-bold text-theme-text truncate flex items-center gap-1.5"
              >
                {#if entity.type === "character"}
                  <span
                    class="icon-[lucide--user] w-3.5 h-3.5 text-theme-primary"
                  ></span>
                {:else if entity.type === "faction"}
                  <span
                    class="icon-[lucide--flag] w-3.5 h-3.5 text-theme-primary"
                  ></span>
                {:else if entity.type === "settlement" || entity.type === "location"}
                  <span
                    class="icon-[lucide--map-pin] w-3.5 h-3.5 text-theme-primary"
                  ></span>
                {:else if entity.type === "item"}
                  <span
                    class="icon-[lucide--sparkles] w-3.5 h-3.5 text-theme-primary"
                  ></span>
                {:else}
                  <span
                    class="icon-[lucide--file-text] w-3.5 h-3.5 text-theme-primary"
                  ></span>
                {/if}
                {entity.title}
              </span>
            </div>
          </button>
          <div
            class="flex flex-row items-center gap-0.5 shrink-0 px-1 py-1 bg-theme-surface/20 rounded-lg border border-theme-border/20"
          >
            <button
              type="button"
              onclick={() =>
                sessionHubStore.updateEntity(entity.id, {
                  reuseEnabled: !entity.reuseEnabled,
                })}
              class="p-1.5 rounded flex items-center justify-center transition-colors {entity.reuseEnabled
                ? 'text-theme-primary bg-theme-primary/10 hover:bg-theme-primary/20'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface/50'}"
              title={entity.reuseEnabled
                ? "Context reuse enabled"
                : "Context reuse disabled"}
              aria-label={entity.reuseEnabled
                ? "Context reuse enabled"
                : "Context reuse disabled"}
            >
              <span class="icon-[lucide--zap] w-3.5 h-3.5" aria-hidden="true"></span>
            </button>
            <button
              type="button"
              onclick={() =>
                sessionHubStore.updateEntity(entity.id, {
                  pinned: !entity.pinned,
                })}
              class="p-1.5 rounded flex items-center justify-center transition-colors {entity.pinned
                ? 'text-theme-primary bg-theme-primary/10 hover:bg-theme-primary/20'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface/50'}"
              title={entity.pinned ? "Pinned in context" : "Not pinned"}
              aria-label={entity.pinned ? "Pinned in context" : "Not pinned"}
            >
              <span class="icon-[lucide--pin] w-3.5 h-3.5" aria-hidden="true"></span>
            </button>
            <button
              type="button"
              onclick={() => sessionHubStore.removeEntity(entity.id)}
              class="p-1.5 rounded flex items-center justify-center text-theme-muted hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
              title="Remove draft"
              aria-label="Remove draft"
            >
              <span class="icon-[lucide--trash-2] w-3.5 h-3.5" aria-hidden="true"></span>
            </button>
          </div>
        </li>
      {/each}
    </ul>
    <button
      type="button"
      onclick={() => onSave?.(entities)}
      class="w-full py-2 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all text-center mt-2"
    >
      Save Hub to Codex ({entities.length})
    </button>
  {/if}
</div>
