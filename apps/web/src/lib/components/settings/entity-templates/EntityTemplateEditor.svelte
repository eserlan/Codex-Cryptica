<script lang="ts">
  import { untrack } from "svelte";
  import {
    validateTemplate,
    type DraftTemplate,
    type ValidationIssue,
  } from "entity-template-engine";
  import { categories } from "$lib/stores/categories.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

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
  let markdown = $state(seed.markdown);
  let showIssues = $state(false);
  let saveError = $state("");
  let saving = $state(false);

  const draft = $derived<DraftTemplate>({ name, entityType, markdown });
  const issues = $derived<ValidationIssue[]>(validateTemplate(draft));
  const dirty = $derived(
    name !== seed.name ||
      entityType !== seed.entityType ||
      markdown !== seed.markdown,
  );

  const typeOptions = $derived.by(() => {
    const options = categories.list.map((c) => ({ id: c.id, label: c.label }));
    if (entityType && !options.some((o) => o.id === entityType)) {
      options.push({ id: entityType, label: entityType });
    }
    return options;
  });

  const issueFor = (field: ValidationIssue["field"]) =>
    showIssues ? issues.find((i) => i.field === field) : undefined;

  async function save() {
    showIssues = true;
    saveError = "";
    if (issues.length) return;
    saving = true;
    try {
      await onSave({ name, entityType, markdown });
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
</script>

<div class="space-y-4" data-testid="entity-template-editor">
  <h4
    class="text-xs font-bold text-theme-primary uppercase font-header tracking-[0.2em]"
  >
    {title}
  </h4>

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
    <span>Template (markdown)</span>
    <textarea
      class="{inputClass} min-h-64 font-mono leading-relaxed"
      rows="14"
      spellcheck="false"
      placeholder="## Summary&#10;&#10;A short overview…&#10;&#10;## Goals"
      bind:value={markdown}
      data-testid="entity-template-markdown"
    ></textarea>
    <span class="block">
      This is the text a new note starts with. Leave it empty for a blank note.
    </span>
    {#if issueFor("markdown")}
      <span class="block text-theme-danger" role="alert"
        >{issueFor("markdown")?.message}</span
      >
    {/if}
  </label>

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
