<script lang="ts">
  import type { HelpMessage } from "$lib/stores/help-assistant/help-assistant.svelte";
  import HelpSourceChips from "./HelpSourceChips.svelte";
  import HelpTopicList from "./HelpTopicList.svelte";

  let {
    message,
    onOpenArticle,
    onOpenLibrary,
  }: {
    message: HelpMessage;
    onOpenArticle: (helpId: string) => void;
    onOpenLibrary: () => void;
  } = $props();

  // Closest topics after a no-match, or this screen's static help after a failure.
  const topics = $derived(
    message.fallback?.topics ?? message.answer?.suggestions ?? [],
  );
</script>

{#if message.role === "user"}
  <p
    class="ml-8 self-end rounded bg-theme-primary/15 px-3 py-2 text-body-ui text-theme-text"
  >
    {message.text}
  </p>
{:else}
  <div
    class="mr-4 flex flex-col gap-2 rounded border border-theme-border/60 bg-theme-surface/60 px-3 py-2"
    data-testid="help-assistant-answer"
  >
    <p class="whitespace-pre-line text-body-ui leading-relaxed text-theme-text">
      {message.text}
    </p>

    {#if message.staleScreen}
      <p class="text-meta italic text-theme-muted">
        This answer is for the screen you were on when you asked.
      </p>
    {/if}

    {#if message.answer?.sources?.length}
      <HelpSourceChips sources={message.answer.sources} {onOpenArticle} />
    {/if}

    {#if topics.length > 0}
      <HelpTopicList {topics} {onOpenArticle} />
    {/if}

    {#if message.fallback?.showLibrary}
      <button
        type="button"
        onclick={onOpenLibrary}
        class="self-start text-body-ui text-theme-primary underline hover:text-theme-secondary focus-visible:outline-2 focus-visible:outline-theme-primary"
      >
        Open the help library
      </button>
    {/if}
  </div>
{/if}
