<script lang="ts">
  import { untrack } from "svelte";
  import {
    compileTemplate,
    validateTemplate,
    type DraftTemplate,
    type TemplateSection,
    type ValidationIssue,
  } from "entity-template-engine";
  import { categories } from "$lib/stores/categories.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import EntityTemplatePreview from "./EntityTemplatePreview.svelte";

  let {
    initial,
    title,
    onSave,
    onCancel,
  }: {
    initial: DraftTemplate;
    title: string;
    /** Should throw (with a readable message) when saving fails. */
    onSave: (draft: DraftTemplate) => Promise<void>;
    onCancel: () => void;
  } = $props();

  // The editor works on its own copy; a new `initial` does not reset it.
  const seed = untrack(() => $state.snapshot(initial) as DraftTemplate);

  let name = $state(seed.name);
  let entityType = $state(seed.entityType);
  let intro = $state(seed.intro ?? "");
  let sections = $state<TemplateSection[]>(
    seed.sections.map((s) => ({ ...s })),
  );
  let nextId = 1;
  let showIssues = $state(false);
  let saveError = $state("");
  let saving = $state(false);

  const draft = $derived<DraftTemplate>({
    name,
    entityType,
    intro: intro || undefined,
    sections,
  });
  const issues = $derived<ValidationIssue[]>(validateTemplate(draft));
  const preview = $derived(compileTemplate(draft));
  const snapshot = (d: DraftTemplate) =>
    JSON.stringify({
      name: d.name,
      entityType: d.entityType,
      intro: d.intro || undefined,
      sections: d.sections.map((s) => ({ ...s, hint: s.hint || undefined })),
    });
  const dirty = $derived(snapshot(draft) !== snapshot(seed));

  const typeOptions = $derived.by(() => {
    const options = categories.list.map((c) => ({ id: c.id, label: c.label }));
    if (entityType && !options.some((o) => o.id === entityType)) {
      options.push({ id: entityType, label: entityType });
    }
    return options;
  });

  const issueFor = (field: ValidationIssue["field"], sectionId?: string) =>
    showIssues
      ? issues.find(
          (i) =>
            i.field === field && (sectionId ? i.sectionId === sectionId : true),
        )
      : undefined;

  function newSectionId() {
    const taken = new Set(sections.map((s) => s.id));
    let id: string;
    do id = `n${nextId++}`;
    while (taken.has(id));
    return id;
  }

  function addSection() {
    sections = [...sections, { id: newSectionId(), title: "" }];
  }

  function removeSection(id: string) {
    sections = sections.filter((s) => s.id !== id);
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    sections = next;
  }

  async function save() {
    showIssues = true;
    saveError = "";
    if (issues.length) return;
    saving = true;
    try {
      await onSave($state.snapshot(draft) as DraftTemplate);
    } catch (err) {
      saveError =
        err instanceof Error && err.message
          ? err.message
          : "The template couldn't be saved.";
    } finally {
      saving = false;
    }
  }

  async function cancel() {
    if (dirty) {
      const discard = await notificationStore.confirm({
        title: "Discard changes?",
        message: "Your changes to this template haven't been saved.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        isDangerous: true,
      });
      if (!discard) return;
    }
    onCancel();
  }

  const inputClass =
    "w-full rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text focus-visible:outline-2 focus-visible:outline-theme-primary";
  const iconButton =
    "inline-flex h-7 w-7 items-center justify-center rounded border border-theme-border text-theme-muted transition-colors hover:text-theme-text disabled:cursor-not-allowed disabled:opacity-40";
</script>

