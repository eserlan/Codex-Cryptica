<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions keep review notes on inherited colours. */
  import type { Entity } from "schema";
  import { untrack } from "svelte";
  import { StatSheetEditorState } from "./StatSheetEditorState.svelte.js";
  import { StatSheetFieldOrder } from "./StatSheetFieldOrder.svelte.js";
  import StatSheetFieldEditor from "./StatSheetFieldEditor.svelte";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import {
    type IdGenerator,
    systemIdGenerator,
  } from "#lib/utils/runtime-deps.js";

  let {
    entity,
    onClose = () => {},
    idGenerator = systemIdGenerator,
  }: {
    entity: Entity;
    onClose?: () => void;
    idGenerator?: IdGenerator;
  } = $props();

  const editor = untrack(
    () =>
      new StatSheetEditorState(
        () => entity,
        { uuid: () => idGenerator.uuid() },
        vault,
        notificationStore,
      ),
  );
  const order = new StatSheetFieldOrder(() => editor.fields, editor.persist);
  $effect(() => {
    editor.fields = $state.snapshot(entity.statSheet?.fields ?? []);
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flex flex-col gap-3 outline-none"
  tabindex="0"
  onkeydown={order.handleContainerKeyDown}
  data-testid="stat-sheet-editor"
>
  {#each editor.fields as field, index (field.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col gap-2 rounded border p-2 transition-colors {order.draggedIndex ===
      index
        ? 'opacity-40 border-dashed border-theme-primary'
        : order.dragOverIndex === index
          ? 'border-theme-primary bg-theme-primary/10 ring-1 ring-theme-primary'
          : order.selectedFieldId === field.id
            ? 'border-theme-primary bg-theme-primary/10 ring-2 ring-theme-primary/40'
            : 'border-theme-border'}"
      draggable="true"
      ondragstart={(e) => order.handleDragStart(e, index)}
      ondragover={(e) => order.handleDragOver(e, index)}
      ondragleave={() => (order.dragOverIndex = null)}
      ondrop={(e) => order.handleDrop(e, index)}
      ondragend={order.handleDragEnd}
      onkeydown={(e) => order.handleFieldKeyDown(e, index)}
      onfocusin={() => (order.selectedFieldId = field.id)}
      onclick={() => (order.selectedFieldId = field.id)}
      data-field-id={field.id}
      data-selected={order.selectedFieldId === field.id ? "true" : "false"}
      aria-selected={order.selectedFieldId === field.id}
      data-testid="stat-sheet-editor-field"
    >
      <StatSheetFieldEditor
        {field}
        {index}
        {editor}
        {idGenerator}
        fieldCount={editor.fields.length}
        onMove={(direction) => order.moveField(index, direction)}
      />
    </div>
  {/each}

  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
        "rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"}
        onclick={editor.addField}
        data-testid="stat-sheet-editor-add"
      >
        + Add Field
      </button>
      {#if editor.fields.length > 0}
        <button
          type="button"
          class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
          "rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-red-500 hover:text-red-500"}
          onclick={editor.clearAllFields}
          data-testid="stat-sheet-editor-clear-all"
        >
          Clear All
        </button>
      {/if}
    </div>
    <button
      type="button"
      class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
      "rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"}
      onclick={onClose}
      data-testid="stat-sheet-editor-close"
    >
      Done
    </button>
  </div>
</div>
