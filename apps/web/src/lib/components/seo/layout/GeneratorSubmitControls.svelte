<script lang="ts">
  import GeneratorAiToggle from "./GeneratorAiToggle.svelte";

  let {
    isBusy,
    isOnline,
    aiModeRequired,
    showSubmitButton,
    busyLabel = undefined,
    generateLabel = undefined,
    generatedSingular,
    aiDataNotice = undefined,
    useAI = $bindable(true),
  }: {
    isBusy: boolean;
    isOnline: boolean;
    aiModeRequired: boolean;
    showSubmitButton: boolean;
    busyLabel?: string;
    generateLabel?: string;
    generatedSingular: string;
    aiDataNotice?: string;
    useAI?: boolean;
  } = $props();
</script>

{#if aiModeRequired && aiDataNotice}
  <p class="text-micro text-theme-muted leading-relaxed" role="note">
    {aiDataNotice}
  </p>
{/if}

{#if showSubmitButton}
  <button
    type="submit"
    disabled={isBusy || (aiModeRequired && !isOnline)}
    aria-busy={isBusy}
    class="w-full py-3 mt-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    id="generate-button"
    title="Generate a new draft using your current form inputs"
  >
    {#if isBusy}
      <span
        class="icon-[lucide--loader-2] animate-spin w-4 h-4"
        aria-hidden="true"
      ></span>
      {busyLabel ?? "Forging..."}
    {:else}
      {generateLabel ?? `Generate ${generatedSingular}`}
    {/if}
  </button>
{/if}

{#if showSubmitButton && !aiModeRequired}
  <GeneratorAiToggle {isOnline} bind:useAI />
{/if}