<div class="space-y-4" data-testid="entity-template-editor">
  <div class="flex items-center justify-between gap-3">
    <h4
      class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em]"
    >
      {title}
    </h4>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <label class="block space-y-1 text-xs text-theme-muted">
      <span>Template name</span>
      <input
        class={inputClass}
        bind:value={name}
        maxlength="80"
        data-testid="entity-template-name"
      />
      {#if issueFor("name")}
        <span class="block text-theme-danger" role="alert"
          >{issueFor("name")?.message}</span
        >
      {/if}
    </label>
    <label class="block space-y-1 text-xs text-theme-muted">
      <span>Used for</span>
      <select
        class={inputClass}
        bind:value={entityType}
        data-testid="entity-template-type"
      >
        {#each typeOptions as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
      {#if issueFor("entityType")}
        <span class="block text-theme-danger" role="alert"
          >{issueFor("entityType")?.message}</span
        >
      {/if}
    </label>
  </div>

  <label class="block space-y-1 text-xs text-theme-muted">
    <span>Intro (optional, shown above the first section)</span>
    <textarea class={inputClass} rows="2" bind:value={intro}></textarea>
  </label>

  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-xs font-bold text-theme-text">Sections</span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded border border-theme-primary/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-primary hover:bg-theme-primary/10"
        onclick={addSection}
        data-testid="entity-template-add-section"
      >
        <span class="icon-[lucide--plus] h-3 w-3" aria-hidden="true"></span>
        Add section
      </button>
    </div>

    {#if issueFor("sections")}
      <p class="text-xs text-theme-danger" role="alert">
        {issueFor("sections")?.message}
      </p>
    {/if}

    <ul class="space-y-2">
      {#each sections as section, index (section.id)}
        <li
          class="space-y-2 rounded border border-theme-border bg-theme-surface p-3"
          data-testid="entity-template-section"
        >
          <div class="flex items-start gap-2">
            <div class="flex-1 space-y-2">
              <input
                class={inputClass}
                placeholder="Section title"
                aria-label="Section title"
                maxlength="120"
                bind:value={section.title}
                data-testid="entity-template-section-title"
              />
              {#if issueFor("section", section.id)}
                <span class="block text-xs text-theme-danger" role="alert"
                  >{issueFor("section", section.id)?.message}</span
                >
              {/if}
              <textarea
                class={inputClass}
                rows="2"
                placeholder="Hint: what belongs in this section?"
                aria-label="Section hint"
                bind:value={section.hint}
              ></textarea>
            </div>
            <div class="flex shrink-0 gap-1">
              <button
                type="button"
                class={iconButton}
                onclick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move section up"
                data-testid="entity-template-move-up"
              >
                <span
                  class="icon-[lucide--arrow-up] h-3.5 w-3.5"
                  aria-hidden="true"
                ></span>
              </button>
              <button
                type="button"
                class={iconButton}
                onclick={() => move(index, 1)}
                disabled={index === sections.length - 1}
                aria-label="Move section down"
                data-testid="entity-template-move-down"
              >
                <span
                  class="icon-[lucide--arrow-down] h-3.5 w-3.5"
                  aria-hidden="true"
                ></span>
              </button>
              <button
                type="button"
                class={iconButton}
                onclick={() => removeSection(section.id)}
                aria-label="Remove section"
                data-testid="entity-template-remove-section"
              >
                <span
                  class="icon-[lucide--trash-2] h-3.5 w-3.5"
                  aria-hidden="true"
                ></span>
              </button>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  </div>

  <div class="space-y-1">
    <span class="text-xs font-bold text-theme-text">Preview</span>
    <EntityTemplatePreview markdown={preview} />
  </div>

  {#if saveError}
    <p class="text-xs text-theme-danger" role="alert">{saveError}</p>
  {/if}

  <div class="flex justify-end gap-2">
    <button
      type="button"
      class="rounded border border-theme-border px-3 py-1.5 text-xs text-theme-muted hover:text-theme-text"
      onclick={cancel}
      data-testid="entity-template-cancel"
    >
      Cancel
    </button>
    <button
      type="button"
      class="rounded bg-theme-primary px-3 py-1.5 text-xs font-bold text-theme-bg hover:brightness-110 disabled:opacity-50"
      onclick={save}
      disabled={saving}
      data-testid="entity-template-save"
    >
      Save template
    </button>
  </div>
</div>
