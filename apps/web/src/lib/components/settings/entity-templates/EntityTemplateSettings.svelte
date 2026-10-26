<script lang="ts">
  import type { DraftTemplate, EntityTemplate } from "entity-template-engine";
  import { categories } from "$lib/stores/categories.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import {
    entityTemplateStore,
    EntityTemplateError,
  } from "$lib/stores/entity-templates/entity-template-store.svelte";
  import { downloadText } from "$lib/utils/download";
  import { onMount } from "svelte";
  import { EntityTemplateDirectoryError } from "$lib/services/publishing/PublicEntityTemplateDirectoryService";
  import {
    entityTemplatePublishStore,
    type PublishMetadata,
  } from "$lib/stores/entity-templates/entity-template-publish-store.svelte";
  import EntityTemplatePublishModal from "$lib/components/community-templates/EntityTemplatePublishModal.svelte";
  import EntityTemplateEditor from "./EntityTemplateEditor.svelte";
  import EntityTemplateRow from "./EntityTemplateRow.svelte";
  import EntityTemplateToolbar from "./EntityTemplateToolbar.svelte";
  import EntityTemplateNotices from "./EntityTemplateNotices.svelte";

  let {
    store = entityTemplateStore,
    publishStore = entityTemplatePublishStore,
  }: {
    store?: typeof entityTemplateStore;
    publishStore?: typeof entityTemplatePublishStore;
  } = $props();

  let sharing = $state<{
    template: EntityTemplate;
    mode: "publish" | "update";
    initial?: PublishMetadata;
  } | null>(null);

  onMount(() => void publishStore.loadLinks());

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

  const toDraft = (t: EntityTemplate): DraftTemplate => ({
    name: t.name,
    entityType: t.entityType,
    markdown: t.markdown,
  });

  // One action at a time: a double click must not duplicate or delete twice.
  let busy = false;

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    try {
      await action();
    } catch (err) {
      // Write failures are already announced by the store.
      if (
        err instanceof EntityTemplateError ||
        err instanceof EntityTemplateDirectoryError
      ) {
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
        markdown: "",
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

  function startPublish(t: EntityTemplate) {
    if (t.source !== "user") {
      notificationStore.notify(
        "Duplicate this template first, then publish your copy.",
        "info",
      );
      return;
    }
    sharing = { template: t, mode: "publish" };
  }

  const startUpdateListing = (t: EntityTemplate) =>
    run(async () => {
      const initial = await publishStore.loadOwnerMeta(t.id);
      sharing = { template: t, mode: "update", initial };
    });

  async function unpublish(t: EntityTemplate) {
    const confirmed = await notificationStore.confirm({
      title: "Unpublish template",
      message: `Unpublish "${t.name}"? It disappears from the directory, but you keep your own copy and can republish it later.`,
      confirmLabel: "Unpublish",
    });
    if (confirmed) await run(() => publishStore.unpublish(t.id));
  }

  const republish = (t: EntityTemplate) =>
    run(async () => {
      const meta = await publishStore.loadOwnerMeta(t.id);
      await publishStore.update(t.id, meta);
    });

  async function deleteListing(t: EntityTemplate) {
    const confirmed = await notificationStore.confirm({
      title: "Delete listing permanently",
      message: `Delete the public listing for "${t.name}" permanently? It and its text are removed from the directory and this can't be undone. Your own template is not changed.`,
      confirmLabel: "Delete permanently",
      isDangerous: true,
    });
    if (confirmed) await run(() => publishStore.remove(t.id));
  }

  async function remove(t: EntityTemplate) {
    const published = publishStore.linkFor(t.id);
    const confirmed = await notificationStore.confirm({
      title: "Delete template",
      message: published
        ? `Delete "${t.name}"? Notes already made from it are not changed. Its public listing stays in the directory until you unpublish or delete it.`
        : `Delete "${t.name}"? Notes already made from it are not changed.`,
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
      Changing a template or its default only affects notes you create
      afterwards.
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
            publishState={publishStore.publishState(t)}
            onPublish={() => startPublish(t)}
            onUpdateListing={() => startUpdateListing(t)}
            onUnpublish={() => unpublish(t)}
            onRepublish={() => republish(t)}
            onDeleteListing={() => deleteListing(t)}
          />
        {/each}
      </div>
    {/each}
  {/if}
</section>

{#if sharing}
  <EntityTemplatePublishModal
    template={sharing.template}
    mode={sharing.mode}
    initial={sharing.initial}
    store={publishStore}
    onClose={() => (sharing = null)}
  />
{/if}
