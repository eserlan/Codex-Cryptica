<script lang="ts">
  import { getThemeLoadingMessages } from "generator-engine";
  let {
    themeId,
    currentPhase,
    streamedFields,
    spoilerShield = false,
    oncancel,
  }: {
    themeId: string;
    currentPhase: string | null;
    streamedFields: Record<string, string>;
    spoilerShield?: boolean;
    oncancel: () => void;
  } = $props();
  let loadingIndex = $state(0);
  const loadingMessages = $derived(getThemeLoadingMessages(themeId));
  $effect(() => {
    const interval = setInterval(() => {
      loadingIndex = (loadingIndex + 1) % loadingMessages.length;
    }, 4200);
    return () => clearInterval(interval);
  });
</script>

<div class="py-4">
  <div class="flex items-center gap-3 text-sm text-chrome-muted">
    <span
      class="icon-[lucide--loader-circle] h-4 w-4 animate-spin text-chrome-accent"
    ></span>
    {currentPhase ??
      loadingMessages[loadingIndex] ??
      "Generating your content…"}
  </div>
  {#if streamedFields.title || streamedFields.summary || streamedFields.lore}
    <div
      class="mt-4 space-y-2 rounded-lg border border-chrome-border bg-chrome-bg/40 p-3"
      data-testid="generator-stream-preview"
    >
      {#if streamedFields.title}
        <p class="text-sm font-bold text-chrome-text">
          {streamedFields.title}
        </p>
      {/if}
      {#if streamedFields.summary}
        <p class="text-xs italic text-chrome-muted">
          {streamedFields.summary}
        </p>
      {/if}
      {#if streamedFields.lore && !spoilerShield}
        <!-- fallow-ignore-next-line css-broken-reference -->
        <p
          class="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-chrome-muted"
        >
          {streamedFields.lore}
        </p>
      {/if}
    </div>
  {/if}
  <button
    type="button"
    class="mt-4 px-3 py-1.5 border border-chrome-border rounded-lg text-xs font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text hover:border-chrome-accent transition-colors"
    onclick={oncancel}
  >
    Cancel
  </button>
</div>
