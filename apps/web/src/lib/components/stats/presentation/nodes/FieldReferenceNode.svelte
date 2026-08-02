<script lang="ts">
  import type { FieldReferenceNode as FieldReferenceNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import MissingFieldNode from "./MissingFieldNode.svelte";

  let {
    node,
    context,
  }: { node: FieldReferenceNodeType; context: PresentationRenderContext } =
    $props();

  const field = $derived(context.fields.find((f) => f.id === node.fieldId));
  const label = $derived(node.label ?? field?.label ?? node.fieldId);
  const mode = $derived(node.displayMode ?? "plain");
  const isProminent = $derived(mode === "prominent");
  const controlsDisabled = $derived(
    context.readOnly || context.mode === "preview",
  );
</script>

{#if !field}
  <MissingFieldNode
    node={{ type: "missing-field", fieldId: node.fieldId, label: node.label }}
  />
{:else if mode === "counter" || mode === "current-max" || mode === "progress"}
  <div
    class="inline-flex items-center gap-2 rounded border border-theme-border px-2 py-1"
    data-testid="presentation-field-counter"
  >
    <span class="text-xs text-theme-text">{label}</span>
    {#if !context.readOnly && context.mode === "view"}
      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={() => context.onAdjustCounter(field, -1)}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
    {/if}
    <span class="text-xs font-bold text-theme-text">
      {field.value ?? 0}{#if mode === "current-max" && field.max !== undefined}
        / {field.max}{/if}
    </span>
    {#if !context.readOnly && context.mode === "view"}
      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={() => context.onAdjustCounter(field, 1)}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    {/if}
  </div>
{:else if mode === "checkbox"}
  <label class="inline-flex items-center gap-1.5 text-xs text-theme-text">
    <input
      type="checkbox"
      checked={!!field.value}
      disabled={context.readOnly || context.mode === "preview"}
      onchange={(e) =>
        context.onUpdateFieldValue(
          field.id,
          (e.target as HTMLInputElement).checked,
        )}
    />
    {label}
  </label>
{:else if mode === "tag-list"}
  <span
    class="inline-flex flex-wrap gap-1"
    data-testid="presentation-field-tag-list"
  >
    {#each String(field.value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as tag (tag)}
      <span
        class="rounded-full border border-theme-border px-2 py-0.5 text-[10px] text-theme-muted"
      >
        {tag}
      </span>
    {/each}
  </span>
{:else if field.type === "longtext"}
  <div class="flex flex-col gap-1" data-testid="presentation-field-notes">
    <span class="text-xs font-bold text-theme-text">{label}</span>
    <textarea
      class="w-full resize-y rounded border border-theme-border bg-theme-bg px-1.5 py-1 text-xs text-theme-text disabled:opacity-40"
      rows="3"
      disabled={controlsDisabled}
      value={typeof field.value === "string" ? field.value : ""}
      oninput={(e) =>
        context.onUpdateFieldValue(
          field.id,
          (e.target as HTMLTextAreaElement).value,
        )}
    ></textarea>
  </div>
{:else if field.type === "number"}
  <label
    class="inline-flex items-center gap-2"
    data-testid="presentation-field-number"
  >
    <span
      class={isProminent
        ? "text-lg font-bold text-theme-primary"
        : "text-xs text-theme-muted"}
    >
      {label}:
    </span>
    <input
      type="number"
      class="w-20 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-right text-xs text-theme-text disabled:opacity-40"
      value={typeof field.value === "number" ? field.value : ""}
      disabled={controlsDisabled}
      oninput={(e) =>
        context.onUpdateFieldValue(
          field.id,
          Number((e.target as HTMLInputElement).value) || 0,
        )}
    />
  </label>
{:else if field.type === "text"}
  <label
    class="inline-flex items-center gap-2"
    data-testid="presentation-field-text"
  >
    <span
      class={isProminent
        ? "text-lg font-bold text-theme-primary"
        : "text-xs text-theme-muted"}
    >
      {label}:
    </span>
    <input
      type="text"
      class="w-40 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text disabled:opacity-40"
      value={typeof field.value === "string" ? field.value : ""}
      disabled={controlsDisabled}
      oninput={(e) =>
        context.onUpdateFieldValue(
          field.id,
          (e.target as HTMLInputElement).value,
        )}
    />
  </label>
{:else}
  <span
    class={isProminent
      ? "text-lg font-bold text-theme-primary"
      : "text-xs text-theme-text"}
    data-testid="presentation-field-plain"
  >
    {#if !isProminent}<span class="text-theme-muted">{label}:</span>{/if}
    {field.value ?? ""}
  </span>
{/if}
