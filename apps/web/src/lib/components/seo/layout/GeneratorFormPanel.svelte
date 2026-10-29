<script lang="ts">
  import type { Snippet } from "svelte";
  import { basePath } from "#lib/utils/base-path.js";
  import GeneratorIntroPanel from "../GeneratorIntroPanel.svelte";
  import GeneratorOfflineNotice from "./GeneratorOfflineNotice.svelte";
  import GeneratorSubmitControls from "./GeneratorSubmitControls.svelte";

  const cleanBase = basePath();

  let {
    canonicalPath,
    eyebrow,
    showGeneratorSwitcher,
    introTitle,
    introText,
    labels,
    inputHint,
    backHref,
    backLabel,
    formFields,
    onGenerate,
    isBusy,
    isOnline,
    aiModeRequired,
    aiDataNotice,
    aiToggleScope,
    offlineMessage,
    showSubmitButton,
    busyLabel,
    generateLabel,
    generatedSingular,
    useAI = $bindable(true),
    errorMessage,
    copyError,
  }: {
    canonicalPath?: string;
    eyebrow: string;
    showGeneratorSwitcher: boolean;
    introTitle: string;
    introText: string;
    labels: string[];
    inputHint: string;
    backHref?: string;
    backLabel?: string;
    formFields: Snippet<[() => void]>;
    onGenerate: () => void;
    isBusy: boolean;
    isOnline: boolean;
    aiModeRequired: boolean;
    aiDataNotice?: string;
    aiToggleScope?: string;
    offlineMessage?: string;
    showSubmitButton: boolean;
    busyLabel?: string;
    generateLabel?: string;
    generatedSingular: string;
    useAI?: boolean;
    errorMessage: string | null;
    copyError: boolean;
  } = $props();
</script>

<div
  class="p-6 bg-theme-surface/40 border border-theme-border/60 rounded-2xl shadow-sm"
>
  <GeneratorIntroPanel
    {canonicalPath}
    {eyebrow}
    {showGeneratorSwitcher}
    {introTitle}
    {introText}
    {labels}
    {inputHint}
    {backHref}
    {backLabel}
  />

  <GeneratorOfflineNotice {isOnline} {aiModeRequired} {offlineMessage} />

  <form
    class="generator-form space-y-4"
    action={canonicalPath ? `${cleanBase}${canonicalPath}` : undefined}
    method={canonicalPath ? "GET" : undefined}
    onsubmit={(event) => {
      event.preventDefault();
      if (showSubmitButton) onGenerate();
    }}
  >
    {@render formFields(onGenerate)}
    <GeneratorSubmitControls
      {isBusy}
      {isOnline}
      {aiModeRequired}
      {showSubmitButton}
      {busyLabel}
      {generateLabel}
      {generatedSingular}
      {aiDataNotice}
      {aiToggleScope}
      bind:useAI
    />
  </form>

  {#if errorMessage}
    <div
      class="mt-4 p-3 border border-red-500/30 bg-red-500/10 rounded-xl text-red-400 text-xs"
    >
      {errorMessage}
    </div>
  {/if}
  {#if copyError}
    <div
      class="mt-4 text-xs text-theme-danger"
      role="status"
      aria-live="polite"
    >
      Could not copy
    </div>
  {/if}

  <!-- Related links moved to bottom discover section -->
</div>

<style>
  /* Generator-specific fields are supplied as snippets; keep their typography
     consistent here even when a field component uses compact utility classes. */
  .generator-form :global(input:not([type="checkbox"]):not([type="radio"])),
  .generator-form :global(select),
  .generator-form :global(textarea) {
    font-size: 1rem;
  }

  .generator-form :global(label),
  .generator-form :global(summary),
  .generator-form :global(button),
  .generator-form :global(p) {
    font-size: 0.875rem;
    line-height: 1.5;
  }
</style>
