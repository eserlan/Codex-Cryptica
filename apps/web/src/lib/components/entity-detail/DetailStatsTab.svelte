<script lang="ts">
  import type { Entity, StatSheetField, StatSheetTemplate } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import StatSheetView from "$lib/components/stats/StatSheetView.svelte";
  import StatSheetEditor from "$lib/components/stats/StatSheetEditor.svelte";
  import StatSheetTemplateModal from "$lib/components/stats/StatSheetTemplateModal.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";
  import { presentationTemplates } from "$lib/stores/presentation-templates.svelte";
  import PresentationRenderer from "$lib/components/stats/presentation/PresentationRenderer.svelte";
  import PresentationTemplatePicker from "$lib/components/stats/presentation/PresentationTemplatePicker.svelte";
  import PresentationTemplateManager from "$lib/components/stats/presentation/PresentationTemplateManager.svelte";
  import type { PresentationRenderContext } from "$lib/components/stats/presentation/types";
  import {
    isTemplateUsable,
    parseTemplate,
    resolvePresentationTemplate,
    resolveStatSheetSchema,
    validateAst,
  } from "@codex/stat-sheet-engine";
  import {
    applyDerivedModifiers,
    computeAdjustedCounterValue,
  } from "$lib/utils/stat-sheet-field-actions";

  let { entity } = $props<{ entity: Entity }>();

  let isEditingLayout = $state(false);
  let showTemplateModal = $state(false);
  let showPresentationManager = $state(false);

  const readOnly = $derived(vault.isGuest);
  const hasStats = $derived(
    (entity.statSheet?.fields?.length ?? 0) > 0 ||
      !!entity.statSheet?.templateId,
  );

  // FR-010: decide render-via-presentation-template vs. fall back to the
  // standard StatSheetView renderer, unchanged, whenever the resolved
  // template is missing, invalid, or its schema no longer exists.
  //
  // The schema unions the bound template's fields with whatever this
  // character has of its own, so per-character skills stay referenceable by
  // a layout and placeable in the Presentation editor.
  const schema = $derived.by<StatSheetTemplate | null>(() =>
    resolveStatSheetSchema(
      entity.statSheet,
      entity.statSheet?.templateId
        ? statSheetTemplates.allTemplates.find(
            (t) => t.id === entity.statSheet?.templateId,
          )
        : null,
      `entity-local-stat-sheet:${entity.id}`,
    ),
  );
  const resolvedTemplate = $derived(
    schema
      ? resolvePresentationTemplate(
          entity.statSheet,
          statSheetTemplates.getDefaultPresentationTemplateId(schema.id),
          presentationTemplates.availableTemplatesForSchema(
            schema.id,
            schema.fields,
            entity.type,
          ),
        )
      : null,
  );
  const usable = $derived(
    resolvedTemplate && schema
      ? isTemplateUsable(resolvedTemplate, schema)
      : false,
  );
  const presentationAst = $derived.by(() => {
    if (!usable || !resolvedTemplate || !schema) return null;
    const parsed = parseTemplate(
      resolvedTemplate.source,
      resolvedTemplate.formatVersion,
    );
    if (!parsed.ok) return null;
    return validateAst(parsed.ast, schema);
  });

  function persistFields(nextFields: StatSheetField[]) {
    if (readOnly) return;
    vault.updateEntity(entity.id, {
      statSheet: {
        templateId: entity.statSheet?.templateId ?? null,
        fields: applyDerivedModifiers(nextFields),
        presentationTemplateId:
          entity.statSheet?.presentationTemplateId ?? null,
      },
    });
  }

  const renderContext: PresentationRenderContext = {
    get fields() {
      return entity.statSheet?.fields ?? [];
    },
    get readOnly() {
      return readOnly;
    },
    mode: "view",
    onUpdateFieldValue: (fieldId, value) => {
      persistFields(
        (entity.statSheet?.fields ?? []).map((f: StatSheetField) =>
          f.id === fieldId ? { ...f, value } : f,
        ),
      );
    },
    onUpdateField: (fieldId, updates) => {
      persistFields(
        (entity.statSheet?.fields ?? []).map((f: StatSheetField) =>
          f.id === fieldId ? { ...f, ...updates } : f,
        ),
      );
    },
    onAdjustCounter: (field, direction) => {
      persistFields(
        (entity.statSheet?.fields ?? []).map((f: StatSheetField) =>
          f.id === field.id
            ? { ...f, value: computeAdjustedCounterValue(field, direction) }
            : f,
        ),
      );
    },
  };

  async function clearStatSheet() {
    const confirmed = await notificationStore.confirm({
      title: "Clear Stat Sheet",
      message: `Remove all stat fields and template assignment from "${entity.title}"?`,
      confirmLabel: "Clear Stat Sheet",
      isDangerous: true,
    });
    if (!confirmed) return;

    await vault.updateEntity(entity.id, {
      statSheet: { templateId: null, fields: [], presentationTemplateId: null },
    });
    isEditingLayout = false;
  }
</script>

<div class="flex flex-col gap-3 pb-8" data-testid="detail-stats-tab">
  <div class="flex items-center justify-between">
    <span
      class="text-[10px] font-bold uppercase tracking-widest text-theme-muted"
    >
      Stat Sheet
    </span>
    {#if !readOnly}
      <div class="flex items-center gap-2">
        {#if hasStats}
          <button
            type="button"
            class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-red-500 hover:text-red-500"
            onclick={clearStatSheet}
            data-testid="stat-sheet-clear-stats"
          >
            Clear
          </button>
        {/if}
        <button
          type="button"
          class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={() => (showTemplateModal = true)}
          data-testid="stat-sheet-open-templates"
        >
          Templates
        </button>
        {#if schema}
          <button
            type="button"
            class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
            onclick={() => (showPresentationManager = true)}
            data-testid="stat-sheet-open-presentation-templates"
          >
            Presentations
          </button>
        {/if}
        <button
          type="button"
          class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={() => (isEditingLayout = !isEditingLayout)}
          data-testid="stat-sheet-toggle-editor"
        >
          {isEditingLayout ? "Done Editing" : "Edit Layout"}
        </button>
      </div>
    {/if}
  </div>

  {#if isEditingLayout}
    <StatSheetEditor {entity} onClose={() => (isEditingLayout = false)} />
  {:else}
    {#if schema && hasStats}
      <PresentationTemplatePicker {entity} {schema} />
    {/if}
    {#if usable && presentationAst}
      <PresentationRenderer nodes={presentationAst} context={renderContext} />
    {:else}
      <StatSheetView {entity} onOpenEditor={() => (isEditingLayout = true)} />
    {/if}
  {/if}
</div>

{#if showTemplateModal}
  <StatSheetTemplateModal
    {entity}
    onClose={() => (showTemplateModal = false)}
  />
{/if}

{#if showPresentationManager && schema}
  <PresentationTemplateManager
    {schema}
    entityType={entity.type}
    onClose={() => (showPresentationManager = false)}
  />
{/if}
