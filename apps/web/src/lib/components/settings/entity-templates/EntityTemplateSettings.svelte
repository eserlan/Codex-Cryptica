<script lang="ts">
  import type { DraftTemplate, EntityTemplate } from "entity-template-engine";
  import { parseMarkdownToSections } from "entity-template-engine";
  import { categories } from "$lib/stores/categories.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import {
    entityTemplateStore,
    EntityTemplateError,
  } from "$lib/stores/entity-templates/entity-template-store.svelte";
  import { downloadText } from "$lib/utils/download";
  import EntityTemplateEditor from "./EntityTemplateEditor.svelte";
  import EntityTemplateRow from "./EntityTemplateRow.svelte";
  import EntityTemplateToolbar from "./EntityTemplateToolbar.svelte";
  import EntityTemplateNotices from "./EntityTemplateNotices.svelte";

  let { store = entityTemplateStore }: { store?: typeof entityTemplateStore } =
    $props();

  type EditorState =
    | { mode: "create"; initial: DraftTemplate }
    | { mode: "edit"; id: string; initial: DraftTemplate };

  let editor = $state<EditorState | null>(null);
  let previewId = $state<string | null>(null);
  let importError = $state("");

  const labelFor = (type: string) =>
    categories.list.find((c) => c.id === type)?.label ??
    type.charAt(0).toUpperCase() + type.slice(1);

  const groups = $derived.by(() => {
    const byType = new Map<string, EntityTemplate[]>();
    for (const t of store.list) {
      const key = t.entityType.toLowerCase();
      byType.set(key, [...(byType.get(key) ?? []), t]);
    }
    const order = categories.list.map((c) => c.id);
    return [...byType.entries()]
      .sort(([a], [b]) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
      })
      .map(([type, templates]) => ({ type, templates }));
  });

  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "template";

  const toDraft = (t: EntityTemplate): DraftTemplate => {
    const parsed =
      t.source === "legacy"
        ? parseMarkdownToSections(t.markdown ?? "")
        : { intro: t.intro, sections: t.sections };
    return {
      name: t.name,
      entityType: t.entityType,
      intro: parsed.intro,
      sections: parsed.sections.map((s) => ({ ...s })),
    };
  };

  // One action at a time: a double click must not duplicate or delete twice.
  let busy = false;

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    try {
      await action();
    } catch (err) {
      // Write failures are already announced by the store.
      if (err instanceof EntityTemplateError) {
        notificationStore.notify(err.message, "error");
      }
    } finally {
      busy = false;
    }
  }

  const setDefault = (t: EntityTemplate) =>
    run(() => store.setDefault(t.entityType, t.id));

  const duplicate = (t: EntityTemplate) => run(() => store.duplicate(t.id));

  function startCreate() {
    editor = {
      mode: "create",
      initial: {
        name: "",
        entityType: categories.list[0]?.id ?? "note",
        sections: [{ id: "s1", title: "" }],
      },
    };
  }

  function startEdit(t: EntityTemplate) {
    editor = { mode: "edit", id: t.id, initial: toDraft(t) };
  }

  async function saveEditor(draft: DraftTemplate) {
    if (!editor) return;
    if (editor.mode === "create") await store.create(draft);
    else await store.update(editor.id, draft);
    editor = null;
  }

  async function remove(t: EntityTemplate) {
    const confirmed = await notificationStore.confirm({
      title: "Delete template",
      message: `Delete "${t.name}"? Notes already made from it are not changed.`,
      confirmLabel: "Delete",
      isDangerous: true,
    });
    if (!confirmed) return;
    await run(() => store.remove(t.id));
  }

  function exportTemplate(t: EntityTemplate) {
    const pkg = store.exportPackage(t.id);
    downloadText(
      JSON.stringify(pkg, null, 2),
      `${slug(t.name)}.template.json`,
      "application/json",
    );
  }

  async function importFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    importError = "";
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      importError = "This file couldn't be read as a template.";
      return;
    }
    try {
      const result = await store.importPackage(raw);
      if (!result.ok) importError = result.error;
    } catch (err) {
      importError =
        err instanceof Error ? err.message : "The template couldn't be added.";
    }
  }
</script>

<section class="space-y-4" data-testid="entity-template-settings">
  {#if editor}
    <EntityTemplateEditor
      title={editor.mode === "create" ? "New template" : "Edit template"}
      initial={editor.initial}
      onSave={saveEditor}
      onCancel={() => (editor = null)}
    />
  {:else}
    <EntityTemplateToolbar
      canEdit={store.canEdit}
      onNew={startCreate}
      onImportFile={importFile}
    />

    <p class="text-sm text-theme-muted leading-relaxed">
      Templates decide which sections a new note starts with. Changing a
      template or its default only affects notes you create afterwards.
    </p>

    <EntityTemplateNotices
      canEdit={store.canEdit}
      warnings={store.warnings}
      {importError}
    />

    {#each groups as group (group.type)}
      {@const effective = store.effectiveDefaultFor(group.type)}
      <div class="space-y-2" data-testid="entity-template-group">
        <h5 class="text-xs font-bold text-theme-text">
          {labelFor(group.type)}
        </h5>
        {#each group.templates as t (t.id)}
          <EntityTemplateRow
            template={t}
            isDefault={effective === t.id}
            canEdit={store.canEdit}
            previewMarkdown={store.previewMarkdown(t.id)}
            previewOpen={previewId === t.id}
            onTogglePreview={() =>
              (previewId = previewId === t.id ? null : t.id)}
            onSetDefault={() => setDefault(t)}
            onDuplicate={() => duplicate(t)}
            onEdit={() => startEdit(t)}
            onExport={() => exportTemplate(t)}
            onDelete={() => remove(t)}
          />
        {/each}
      </div>
    {/each}
  {/if}
</section>
