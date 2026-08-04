<script lang="ts">
  import { NodeResizer, type NodeProps } from "@xyflow/svelte";
  import type { ResizeParams } from "@xyflow/system";
  import { vault } from "$lib/stores/vault.svelte";
  import {
    DEFAULT_CANVAS_TEXT_BACKGROUND,
    DEFAULT_CANVAS_TEXT_FONT_SIZE,
    normalizeCanvasTextBackground,
    normalizeCanvasTextFontSize,
  } from "@codex/canvas-engine";
  import { canvasTextBackgroundStyle } from "./canvas-workspace-helpers";

  let { data, selected, width, height }: NodeProps = $props();

  const text = $derived((data?.text as string) ?? "");
  const locked = $derived(Boolean(data?.locked));
  const canEdit = $derived(!locked && !vault.isGuest);
  const backgroundKey = $derived(
    normalizeCanvasTextBackground(
      (data?.background as string) ?? "",
      DEFAULT_CANVAS_TEXT_BACKGROUND,
    ),
  );
  const backgroundColor = $derived(canvasTextBackgroundStyle(backgroundKey));
  const isTransparent = $derived(backgroundKey === "transparent");
  const fontSize = $derived(
    normalizeCanvasTextFontSize(
      data?.fontSize as number,
      DEFAULT_CANVAS_TEXT_FONT_SIZE,
    ),
  );

  let textareaEl = $state<HTMLTextAreaElement>();

  $effect(() => {
    if (textareaEl && text === "") textareaEl.focus();
  });

  function updateText(value: string) {
    (
      data as { onUpdateText?: (updates: Record<string, unknown>) => void }
    )?.onUpdateText?.({ text: value });
  }

  function handleResizeEnd(_event: unknown, params: ResizeParams) {
    (
      data as { onUpdateText?: (updates: Record<string, unknown>) => void }
    )?.onUpdateText?.({ width: params.width, height: params.height });
  }
</script>

<div
  class="relative h-full w-full min-h-[80px] min-w-[140px] rounded-lg border p-3 {isTransparent
    ? ''
    : 'shadow-lg'} {selected
    ? 'border-theme-primary ring-2 ring-theme-primary/40'
    : isTransparent
      ? 'border-theme-border/40 border-dashed'
      : 'border-theme-border'}"
  style:width={typeof width === "number" ? `${width}px` : "200px"}
  style:height={typeof height === "number" ? `${height}px` : "120px"}
  style:background-color={backgroundColor}
>
  {#if selected && !locked}
    <NodeResizer minWidth={140} minHeight={80} onResizeEnd={handleResizeEnd} />
  {/if}
  <textarea
    bind:this={textareaEl}
    class="nodrag nowheel h-full w-full resize-none bg-transparent text-theme-text placeholder:text-theme-muted focus:outline-none"
    style:font-size="{fontSize}px"
    placeholder="Type a note…"
    readonly={!canEdit}
    aria-label="Canvas text note"
    value={text}
    oninput={(event) =>
      updateText((event.currentTarget as HTMLTextAreaElement).value)}
  ></textarea>
</div>
