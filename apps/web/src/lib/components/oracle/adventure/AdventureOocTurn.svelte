<script lang="ts">
  import type { AdventureOocExchange } from "@codex/adventure-engine";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";

  let {
    exchange,
    manager,
  }: {
    exchange: AdventureOocExchange;
    manager: AdventureManager;
  } = $props();

  let canRetry = $derived(
    exchange.status === "failed" &&
      !manager.readOnly &&
      manager.phase !== "generating" &&
      !manager.oocGenerating,
  );
</script>

<article
  class="space-y-3 rounded-xl border border-dashed border-theme-text/75 bg-theme-surface/70 p-3.5 sm:p-4"
  data-testid="adventure-ooc-exchange"
  data-ooc-id={exchange.id}
  data-ooc-status={exchange.status}
>
  <header class="flex flex-wrap items-center justify-between gap-2">
    <span
      class="inline-flex items-center gap-1.5 rounded-full border border-theme-text/75 bg-theme-bg px-2.5 py-0.5 text-xs font-semibold text-theme-text"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--message-circle-question] h-3.5 w-3.5"
      ></span>
      <span>Ask GM · Out of character</span>
    </span>
    <span
      class="text-xs text-theme-text"
      data-testid="adventure-ooc-no-advance-badge"
    >
      No game time elapsed · No story changes
    </span>
  </header>

  <div
    class="ml-auto max-w-[92%] rounded-2xl rounded-br-sm border border-theme-border/60 bg-theme-bg px-3 py-2"
  >
    <p
      class="mb-1 text-xs font-semibold uppercase tracking-wide text-theme-text"
    >
      You (OOC)
    </p>
    <p class="whitespace-pre-wrap text-sm leading-relaxed text-theme-text">
      {exchange.question}
    </p>
  </div>

  {#if exchange.status === "answered" && exchange.answer}
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-wide text-theme-text">
        GM Clarification
      </p>
      <p class="whitespace-pre-wrap text-sm leading-relaxed text-theme-text">
        {exchange.answer}
      </p>
    </div>
  {:else if exchange.status === "pending"}
    <div
      class="flex items-center gap-2 text-sm text-theme-text"
      role="status"
      data-testid="adventure-ooc-pending"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--sparkles] h-4 w-4 motion-safe:animate-pulse"
      ></span>
      <span>GM is checking current player-visible context…</span>
    </div>
  {:else if exchange.status === "failed"}
    <div
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme-text/75 bg-theme-bg px-3 py-2 text-xs text-theme-text"
      role="alert"
      data-testid="adventure-ooc-failed"
    >
      <span>
        Unable to answer this out-of-character question ({exchange.errorMessage ??
          "request failed"}).
      </span>
      {#if canRetry}
        <button
          type="button"
          class="inline-flex min-h-8 items-center gap-1 rounded-md border border-theme-text/75 bg-theme-surface px-2.5 py-1 text-xs font-semibold text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
          data-testid="adventure-ooc-retry"
          onclick={() => void manager.retryOocQuestion(exchange.id)}
        >
          <span aria-hidden="true" class="icon-[lucide--rotate-ccw] h-3.5 w-3.5"
          ></span>
          <span>Retry OOC question</span>
        </button>
      {/if}
    </div>
  {/if}
</article>
