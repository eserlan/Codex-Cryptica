<script lang="ts">
  import {
    PRESENTATION_TEMPLATE_FORMAT_VERSION,
    type StatSheetTemplate,
    type StatSheetField,
    type PresentationTemplate,
  } from "schema";
  import { presentationTemplates } from "$lib/stores/presentation-templates.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import {
    parseTemplate,
    validateAst,
    exportPresentationTemplate,
  } from "@codex/stat-sheet-engine";
  import type {
    MissingFieldNode,
    UnknownDirectiveNode,
  } from "@codex/stat-sheet-engine";
  import PresentationRenderer from "./PresentationRenderer.svelte";
  import type { PresentationRenderContext } from "./types";

  let {
    schema,
    template = null,
    duplicate = false,
    onClose = () => {},
    onSaved = () => {},
  }: {
    schema: StatSheetTemplate;
    /** Template being edited, or duplicated (when `duplicate` is true).
     * `null` means "create from scratch". */
    template?: PresentationTemplate | null;
    duplicate?: boolean;
    onClose?: () => void;
    onSaved?: (saved: PresentationTemplate) => void;
  } = $props();

  const isNewRecord = $derived(!template || duplicate);

  // Seeded once from props at mount to initialize editable form state;
  // not meant to stay reactive to later prop changes (this component is
  // remounted per template via PresentationTemplateManager's #if block).
  // svelte-ignore state_referenced_locally
  let name = $state(
    template
      ? duplicate
        ? presentationTemplates.uniqueNameForSchema(
            `${template.name} Copy`,
            schema.id,
          )
        : template.name
      : presentationTemplates.uniqueNameForSchema("New Layout", schema.id),
  );
  // svelte-ignore state_referenced_locally
  let description = $state(template?.description ?? "");
  // svelte-ignore state_referenced_locally
  let source = $state(template?.source ?? "");
  let isSaving = $state(false);
  let saveError = $state("");
  let showAutocomplete = $state(false);
  let autocompleteFilter = $state("");
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  // Sample values for live preview (contract: preview mode reads through
  // the same field-value accessor as real rendering, just backed by
  // representative data instead of an entity — spec.md Assumptions).
  function sampleValueFor(field: StatSheetField): StatSheetField["value"] {
    switch (field.type) {
      case "counter":
        return field.max !== undefined ? Math.round(field.max * 0.6) : 5;
      case "number":
        return 10;
      case "text":
        return "Sample text";
      case "longtext":
        return "Sample notes go here.";
      case "dice":
        return undefined;
      default:
        return undefined;
    }
  }
  const sampleFields = $derived<StatSheetField[]>(
    schema.fields.map((f) => ({ ...f, value: sampleValueFor(f) })),
  );

  const parsed = $derived(
    parseTemplate(source, PRESENTATION_TEMPLATE_FORMAT_VERSION),
  );
  const previewAst = $derived(
    parsed.ok ? validateAst(parsed.ast, schema) : null,
  );

  function collectDiagnostics(nodes: unknown[]): {
    missing: MissingFieldNode[];
    unknown: UnknownDirectiveNode[];
  } {
    const missing: MissingFieldNode[] = [];
    const unknown: UnknownDirectiveNode[] = [];
    function walk(list: unknown[]) {
      for (const n of list) {
        const node = n as Record<string, unknown>;
        if (node.type === "missing-field")
          missing.push(node as unknown as MissingFieldNode);
        if (node.type === "unknown-directive")
          unknown.push(node as unknown as UnknownDirectiveNode);
        for (const key of ["children", "items", "header", "rows"]) {
          const val = node[key];
          if (Array.isArray(val)) {
            walk((val as unknown[]).flat(2));
          }
        }
      }
    }
    walk(nodes);
    return { missing, unknown };
  }

  const diagnostics = $derived(
    previewAst ? collectDiagnostics(previewAst) : { missing: [], unknown: [] },
  );

  const previewContext: PresentationRenderContext = {
    get fields() {
      return sampleFields;
    },
    readOnly: true,
    mode: "preview",
    onUpdateFieldValue: () => {},
    onAdjustCounter: () => {},
  };

  const filteredFields = $derived(
    schema.fields.filter(
      (f) =>
        f.id.toLowerCase().includes(autocompleteFilter.toLowerCase()) ||
        f.label.toLowerCase().includes(autocompleteFilter.toLowerCase()),
    ),
  );

  function insertFieldReference(field: StatSheetField) {
    const el = textareaEl;
    const token = `{{stat.${field.id}}}`;
    if (!el) {
      source = source + token;
    } else {
      const start = el.selectionStart ?? source.length;
      const end = el.selectionEnd ?? source.length;
      source = source.slice(0, start) + token + source.slice(end);
      const nextPos = start + token.length;
      queueMicrotask(() => {
        el.focus();
        el.setSelectionRange(nextPos, nextPos);
      });
    }
    showAutocomplete = false;
    autocompleteFilter = "";
  }

  async function save() {
    if (!name.trim()) return;
    isSaving = true;
    saveError = "";
    try {
      const saved = await presentationTemplates.saveTemplate({
        id: isNewRecord ? undefined : template?.id,
        schemaTemplateId: schema.id,
        name: name.trim(),
        description: description.trim() || null,
        source,
        formatVersion: PRESENTATION_TEMPLATE_FORMAT_VERSION,
      });
      if (!saved) {
        saveError = "Failed to save template.";
        return;
      }
      notificationStore.notify(`Saved template "${saved.name}"`, "success");
      onSaved(saved);
      onClose();
    } catch (e) {
      saveError = e instanceof Error ? e.message : "Failed to save template.";
    } finally {
      isSaving = false;
    }
  }

  function exportCurrent() {
    if (!template || duplicate) return;
    const pkg = exportPresentationTemplate(template);
    const blob = new Blob([JSON.stringify(pkg, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.presentation.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div
  class="fixed inset-0 z-[110] flex items-center justify-center bg-theme-bg/80 p-4"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && onClose()}
>
  <div
    class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface"
    role="dialog"
    aria-modal="true"
    aria-labelledby="presentation-editor-title"
    data-testid="presentation-template-editor"
  >
    <div
      class="flex items-center justify-between border-b border-theme-border bg-theme-bg/50 p-4"
    >
      <h2
        id="presentation-editor-title"
        class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
      >
        {isNewRecord
          ? "New Presentation Template"
          : "Edit Presentation Template"}
      </h2>
      <button
        type="button"
        class="text-theme-muted hover:text-theme-text"
        onclick={onClose}
        aria-label="Close"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
            for="presentation-template-name"
          >
            Name
          </label>
          <input
            id="presentation-template-name"
            class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text"
            bind:value={name}
            data-testid="presentation-template-name-input"
          />
        </div>
        <div>
          <label
            class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
            for="presentation-template-description"
          >
            Description
          </label>
          <input
            id="presentation-template-description"
            class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text"
            bind:value={description}
          />
        </div>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <span
              class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
              >Markdown Source</span
            >
            <div class="relative">
              <button
                type="button"
                class="rounded border border-theme-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                onclick={() => (showAutocomplete = !showAutocomplete)}
                data-testid="presentation-editor-insert-field"
              >
                Insert Field
              </button>
              {#if showAutocomplete}
                <div
                  class="absolute right-0 z-10 mt-1 w-56 rounded border border-theme-border bg-theme-surface p-2 shadow-xl"
                  data-testid="presentation-editor-autocomplete"
                >
                  <input
                    class="mb-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-1 text-xs text-theme-text"
                    placeholder="Filter fields..."
                    bind:value={autocompleteFilter}
                    data-testid="presentation-editor-autocomplete-filter"
                  />
                  <ul class="max-h-40 overflow-y-auto">
                    {#each filteredFields as field (field.id)}
                      <li>
                        <button
                          type="button"
                          class="w-full rounded px-2 py-1 text-left text-xs text-theme-text hover:bg-theme-primary/10"
                          onclick={() => insertFieldReference(field)}
                          data-testid="presentation-editor-autocomplete-option"
                        >
                          {field.label}
                          <span class="text-theme-muted">({field.id})</span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          </div>
          <textarea
            bind:this={textareaEl}
            bind:value={source}
            rows="14"
            class="w-full flex-1 resize-none rounded border border-theme-border bg-theme-bg p-2 font-mono text-xs text-theme-text"
            placeholder={`# Heading\n\n:::stat-group columns=2\n{{stat.hp display="current-max"}}\n:::`}
            data-testid="presentation-editor-source"
          ></textarea>

          {#if diagnostics.missing.length > 0 || diagnostics.unknown.length > 0}
            <ul
              class="flex flex-col gap-1"
              data-testid="presentation-editor-diagnostics"
            >
              {#each diagnostics.missing as m, i (i)}
                <li
                  class="rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400"
                >
                  This refers to a field ("{m.fieldId}") that doesn't exist on
                  the schema.
                </li>
              {/each}
              {#each diagnostics.unknown as u, i (i)}
                <li
                  class="rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400"
                >
                  Unsupported layout section: "{u.name}"
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <div class="flex flex-col gap-1.5">
          <span
            class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
            >Preview</span
          >
          <div
            class="flex-1 rounded border border-theme-border bg-theme-bg/50 p-3"
            data-testid="presentation-editor-preview"
          >
            {#if previewAst}
              <PresentationRenderer
                nodes={previewAst}
                context={previewContext}
              />
            {/if}
          </div>
        </div>
      </div>

      {#if saveError}
        <p class="mt-3 text-xs text-red-400" role="alert">{saveError}</p>
      {/if}
    </div>

    <div
      class="flex items-center justify-between gap-2 border-t border-theme-border p-4"
    >
      {#if !isNewRecord}
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={exportCurrent}
          data-testid="presentation-editor-export"
        >
          Export
        </button>
      {:else}
        <span></span>
      {/if}
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
          onclick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-bg disabled:opacity-40"
          onclick={save}
          disabled={!name.trim() || isSaving}
          data-testid="presentation-editor-save"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  </div>
</div>
