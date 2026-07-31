<script lang="ts">
  import type { Entity, StatSheetField } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import {
    computeAdjustedCounterValue,
    rollStatSheetDiceField,
  } from "$lib/utils/stat-sheet-field-actions";

  let { entity } = $props<{ entity: Entity }>();

  const readOnly = $derived(vault.isGuest);
  const fields = $derived(entity.statSheet?.fields ?? []);
  const favorited = $derived(
    fields.filter(
      (f: StatSheetField) =>
        f.favorite && (f.type === "counter" || f.type === "dice"),
    ),
  );

  function persistFields(nextFields: StatSheetField[]) {
    if (readOnly) return;
    vault.updateEntity(entity.id, {
      statSheet: {
        templateId: entity.statSheet?.templateId ?? null,
        fields: nextFields,
      },
    });
  }

  function adjustCounter(field: StatSheetField, direction: 1 | -1) {
    if (readOnly) return;
    const next = computeAdjustedCounterValue(field, direction);
    persistFields(
      fields.map((f: StatSheetField) =>
        f.id === field.id ? { ...f, value: next } : f,
      ),
    );
  }

  function rollDice(field: StatSheetField) {
    void rollStatSheetDiceField(field);
  }
</script>

{#if favorited.length > 0}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex flex-col gap-1.5 rounded-lg border border-theme-border bg-theme-bg/50 p-2"
    ondblclick={(e) => e.stopPropagation()}
    onclick={(e) => e.stopPropagation()}
    data-testid="token-quick-stats"
  >
    {#each favorited as field (field.id)}
      {#if field.type === "counter"}
        <div
          class="flex items-center justify-between gap-2 text-xs"
          data-testid="token-quick-stats-counter"
        >
          <span class="text-theme-text">{field.label}</span>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
              onclick={() => adjustCounter(field, -1)}
              disabled={readOnly}
              aria-label={`Decrease ${field.label}`}
            >
              <span class="icon-[lucide--minus] h-3 w-3" aria-hidden="true"
              ></span>
            </button>
            <span
              class="min-w-[2rem] text-center font-bold text-theme-text"
              data-testid="token-quick-stats-counter-value"
            >
              {typeof field.value === "number" ? field.value : 0}
            </span>
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
              onclick={() => adjustCounter(field, 1)}
              disabled={readOnly}
              aria-label={`Increase ${field.label}`}
            >
              <span class="icon-[lucide--plus] h-3 w-3" aria-hidden="true"
              ></span>
            </button>
          </div>
        </div>
      {:else if field.type === "dice"}
        <div
          class="flex items-center justify-between gap-2 text-xs"
          data-testid="token-quick-stats-dice"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-theme-text font-medium truncate"
              >{field.label}</span
            >
            <input
              type="number"
              class="w-14 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-center text-xs font-bold text-theme-text disabled:opacity-40"
              value={typeof field.value === "number" ? field.value : ""}
              disabled={readOnly}
              placeholder="Tgt"
              aria-label={`Target number for ${field.label}`}
              oninput={(e) => {
                if (readOnly) return;
                const val =
                  (e.target as HTMLInputElement).value === ""
                    ? undefined
                    : Number((e.target as HTMLInputElement).value);
                persistFields(
                  fields.map((f: StatSheetField) =>
                    f.id === field.id ? { ...f, value: val } : f,
                  ),
                );
              }}
            />
            <span class="text-[10px] text-theme-muted font-mono shrink-0"
              >- {field.formula || "1d100"}</span
            >
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary"
              onclick={() => rollDice(field)}
              aria-label={`Roll ${field.label}`}
              data-testid="token-quick-stats-dice-roll"
            >
              <span class="icon-[lucide--dices] h-3.5 w-3.5" aria-hidden="true"
              ></span>
            </button>
          </div>
        </div>
      {/if}
    {/each}
  </div>
{:else}
  <p class="text-[10px] text-theme-muted" data-testid="token-quick-stats-empty">
    Star HP or a skill on the stat sheet to pin it here.
  </p>
{/if}
