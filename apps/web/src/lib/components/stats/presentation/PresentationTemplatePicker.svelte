<script lang="ts">
  import type { Entity, PresentationTemplate, StatSheetTemplate } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";
  import { presentationTemplates } from "$lib/stores/presentation-templates.svelte";

  let { entity, schema }: { entity: Entity; schema: StatSheetTemplate } =
    $props();

  const readOnly = $derived(vault.isGuest);
  // Exact-match only (Clarifications): a presentation is offered here iff
  // it declares this entity's schema as its target.
  const available = $derived(
    presentationTemplates.availableTemplatesForSchema(schema.id),
  );
  const currentOverrideId = $derived(
    entity.statSheet?.presentationTemplateId ?? null,
  );
  const schemaDefaultId = $derived(
    statSheetTemplates.getDefaultPresentationTemplateId(schema.id),
  );
  const effectiveId = $derived(currentOverrideId ?? schemaDefaultId);

  function selectValue(t: PresentationTemplate) {
    return t.id;
  }

  async function setEntityOverride(templateId: string | null) {
    await vault.updateEntity(entity.id, {
      statSheet: {
        templateId: entity.statSheet?.templateId ?? null,
        fields: entity.statSheet?.fields ?? [],
        presentationTemplateId: templateId,
      },
    });
  }

  async function setSchemaDefault(templateId: string | null) {
    await statSheetTemplates.setDefaultPresentationTemplate(
      schema.id,
      templateId,
    );
  }
</script>

{#if !readOnly}
  <div
    class="flex flex-wrap items-center gap-2"
    data-testid="presentation-template-picker"
  >
    <span
      class="text-[10px] font-bold uppercase tracking-widest text-theme-muted"
    >
      Presentation
    </span>
    <select
      class="rounded border border-theme-border bg-theme-surface px-2 py-1 text-xs text-theme-text"
      value={effectiveId ?? ""}
      aria-label="Presentation template"
      onchange={(e) => {
        const value = (e.target as HTMLSelectElement).value;
        void setEntityOverride(value || null);
      }}
      data-testid="presentation-template-select"
    >
      <option value="">Standard (no presentation template)</option>
      {#each available as t (selectValue(t))}
        <option value={t.id}>
          {t.name}{t.id === schemaDefaultId ? " (schema default)" : ""}
        </option>
      {/each}
    </select>
    {#if currentOverrideId}
      <button
        type="button"
        class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={() => setEntityOverride(null)}
        data-testid="presentation-template-clear-override"
      >
        Use Schema Default
      </button>
      <button
        type="button"
        class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={() => setSchemaDefault(currentOverrideId)}
        data-testid="presentation-template-make-schema-default"
      >
        Set as Schema Default
      </button>
    {/if}
  </div>
{/if}
