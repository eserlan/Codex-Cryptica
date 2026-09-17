<script lang="ts">
  import type { Entity } from "schema";
  import type { FactionTurnRecord } from "@codex/faction-engine";
  import { bandLabel } from "@codex/faction-engine";
  import { factionTurn } from "$lib/stores/faction-turn.svelte";

  let {
    entity,
    history,
    vaultEntities,
  }: {
    entity: Entity;
    history: FactionTurnRecord[];
    vaultEntities: Record<string, Entity>;
  } = $props();

  /**
   * Windowed rather than rendered whole (SC-011).
   *
   * History is never pruned, so a long campaign legitimately reaches hundreds
   * of entries. Rendering them all would make opening the tab progressively
   * slower for exactly the campaigns this feature is meant to serve.
   */
  const PAGE = 25;
  let shown = $state(PAGE);

  const visible = $derived([...history].reverse().slice(0, shown));
  const undoable = $derived(factionTurn.undoableRecord(entity));
  let busyId = $state<string | null>(null);

  function dateLabel(record: FactionTurnRecord): string {
    const { year, month, day } = record.worldDate;
    if (day !== undefined) return `${year}, month ${month}, day ${day}`;
    return `${year}`;
  }

  async function undo(record: FactionTurnRecord) {
    if (busyId) return;
    busyId = record.id;
    try {
      if (record.promotedEventId) {
        // FR-039 — the GM decides what happens to the event they promoted.
        const stillExists = Boolean(vaultEntities[record.promotedEventId]);
        if (stillExists) {
          const proceed = confirm(
            "This turn was added to your timeline as an event. Undoing the turn leaves that event in place. Continue?",
          );
          if (!proceed) return;
        }
      }
      await factionTurn.undo(entity, record);
    } finally {
      busyId = null;
    }
  }

  async function promote(record: FactionTurnRecord) {
    if (busyId) return;
    busyId = record.id;
    try {
      await factionTurn.promote(entity, record);
    } finally {
      busyId = null;
    }
  }
</script>

<div>
  <h4 class="text-theme-text mb-2 font-medium">What they have done</h4>

  {#if history.length === 0}
    <p class="text-theme-muted text-xs">
      Turns this faction takes will be listed here, oldest last, with the
      reasoning behind each outcome kept in full.
    </p>
  {:else}
    <ul class="space-y-2">
      {#each visible as record (record.id)}
        <li
          class="rounded-md border border-theme-border p-2 text-xs"
          class:opacity-60={record.undone}
        >
          <div class="mb-1 flex items-baseline justify-between gap-2">
            <span class="text-theme-text font-medium">
              {dateLabel(record)} — {record.targetTitle}
            </span>
            <span class="text-theme-muted shrink-0">
              {bandLabel(record.resolution.finalBand)}
            </span>
          </div>

          <p class="text-theme-muted mb-1">{record.narrative}</p>

          <div class="text-theme-muted flex flex-wrap gap-2">
            {#if record.undone}
              <span class="italic">Undone</span>
            {/if}
            {#if record.isOverride}
              <span class="italic">Taken ahead of schedule</span>
            {/if}
            {#if record.resolution.aiUsed && record.resolution.aiReason}
              <span class="italic">Adjusted: {record.resolution.aiReason}</span>
            {/if}
            {#if record.promotedEventId}
              <span class="italic">On your timeline</span>
            {:else if !record.undone}
              <button
                type="button"
                class="underline hover:text-theme-text"
                disabled={busyId === record.id || factionTurn.isCommitting}
                onclick={() => promote(record)}
              >
                Add to timeline
              </button>
            {/if}
            {#if undoable?.id === record.id}
              <button
                type="button"
                class="underline hover:text-theme-text"
                disabled={busyId === record.id || factionTurn.isCommitting}
                data-testid="faction-undo"
                onclick={() => undo(record)}
              >
                Undo
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>

    {#if shown < history.length}
      <button
        type="button"
        class="text-theme-muted hover:text-theme-text mt-2 text-xs underline"
        onclick={() => (shown += PAGE)}
      >
        Show older turns ({history.length - shown} more)
      </button>
    {/if}
  {/if}
</div>
