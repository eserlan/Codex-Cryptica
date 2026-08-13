<script lang="ts">
  import type { Entity, StatSheetField } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";
  import {
    applyDerivedModifiers,
    computeAdjustedCounterValue,
    rollStatSheetDiceField,
  } from "$lib/utils/stat-sheet-field-actions";
  import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";
  import ItemTableNode from "./presentation/nodes/ItemTableNode.svelte";

  let {
    entity,
    onOpenEditor = () => {},
    idGenerator = systemIdGenerator,
  } = $props<{
    entity: Entity;
    onOpenEditor?: () => void;
    idGenerator?: IdGenerator;
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
      let newId = `field-${idGenerator.uuid()}`;
      while (usedIds.has(newId)) {
        newId = `field-${idGenerator.uuid()}`;
      }
      usedIds.add(newId);
      return { ...field, id: newId };
    });
    persistFields(deduped);
  });

  function persistFields(nextFields: StatSheetField[]) {
    if (readOnly) return;
    vault.updateEntity(entity.id, {
      statSheet: {
        templateId: entity.statSheet?.templateId ?? null,
        fields: applyDerivedModifiers(nextFields),
      },
    });
  }

  function updateFieldValue(
    fieldId: string,
    value: number | string | boolean | undefined,
  ) {
    persistFields(
      fields.map((f: StatSheetField) =>
        f.id === fieldId ? { ...f, value } : f,
      ),
    );
  }

  function updateField(fieldId: string, updates: Partial<StatSheetField>) {
    persistFields(
      fields.map((field: StatSheetField) =>
        field.id === fieldId ? { ...field, ...updates } : field,
      ),
    );
  }

  function adjustCounter(field: StatSheetField, direction: 1 | -1) {
    if (readOnly) return;
    updateFieldValue(field.id, computeAdjustedCounterValue(field, direction));
  }

  function toggleHeading(field: StatSheetField) {
    if (readOnly) return;
    persistFields(
      fields.map((f: StatSheetField) =>
        f.id === field.id ? { ...f, collapsed: !f.collapsed } : f,
      ),
    );
  }

  function toggleFavorite(field: StatSheetField) {
    if (readOnly) return;
    persistFields(
      fields.map((f: StatSheetField) =>
        f.id === field.id ? { ...f, favorite: !f.favorite } : f,
      ),
    );
  }

  // Only one field can be the token's health bar at a time, so setting it
  // on one field clears it from every other field in the same pass.
  function setBarField(field: StatSheetField) {
    if (readOnly) return;
    const next = field.barField ? null : field.id;
    persistFields(
      fields.map((f: StatSheetField) =>
        f.type === "counter" ? { ...f, barField: f.id === next } : f,
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

  function rollDice(field: StatSheetField) {
    if (!field.formula) return;
    void rollStatSheetDiceField(field);
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
            class="flex flex-wrap items-center justify-between gap-2 rounded border border-theme-border px-2 py-1.5"
            data-testid="stat-sheet-counter"
          >
            <span class="text-xs text-theme-text">{field.label}</span>
            <div class="ml-auto flex items-center gap-2">
              {#if !readOnly}
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded border transition-colors {field.favorite
                    ? 'border-theme-primary/30 bg-theme-primary/10 text-theme-primary'
                    : 'border-transparent text-theme-muted hover:border-theme-primary/40 hover:text-theme-primary'}"
                  onclick={() => toggleFavorite(field)}
                  aria-label={field.favorite
                    ? `Unpin ${field.label} from token quick stats`
                    : `Pin ${field.label} to token quick stats`}
                  aria-pressed={!!field.favorite}
                  data-testid="stat-sheet-favorite-toggle"
                >
                  <span
                    class="icon-[lucide--star] h-3.5 w-3.5"
                    class:fill-theme-primary={field.favorite}
                    aria-hidden="true"
                  ></span>
                </button>
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded border transition-colors {field.barField
                    ? 'border-theme-primary/30 bg-theme-primary/10 text-theme-primary'
                    : 'border-transparent text-theme-muted hover:border-theme-primary/40 hover:text-theme-primary'}"
                  onclick={() => setBarField(field)}
                  aria-label={field.barField
                    ? `Stop showing ${field.label} as the token health bar`
                    : `Show ${field.label} as the token health bar`}
                  aria-pressed={!!field.barField}
                  data-testid="stat-sheet-bar-toggle"
                >
                  <span
                    class="icon-[lucide--heart] h-3.5 w-3.5"
                    class:fill-theme-primary={field.barField}
                    aria-hidden="true"
                  ></span>
                </button>
              {/if}
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
          <div
            class="flex items-center justify-between gap-2 rounded border border-theme-border px-2 py-1.5"
          >
            <span class="text-xs text-theme-text">{field.label}</span>
            <div class="flex items-center gap-2">
              {#if !readOnly}
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded border transition-colors {field.favorite
                    ? 'border-theme-primary/30 bg-theme-primary/10 text-theme-primary'
                    : 'border-transparent text-theme-muted hover:border-theme-primary/40 hover:text-theme-primary'}"
                  onclick={() => toggleFavorite(field)}
                  aria-label={field.favorite
                    ? `Unpin ${field.label} from token quick stats`
                    : `Pin ${field.label} to token quick stats`}
                  aria-pressed={!!field.favorite}
                  data-testid="stat-sheet-favorite-toggle"
                >
                  <span
                    class="icon-[lucide--star] h-3.5 w-3.5"
                    class:fill-theme-primary={field.favorite}
                    aria-hidden="true"
                  ></span>
                </button>
              {/if}
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
            </div>
          </div>
        {:else if field.type === "text"}
          <div
            class="flex items-center justify-between gap-2 rounded border border-theme-border px-2 py-1.5"
          >
            <span class="text-xs text-theme-text">{field.label}</span>
            <div class="flex items-center gap-2">
              {#if !readOnly}
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded border transition-colors {field.favorite
                    ? 'border-theme-primary/30 bg-theme-primary/10 text-theme-primary'
                    : 'border-transparent text-theme-muted hover:border-theme-primary/40 hover:text-theme-primary'}"
                  onclick={() => toggleFavorite(field)}
                  aria-label={field.favorite
                    ? `Unpin ${field.label} from token quick stats`
                    : `Pin ${field.label} to token quick stats`}
                  aria-pressed={!!field.favorite}
                  data-testid="stat-sheet-favorite-toggle"
                >
                  <span
                    class="icon-[lucide--star] h-3.5 w-3.5"
                    class:fill-theme-primary={field.favorite}
                    aria-hidden="true"
                  ></span>
                </button>
              {/if}
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
            </div>
          </div>
        {:else if field.type === "longtext"}
          <div
            class="flex flex-col gap-1 rounded border border-theme-border px-2 py-1.5"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-theme-text">{field.label}</span>
              {#if !readOnly}
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded border transition-colors {field.favorite
                    ? 'border-theme-primary/30 bg-theme-primary/10 text-theme-primary'
                    : 'border-transparent text-theme-muted hover:border-theme-primary/40 hover:text-theme-primary'}"
                  onclick={() => toggleFavorite(field)}
                  aria-label={field.favorite
                    ? `Unpin ${field.label} from token quick stats`
                    : `Pin ${field.label} to token quick stats`}
                  aria-pressed={!!field.favorite}
                  data-testid="stat-sheet-favorite-toggle"
                >
                  <span
                    class="icon-[lucide--star] h-3.5 w-3.5"
                    class:fill-theme-primary={field.favorite}
                    aria-hidden="true"
                  ></span>
                </button>
              {/if}
            </div>
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
            class="flex flex-col gap-1 rounded border border-theme-border px-2 py-1.5"
            data-testid="stat-sheet-dice"
          >
            <span class="text-xs text-theme-text font-medium truncate"
              >{field.label}</span
            >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 min-w-0">
                <input
                  type="number"
                  class="w-16 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-center text-xs font-bold text-theme-text disabled:opacity-40"
                  value={typeof field.value === "number" ? field.value : ""}
                  disabled={readOnly}
                  placeholder="Target"
                  aria-label={`Target number for ${field.label}`}
                  oninput={(e) =>
                    updateFieldValue(
                      field.id,
                      (e.target as HTMLInputElement).value === ""
                        ? undefined
                        : Number((e.target as HTMLInputElement).value),
                    )}
                />
                <span class="text-xs text-theme-muted font-mono shrink-0"
                  >- {field.formula || "1d100"}</span
                >
              </div>
              <div class="flex items-center gap-2 shrink-0">
                {#if !readOnly}
                  <button
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded border transition-colors {field.favorite
                      ? 'border-theme-primary/30 bg-theme-primary/10 text-theme-primary'
                      : 'border-transparent text-theme-muted hover:border-theme-primary/40 hover:text-theme-primary'}"
                    onclick={() => toggleFavorite(field)}
                    aria-label={field.favorite
                      ? `Unpin ${field.label} from token quick stats`
                      : `Pin ${field.label} to token quick stats`}
                    aria-pressed={!!field.favorite}
                    data-testid="stat-sheet-favorite-toggle"
                  >
                    <span
                      class="icon-[lucide--star] h-3.5 w-3.5"
                      class:fill-theme-primary={field.favorite}
                      aria-hidden="true"
                    ></span>
                  </button>
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
          </div>
        {:else if field.type === "item-table"}
          <ItemTableNode
            {field}
            context={{
              fields,
              readOnly,
              mode: "view",
              onUpdateFieldValue: (fId, val) => updateFieldValue(fId, val),
              onUpdateField: (fId, updates) => updateField(fId, updates),
              onAdjustCounter: () => {},
            }}
          />
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
