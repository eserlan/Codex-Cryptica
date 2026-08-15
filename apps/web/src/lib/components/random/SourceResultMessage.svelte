<script lang="ts">
  import type { ResolutionNode } from "random-source-engine";
  import type { RandomSourceRollPayload } from "$lib/stores/dice-history.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import ResolutionChain from "./ResolutionChain.svelte";

  /**
   * A table roll or deck draw inside the chat transcript (#2247, FR-039).
   *
   * Shown where the roll happened rather than only in the roll log: the point
   * of rolling mid-conversation is that the result is part of the conversation.
   */
  let {
    result,
    createEntity = (type, title, data) => vault.createEntity(type, title, data),
    isGuest = () => vault.isGuest,
  }: {
    result: RandomSourceRollPayload;
    createEntity?: (
      type: string,
      title: string,
      data: Record<string, unknown>,
    ) => Promise<string>;
    isGuest?: () => boolean;
  } = $props();

  let saved = $state(false);

  const chain = $derived((result.chain ?? []) as ResolutionNode[]);
  const isComposed = $derived(chain.some((node) => node.children.length > 0));

  /**
   * Turns a result into world content (FR-041).
   *
   * A note, not a guess at a type: the roll produced prose, and asking the
   * author to place it is better than filing it somewhere wrong.
   */
  async function keepAsNote() {
    if (saved || isGuest()) return;
    try {
      const id = await createEntity("note", result.sourceName, {
        content: result.finalText,
      });
      saved = true;
      vault.selectedEntityId = id;
    } catch (err) {
      console.error("[RandomSources] Could not keep result", err);
      notificationStore.notify("That result could not be saved.", "error");
    }
  }
</script>

<div
  class="flex flex-col gap-2 rounded-lg border border-theme-border bg-theme-bg/40 p-3"
  data-testid="source-result"
>
  <div class="flex items-center justify-between gap-2">
    <span
      class="font-mono text-[9px] uppercase tracking-widest text-theme-muted"
      data-testid="source-result-name"
    >
      {result.sourceName}
    </span>
    {#if !isGuest()}
      <button
        type="button"
        class="rounded border border-theme-border px-2 py-0.5 font-header text-[9px] uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
        onclick={keepAsNote}
        disabled={saved}
        data-testid="keep-result"
      >
        {saved ? "Kept" : "Keep as a note"}
      </button>
    {/if}
  </div>

  <p
    class="whitespace-pre-wrap font-body text-sm leading-relaxed text-theme-text"
    data-testid="source-result-text"
  >
    {result.finalText}
  </p>

  {#if result.drawnCards && result.drawnCards.length > 1}
    <p class="font-mono text-[9px] uppercase tracking-widest text-theme-muted">
      {result.drawnCards.length} cards drawn
    </p>
  {/if}

  {#if isComposed}
    <div class="border-t border-theme-border/40 pt-2">
      <ResolutionChain nodes={chain} />
    </div>
  {/if}
</div>

<style>
  @reference "../../../app.css";
</style>
