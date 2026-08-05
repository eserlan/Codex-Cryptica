<script lang="ts">
  import type { FieldReferenceNode as FieldReferenceNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import MissingFieldNode from "./MissingFieldNode.svelte";
  import ItemTableNode from "./ItemTableNode.svelte";

  import { rollStatSheetDiceField } from "$lib/utils/stat-sheet-field-actions";

  let {
    node,
    context,
  }: { node: FieldReferenceNodeType; context: PresentationRenderContext } =
    $props();

  let rollState = $state<{
    rolling: boolean;
    text: string | null;
    isError?: boolean;
    success?: boolean;
  }>({
    rolling: false,
    text: null,
  });

  async function handleRoll() {
    if (!field || field.type !== "dice" || rollState.rolling) return;
    rollState.rolling = true;
    const res = await rollStatSheetDiceField(field);
    rollState = {
      rolling: false,
      text: res.text,
      isError: res.isError,
      success: res.success,
    };
  }

  // Falls back to a label match when the id lookup misses. Entities whose
  // stat sheet was applied before templates preserved their canonical field
  // ids (e.g. "hp"/"ac") have fields under randomly generated ids instead —
  // the label is the only thing still tying them back to this reference.
  const field = $derived(
    context.fields.find((f) => f.id === node.fieldId) ??
      (node.label
        ? context.fields.find(
            (f) => f.label.toLowerCase() === node.label!.toLowerCase(),
          )
        : undefined),
  );
  const label = $derived(
    node.hideLabel
      ? ""
      : node.label !== undefined
        ? node.label
        : (field?.label ?? node.fieldId),
  );
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
{:else if field.type === "item-table"}
  <ItemTableNode {field} {context} />
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
    {#if label}
      <span
        class={isProminent
          ? "w-14 shrink-0 text-lg font-bold text-theme-primary"
          : "w-14 shrink-0 text-xs text-theme-muted"}
      >
        {label}
      </span>
    {/if}
    <input
      type="number"
      class={isProminent
        ? "w-16 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-center text-sm font-bold text-theme-primary disabled:opacity-40"
        : "w-16 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-center text-xs text-theme-text disabled:opacity-40"}
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
    {#if label}
      <span
        class={isProminent
          ? "w-14 shrink-0 text-lg font-bold text-theme-primary"
          : "w-14 shrink-0 text-xs text-theme-muted"}
      >
        {label}
      </span>
    {/if}
    <input
      type="text"
      class="w-36 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text disabled:opacity-40"
      value={typeof field.value === "string" ? field.value : ""}
      disabled={controlsDisabled}
      oninput={(e) =>
        context.onUpdateFieldValue(
          field.id,
          (e.target as HTMLInputElement).value,
        )}
    />
  </label>
{:else if field.type === "dice"}
  {#if context.mode === "view"}
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded border border-theme-border bg-theme-bg/50 px-2 py-0.5 text-xs text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary disabled:opacity-50"
      disabled={rollState.rolling}
      onclick={handleRoll}
      data-testid="presentation-field-dice-roll"
    >
      <span
        class="icon-[lucide--dice-5] h-3.5 w-3.5 text-theme-primary"
        aria-hidden="true"
      ></span>
      {#if label}<span class="font-medium">{label}</span>{/if}
      <span class="rounded bg-theme-bg px-1 py-0.5 font-mono text-[11px]">
        {field.formula ?? "1d20"}
      </span>
      {#if rollState.text}
        <span
          class={rollState.isError
            ? "text-red-400 font-bold"
            : rollState.success === true
              ? "text-green-400 font-bold"
              : rollState.success === false
                ? "text-red-400 font-bold"
                : "text-theme-primary font-bold"}
        >
          {rollState.text}
        </span>
      {/if}
    </button>
  {:else}
    <span
      class="inline-flex items-center gap-1.5 text-xs text-theme-text opacity-75"
      data-testid="presentation-field-dice-preview"
    >
      <span
        class="icon-[lucide--dice-5] h-3.5 w-3.5 text-theme-muted"
        aria-hidden="true"
      ></span>
      {#if label}<span class="font-medium">{label}</span>{/if}
      <span class="rounded bg-theme-bg px-1 py-0.5 font-mono text-[11px]">
        {field.formula ?? "1d20"}
      </span>
    </span>
  {/if}
{:else}
  <span
    class={isProminent
      ? "text-lg font-bold text-theme-primary"
      : "text-xs text-theme-text"}
    data-testid="presentation-field-plain"
  >
    {#if !isProminent && label}<span class="text-theme-muted">{label}</span
      >{/if}
    {field.value ?? ""}
  </span>
{/if}
