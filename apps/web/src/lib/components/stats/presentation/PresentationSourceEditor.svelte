<script lang="ts">
  import type { StatSheetTemplate } from "schema";
  import { generateStarterLayout } from "./editor-source";
  import type { PresentationDiagnostics } from "./editor-preview.svelte";
  import PresentationVisualBuilder from "./PresentationVisualBuilder.svelte";
  import PresentationCodeTools from "./PresentationCodeTools.svelte";
  let {
    schema,
    source = $bindable(),
    diagnostics,
  }: {
    schema: StatSheetTemplate;
    source: string;
    diagnostics: PresentationDiagnostics;
  } = $props();
  let editorMode = $state<"visual" | "code">("visual");
  let textareaEl: HTMLTextAreaElement | undefined = $state();
  let visualBuilder: PresentationVisualBuilder;

  function showVisualBuilder() {
    if (editorMode === "visual") return;
    visualBuilder.resetFromSource();
    editorMode = "visual";
  }
  function insertSnippet(snippet: string, cursorOffset?: number) {
    const el = textareaEl;
    if (!el) {
      source = source + snippet;
    } else {
      const start = el.selectionStart ?? source.length;
      const end = el.selectionEnd ?? source.length;
      source = source.slice(0, start) + snippet + source.slice(end);
      const nextPos = start + (cursorOffset ?? snippet.length);
      queueMicrotask(() => {
        el.focus();
        el.setSelectionRange(nextPos, nextPos);
      });
    }
  }
</script>

<div class="flex flex-1 min-h-0 flex-col gap-1.5">
  <div class="flex flex-wrap items-center justify-between gap-1.5">
    <div class="flex items-center gap-1">
      <button
        type="button"
        class={editorMode === "visual"
          ? "rounded bg-theme-primary px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-theme-bg"
          : "rounded border border-theme-border px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"}
        onclick={showVisualBuilder}
        data-testid="presentation-editor-tab-visual"
      >
        Visual Builder
      </button>
      <button
        type="button"
        class={editorMode === "code"
          ? "rounded bg-theme-primary px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-theme-bg"
          : "rounded border border-theme-border px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"}
        onclick={() => (editorMode = "code")}
        data-testid="presentation-editor-tab-code"
      >
        Markdown Code
      </button>
    </div>
    <PresentationCodeTools
      {schema}
      active={editorMode === "code"}
      onInsert={insertSnippet}
      onGenerate={() => (source = generateStarterLayout(schema))}
    />
  </div>

  <PresentationVisualBuilder
    {schema}
    bind:source
    active={editorMode === "visual"}
    bind:this={visualBuilder}
  />
  <textarea
    bind:this={textareaEl}
    bind:value={source}
    oninput={() => {
      source = source;
    }}
    rows="14"
    class={editorMode === "code"
      ? "w-full flex-1 resize-none rounded border border-theme-border bg-theme-bg p-2 font-mono text-xs text-theme-text"
      : "hidden"}
    placeholder={`# Heading\n\n:::stat-group columns=2\n{{stat.hp display="current-max"}}\n:::`}
    data-testid="presentation-editor-source"
  ></textarea>

  {#if diagnostics.missing.length > 0 || diagnostics.unknown.length > 0 || diagnostics.mismatched.length > 0}
    <ul
      class="flex flex-col gap-1"
      data-testid="presentation-editor-diagnostics"
    >
      {#each diagnostics.missing as m, i (i)}
        <li
          class="rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-meta text-amber-600 dark:text-amber-400"
        >
          This refers to a field ("{m.fieldId}") that doesn't exist on the
          schema.
        </li>
      {/each}
      {#each diagnostics.unknown as u, i (i)}
        <li
          class="rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-meta text-amber-600 dark:text-amber-400"
        >
          Unsupported layout section: "{u.name}"
        </li>
      {/each}
      {#each diagnostics.mismatched as f, i (i)}
        <li
          class="rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1 text-meta text-amber-600 dark:text-amber-400"
        >
          "{f.requestedDisplayMode}" isn't a supported display for "{f.fieldId}"
          — showing "{f.displayMode}" instead.
        </li>
      {/each}
    </ul>
  {/if}
</div>
