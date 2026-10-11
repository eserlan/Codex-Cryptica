<script lang="ts">
  import type { Snippet } from "svelte";
  import { base } from "$app/paths";
  import GeneratorIntroPanel from "../GeneratorIntroPanel.svelte";
  import GeneratorOfflineNotice from "./GeneratorOfflineNotice.svelte";
  import GeneratorSubmitControls from "./GeneratorSubmitControls.svelte";

  const cleanBase = base === "/" ? "" : base;

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
    class="space-y-4"
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
