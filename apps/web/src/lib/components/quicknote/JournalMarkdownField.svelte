<script lang="ts">
  import MarkdownFormatToolbar from "$lib/components/editor/MarkdownFormatToolbar.svelte";
  import { createMarkdownEditingController } from "$lib/utils/markdown-editing";
  import { renderMarkdown } from "$lib/utils/markdown";

  /**
   * A note's text field, shared by the composer (#3402) and the entry edit
   * form (#3476): the basic Markdown toolbar (#3481) plus a live rendered
   * preview underneath. Without it, `**bold**` only ever looked like literal
   * asterisks while typing, and only turned into bold text once the entry
   * was already saved and shown in the list (#3490) — the preview shows the
   * same rendering the saved entry will get, before you commit to it.
   */
  let {
    value,
    onValueChange,
    ariaLabel,
    placeholder,
    rows = 2,
    toolbarLabel,
    testIdPrefix,
    onSubmitShortcut,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    ariaLabel: string;
    placeholder?: string;
    rows?: number;
    toolbarLabel: string;
    /** Test ids are `${testIdPrefix}-input` and `${testIdPrefix}-preview`. */
    testIdPrefix: string;
    onSubmitShortcut?: () => void;
  } = $props();

  let textarea = $state<HTMLTextAreaElement | undefined>(undefined);

  const editing = createMarkdownEditingController({
    getTextarea: () => textarea,
    getText: () => value,
    setText: (text) => onValueChange(text),
    onSubmitShortcut: () => onSubmitShortcut?.(),
  });

  // Blank or whitespace-only text has nothing worth previewing, and would
  // otherwise render as an empty box beneath the field.
  const preview = $derived(
    value.trim() ? renderMarkdown(value, { breaks: true }) : undefined,
  );
</script>

<div class="flex flex-col gap-1.5">
  <MarkdownFormatToolbar
    label={toolbarLabel}
    onBold={editing.bold}
    onItalic={editing.italic}
    onBullet={editing.bullet}
  />
  <textarea
    bind:this={textarea}
    {value}
    oninput={(e) => onValueChange(e.currentTarget.value)}
    onkeydown={editing.handleKeydown}
    aria-label={ariaLabel}
    {placeholder}
    {rows}
    class="w-full resize-y rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
    data-testid={`${testIdPrefix}-input`}
  ></textarea>
  {#if preview}
    <div
      class="prose prose-sm max-w-none rounded border border-theme-border/30 bg-theme-bg/40 px-2 py-1 text-theme-text prose-p:my-1 prose-p:text-theme-text prose-strong:text-theme-text prose-em:text-theme-text prose-ul:my-1 prose-li:my-0 prose-li:text-theme-text prose-li:marker:text-theme-muted"
      data-testid={`${testIdPrefix}-preview`}
    >
      {@html preview}
    </div>
  {/if}
</div>
