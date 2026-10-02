<script lang="ts">
  import { renderMarkdown } from "$lib/utils/markdown";
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

  const answerHtml = $derived(
    message.role === "assistant"
      ? renderMarkdown(message.text, { breaks: true })
      : "",
  );

  // Closest topics after a no-match, or this screen's static help after a failure.
  const topics = $derived(
    message.fallback?.topics ?? message.answer?.suggestions ?? [],
  );
</script>

{#if message.role === "user"}
  <p
    class="ml-8 self-end rounded bg-chrome-accent/15 px-3 py-2 text-xs text-chrome-text"
  >
    {message.text}
  </p>
{:else}
  <div
    class="mr-4 flex flex-col gap-2 rounded border border-chrome-border/60 bg-chrome-surface/60 px-3 py-2"
    data-testid="help-assistant-answer"
  >
    <div
      class="text-xs leading-relaxed text-chrome-text [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_ul]:my-3 [&_ol]:my-3 [&_ul]:space-y-2 [&_ol]:space-y-2 [&_li::marker]:text-chrome-accent [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:pl-1 [&_a]:text-chrome-accent [&_a]:underline [&_code]:rounded [&_code]:bg-chrome-accent/10 [&_code]:px-1 [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-chrome-border [&_blockquote]:pl-2 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold"
    >
      {@html answerHtml}
    </div>

    {#if message.staleScreen}
      <p class="text-[10px] italic text-chrome-muted">
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
        class="self-start text-xs text-chrome-accent underline hover:opacity-80 focus-visible:outline-2 focus-visible:outline-chrome-accent"
      >
        Open the help library
      </button>
    {/if}
  </div>
{/if}
