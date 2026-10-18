<script lang="ts">
  import { STAT_BLOCK_SOURCE_LIMIT } from "@codex/stat-sheet-engine";
  import type { StatBlockImportController } from "./stat-block-import-controller.svelte";

  let {
    controller,
    onCancel,
  }: { controller: StatBlockImportController; onCancel: () => void } = $props();

  const sourceLength = $derived(controller.source.length);
</script>

<div class="flex flex-col gap-3" data-testid="stat-block-step-paste">
  <label class="flex flex-col gap-1 text-sm">
    <span class="text-micro font-bold uppercase tracking-wide text-theme-muted"
      >Paste the stat block</span
    >
    <textarea
      class="min-h-40 rounded border border-theme-border bg-transparent p-2 font-mono text-sm"
      value={controller.source}
      oninput={(e) =>
        controller.setSource((e.currentTarget as HTMLTextAreaElement).value)}
      disabled={controller.step === "reading"}
      data-testid="stat-block-source-input"
    ></textarea>
  </label>
  <p class="text-micro text-theme-muted" data-testid="stat-block-counter">
    {sourceLength} / {STAT_BLOCK_SOURCE_LIMIT} characters
  </p>

  {#if controller.aiAvailable}
    <fieldset class="flex flex-col gap-1 text-sm">
      <legend
        class="text-micro font-bold uppercase tracking-wide text-theme-muted"
        >Reading mode</legend
      >
      <label class="flex items-center gap-2">
        <input
          type="radio"
          name="sb-mode"
          checked={controller.mode === "copy"}
          onchange={() => controller.setMode("copy")}
        />
        Copy as written
      </label>
      <label class="flex items-center gap-2">
        <input
          type="radio"
          name="sb-mode"
          checked={controller.mode === "convert-5e"}
          onchange={() => controller.setMode("convert-5e")}
        />
        Convert from 5e
      </label>
    </fieldset>
  {/if}

  <p class="text-micro text-theme-muted" data-testid="stat-block-privacy">
    Your pasted text is sent to the AI to read the stat block. It isn't kept.
  </p>

  {#if controller.error}
    <p
      class="text-sm text-theme-danger"
      role="alert"
      data-testid="stat-block-error"
    >
      {controller.error}
    </p>
  {/if}

  <div class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      class="rounded border border-theme-primary px-3 py-1.5 text-micro font-bold uppercase tracking-wide text-theme-primary disabled:opacity-50"
      onclick={() => void controller.read()}
      disabled={controller.step === "reading"}
      data-testid="stat-block-read"
    >
      {controller.step === "reading" ? "Reading…" : "Read stat block"}
    </button>
    {#if controller.canRetry}
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-wide"
        onclick={() => void controller.retry()}
        data-testid="stat-block-retry">Retry</button
      >
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1.5 text-micro font-bold uppercase tracking-wide"
        onclick={() => void controller.useQuickReader()}
        data-testid="stat-block-quick-reader">Use quick reader</button
      >
    {/if}
    <button
      type="button"
      class="ml-auto text-micro font-bold uppercase tracking-wide text-theme-muted hover:text-theme-primary"
      onclick={onCancel}>Cancel</button
    >
  </div>
</div>
