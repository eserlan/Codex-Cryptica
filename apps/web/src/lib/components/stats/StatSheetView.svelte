<script lang="ts">
  import type { Entity, StatSheetField } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { diceHistory } from "$lib/stores/dice-history.svelte";
  import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";
  import { diceEngine, diceParser } from "dice-engine";

  let { entity, onOpenEditor = () => {} } = $props<{
    entity: Entity;
    onOpenEditor?: () => void;
  }>();

  const readOnly = $derived(vault.isGuest);
  const fields = $derived(entity.statSheet?.fields ?? []);

  // Surfaced in the empty state so entities created *before* a category
  // default was configured (or that just never got one applied) still have
  // a one-click path to it, instead of requiring a trip to Settings.
  const categoryDefaultTemplate = $derived.by(() => {
    const templateId = statSheetTemplates.categoryDefaults[entity.type];
    if (!templateId) return null;
    return (
      statSheetTemplates.allTemplates.find((t) => t.id === templateId) ?? null
    );
  });

  function applyDefaultTemplate() {
    if (!categoryDefaultTemplate) return;
    vault.updateEntity(entity.id, {
      statSheet: {
        templateId: categoryDefaultTemplate.id,
        fields: statSheetTemplates.cloneTemplateFields(categoryDefaultTemplate),
      },
    });
  }

  // Self-heals data saved before templates were guaranteed to produce
  // globally-unique field ids (e.g. appending two built-in templates that
  // both used "hp"). Duplicate ids break `field.id`-keyed mutations — every
  // field sharing an id would update together — so any duplicate found on
  // load is silently regenerated and persisted once.
  $effect(() => {
    if (readOnly) return;
    const seen = new Set<string>();
    let hasDuplicates = false;
    for (const field of fields) {
      if (seen.has(field.id)) {
        hasDuplicates = true;
        break;
      }
      seen.add(field.id);
    }
    if (!hasDuplicates) return;

    const usedIds = new Set<string>();
    const deduped = fields.map((field: StatSheetField) => {
      if (!usedIds.has(field.id)) {
        usedIds.add(field.id);
        return field;
      }
      const newId = `field-${crypto.randomUUID()}`;
      usedIds.add(newId);
      return { ...field, id: newId };
    });
    persistFields(deduped);
  });

  // Rolling state per dice field id, keyed so multiple dice fields don't
  // clobber each other's transient result/error display.
  let rollResults = $state<Record<string, { text: string; isError: boolean }>>(
    {},
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

  function updateFieldValue(fieldId: string, value: number | string | boolean) {
    persistFields(
      fields.map((f: StatSheetField) =>
        f.id === fieldId ? { ...f, value } : f,
      ),
    );
  }

  function adjustCounter(field: StatSheetField, direction: 1 | -1) {
    if (readOnly) return;
    const step = field.step ?? 1;
    const current = typeof field.value === "number" ? field.value : 0;
    let next = current + step * direction;
    if (field.max !== undefined) next = Math.min(field.max, next);
    if (field.min !== undefined) next = Math.max(field.min, next);
    updateFieldValue(field.id, next);
  }

  function toggleHeading(field: StatSheetField) {
    if (readOnly) return;
    persistFields(
      fields.map((f: StatSheetField) =>
        f.id === field.id ? { ...f, collapsed: !f.collapsed } : f,
      ),
    );
  }

  // A field is hidden when it falls under a collapsed heading, i.e. any
  // heading preceding it (before the next heading) is collapsed.
  const visibleFieldIds = $derived.by(() => {
    const visible = new Set<string>();
    let collapsed = false;
    for (const field of fields as StatSheetField[]) {
      if (field.type === "heading") {
        collapsed = !!field.collapsed;
        visible.add(field.id);
        continue;
      }
      if (!collapsed) visible.add(field.id);
    }
    return visible;
  });

  async function rollDice(field: StatSheetField) {
    if (!field.formula) return;
    try {
      const command = diceParser.parse(field.formula);
      const result = diceEngine.execute(command);
      rollResults = {
        ...rollResults,
        [field.id]: { text: `= ${result.total}`, isError: false },
      };
      await diceHistory.addResult(result, "modal");
      if (mapSession.vttEnabled) {
        mapSession.sendResolvedRollMessage(
          `${field.label}: ${field.formula}`,
          result,
        );
      }
    } catch (e: any) {
      rollResults = {
        ...rollResults,
        [field.id]: { text: e?.message ?? "Invalid formula", isError: true },
      };
    }
  }
</script>

{#if fields.length === 0}
  <div
    class="flex flex-col items-center gap-3 py-8 text-center"
    data-testid="stat-sheet-empty"
  >
    <span class="icon-[lucide--list-checks] h-8 w-8 text-theme-muted"></span>
    <p class="max-w-xs text-xs text-theme-muted">
      No stats added yet. Add fields manually or apply a template to get
      started.
    </p>
    {#if !readOnly}
      <div class="flex items-center gap-2">
        {#if categoryDefaultTemplate}
          <button
            type="button"
            class="rounded border border-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-primary hover:bg-theme-primary/10"
            onclick={applyDefaultTemplate}
            data-testid="stat-sheet-apply-default"
          >
            Apply Default: {categoryDefaultTemplate.name}
          </button>
        {/if}
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={onOpenEditor}
          data-testid="stat-sheet-add-fields"
        >
          Add Fields
        </button>
      </div>
    {/if}
  </div>
{:else}
  <div class="flex flex-col gap-2" data-testid="stat-sheet-view">
    {#each fields as field, index (`${field.id}-${index}`)}
      {#if visibleFieldIds.has(field.id)}
        {#if field.type === "heading"}
          <button
            type="button"
            class="mt-2 flex w-full items-center gap-2 border-b border-theme-border pb-1 text-left text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-primary"
            onclick={() => toggleHeading(field)}
            data-testid="stat-sheet-heading"
            aria-expanded={!field.collapsed}
          >
            <span
              class="icon-[lucide--chevron-right] h-3.5 w-3.5 transition-transform {field.collapsed
                ? ''
                : 'rotate-90'}"
              aria-hidden="true"
            ></span>
            {field.label}
          </button>
        {:else if field.type === "counter"}
          <div
            class="flex items-center justify-between gap-2 rounded border border-theme-border px-2 py-1.5"
            data-testid="stat-sheet-counter"
          >
            <span class="text-xs text-theme-text">{field.label}</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
                onclick={() => adjustCounter(field, -1)}
                disabled={readOnly}
                aria-label={`Decrease ${field.label}`}
              >
                <span class="icon-[lucide--minus] h-3 w-3" aria-hidden="true"
                ></span>
              </button>
              <span
                class="min-w-[2.5rem] text-center text-sm font-bold text-theme-text"
                data-testid="stat-sheet-counter-value"
              >
                {typeof field.value === "number" ? field.value : 0}
              </span>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
                onclick={() => adjustCounter(field, 1)}
                disabled={readOnly}
                aria-label={`Increase ${field.label}`}
              >
                <span class="icon-[lucide--plus] h-3 w-3" aria-hidden="true"
                ></span>
              </button>
            </div>
          </div>
        {:else if field.type === "number"}
          <label
            class="flex items-center justify-between gap-2 rounded border border-theme-border px-2 py-1.5"
          >
            <span class="text-xs text-theme-text">{field.label}</span>
            <input
              type="number"
              class="w-20 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-right text-xs text-theme-text disabled:opacity-40"
              value={typeof field.value === "number" ? field.value : ""}
              disabled={readOnly}
              oninput={(e) =>
                updateFieldValue(
                  field.id,
                  Number((e.target as HTMLInputElement).value) || 0,
                )}
            />
          </label>
        {:else if field.type === "text"}
          <label
            class="flex items-center justify-between gap-2 rounded border border-theme-border px-2 py-1.5"
          >
            <span class="text-xs text-theme-text">{field.label}</span>
            <input
              type="text"
              class="w-40 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-right text-xs text-theme-text disabled:opacity-40"
              value={typeof field.value === "string" ? field.value : ""}
              disabled={readOnly}
              oninput={(e) =>
                updateFieldValue(
                  field.id,
                  (e.target as HTMLInputElement).value,
                )}
            />
          </label>
        {:else if field.type === "longtext"}
          <div
            class="flex flex-col gap-1 rounded border border-theme-border px-2 py-1.5"
          >
            <span class="text-xs text-theme-text">{field.label}</span>
            <textarea
              class="w-full resize-y rounded border border-theme-border bg-theme-bg px-1.5 py-1 text-xs text-theme-text disabled:opacity-40"
              rows="3"
              disabled={readOnly}
              value={typeof field.value === "string" ? field.value : ""}
              oninput={(e) =>
                updateFieldValue(
                  field.id,
                  (e.target as HTMLTextAreaElement).value,
                )}
            ></textarea>
          </div>
        {:else if field.type === "dice"}
          <div
            class="flex items-center justify-between gap-2 rounded border border-theme-border px-2 py-1.5"
            data-testid="stat-sheet-dice"
          >
            <div class="flex flex-col">
              <span class="text-xs text-theme-text">{field.label}</span>
              <span class="text-[10px] text-theme-muted">{field.formula}</span>
            </div>
            <div class="flex items-center gap-2">
              {#if rollResults[field.id]}
                <span
                  class="text-xs font-bold {rollResults[field.id].isError
                    ? 'text-red-500'
                    : 'text-theme-primary'}"
                  data-testid="stat-sheet-dice-result"
                >
                  {rollResults[field.id].text}
                </span>
              {/if}
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                onclick={() => rollDice(field)}
                aria-label={`Roll ${field.label}`}
                data-testid="stat-sheet-dice-roll"
              >
                <span class="icon-[lucide--dices] h-4 w-4" aria-hidden="true"
                ></span>
              </button>
            </div>
          </div>
        {/if}
      {/if}
    {/each}
    {#if !readOnly}
      <button
        type="button"
        class="mt-2 self-start text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:text-theme-primary"
        onclick={onOpenEditor}
        data-testid="stat-sheet-edit-layout"
      >
        Edit Layout
      </button>
    {/if}
  </div>
{/if}
