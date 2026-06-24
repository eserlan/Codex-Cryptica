<script lang="ts">
  import type { Entity } from "schema";
  import type { EntityTimeline } from "chronology-engine";
  import { buildEntityTimeline } from "chronology-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import { calendarStore } from "$lib/stores/calendar.svelte";

  let { entity } = $props<{ entity: Entity }>();

  const timeline = $derived<EntityTimeline>(
    buildEntityTimeline(entity, vault.allEntities, calendarStore.config),
  );

  function openEvent(eventId: string) {
    vault.selectedEntityId = eventId;
  }
</script>

{#if timeline.isEmpty}
  <div
    class="py-8 text-center text-theme-muted text-sm"
    data-testid="timeline-empty-state"
  >
    <p class="mb-1 font-medium text-theme-secondary">No linked events yet.</p>
    <p>Add or link events to build this entity's history.</p>
  </div>
{:else}
  <div class="flex flex-col gap-6 py-2" data-testid="timeline-groups">
    {#each timeline.groups as group (group.kind)}
      <section>
        {#if group.kind === "undated"}
          <h3
            class="mb-2 text-[10px] font-bold tracking-widest uppercase text-theme-muted font-header"
            data-testid="timeline-undated-heading"
          >
            Undated
          </h3>
        {/if}
        <ul class="flex flex-col gap-2" role="list">
          {#each group.rows as row (row.eventId)}
            <li>
              <button
                type="button"
                class="w-full text-left rounded border border-theme-border bg-theme-bg hover:border-theme-primary hover:bg-theme-hover transition-colors px-3 py-2 focus:outline-none focus:ring-1 focus:ring-theme-primary"
                data-testid="timeline-row"
                onclick={() => openEvent(row.eventId)}
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEvent(row.eventId);
                  }
                }}
              >
                <div class="flex items-start justify-between gap-2">
                  <span
                    class="font-medium text-sm text-theme-text leading-tight"
                    >{row.title}</span
                  >
                  {#if row.dateKind !== "missing"}
                    <span
                      class="shrink-0 text-[10px] text-theme-muted font-mono"
                      >{row.displayDateLabel}</span
                    >
                  {/if}
                </div>
                {#if row.eventCategory}
                  <span
                    class="mt-1 inline-block text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-theme-tag text-theme-tag-text"
                    data-testid="timeline-label">{row.eventCategory}</span
                  >
                {/if}
                {#if row.summary}
                  <p class="mt-1 text-xs text-theme-muted line-clamp-2">
                    {row.summary}
                  </p>
                {/if}
                {#if row.participantTitles.length > 0}
                  <p class="mt-1 text-[10px] text-theme-muted">
                    {row.participantTitles.join(", ")}
                  </p>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
{/if}
