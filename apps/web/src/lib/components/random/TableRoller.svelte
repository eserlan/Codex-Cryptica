<script lang="ts">
  import type { RandomSource, RollOutcome } from "random-source-engine";
  import { randomSources } from "$lib/features/random";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  import {
    diceHistory,
    type DiceHistoryStore,
  } from "$lib/stores/dice-history.svelte";
  import { addToOracleChatInput } from "$lib/components/oracle/oracle-chat-input";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { copyTextToClipboard } from "$lib/utils/share-link";
  import { systemClock, type Clock } from "$lib/utils/runtime-deps";
  import { fade } from "svelte/transition";
  import ResolutionChain from "./ResolutionChain.svelte";

  /**
   * Rolls one table and shows the result, the die value behind it, and a way to
   * roll again without leaving the editor (SC-010).
   *
   * The store and history are injected with production defaults so the
   * component can be driven by fakes in a test (Constitution VIII).
   */
  let {
    source,
    sources = randomSources,
    history = diceHistory,
    session = mapSession,
    addToChat = async (text) => {
      session.sendChatMessage(text);
      addToOracleChatInput(text);
    },
    copyText = async (text) => {
      const copied = await copyTextToClipboard(text, navigator.clipboard);
      if (!copied) throw new Error("Clipboard copy is unavailable.");
    },
    clock = systemClock,
  }: {
    source: RandomSource;
    sources?: RandomSourceStore;
    history?: DiceHistoryStore;
    session?: typeof mapSession;
    addToChat?: (text: string) => Promise<void>;
    copyText?: (text: string) => Promise<void>;
    clock?: Clock;
  } = $props();

  let outcome = $state<RollOutcome | undefined>();
  let isAddingToChat = $state(false);
  let copied = $state(false);

  const dieValue = $derived(outcome?.chain[0]?.dieValue);

  /**
   * The die a value was read off. Ranged tables carry their own; a weighted
   * table's range is the sum of its weights, which is what the engine picks
   * across.
   */
  const dieSides = $derived.by(() => {
    if (source.selection?.mode === "ranged") return source.selection.die.sides;
    return (source.entries ?? []).reduce((sum, e) => sum + (e.weight ?? 1), 0);
  });

  const hasEntries = $derived((source.entries ?? []).length > 0);
  const resultText = $derived(outcome?.finalText ?? "");

  /** True once a result was composed from more than one source. */
  const isComposed = $derived(
    (outcome?.chain ?? []).some((node) => node.children.length > 0),
  );

  async function roll() {
    if (!hasEntries) return;
    const result = sources.roll(source);
    outcome = result;
    copied = false;
    await record(result);
  }

  /**
   * Re-rolls one fragment, keeping its siblings (FR-019). The recomposed
   * result is a new result, so it goes into history like any other.
   */
  async function rerollFragment(nodePath: number[]) {
    if (!outcome) return;
    const result = sources.rerollFragment(outcome, nodePath);
    outcome = result;
    copied = false;
    await record(result);
  }

  async function addResultToChat() {
    if (!resultText || isAddingToChat) return;
    isAddingToChat = true;
    try {
      await addToChat(resultText);
    } catch (error) {
      console.error("[RandomSources] Could not add result to chat", error);
      notificationStore.notify(
        "That result could not be added to chat.",
        "error",
      );
    } finally {
      isAddingToChat = false;
    }
  }

  async function copyResult() {
    if (!resultText) return;
    try {
      await copyText(resultText);
      copied = true;
      notificationStore.notify("Result copied to clipboard.", "success");
    } catch (error) {
      console.error("[RandomSources] Could not copy result", error);
      notificationStore.notify("That result could not be copied.", "error");
    }
  }

  /** Writes the roll into the shared roll history (FR-018). */
  async function record(result: RollOutcome) {
    const value = result.chain[0]?.dieValue;
    await history.addResult(
      {
        total: value ?? 0,
        parts:
          value === undefined
            ? []
            : [{ type: "dice", sides: dieSides, rolls: [value], value }],
        formula: `d${dieSides}`,
        timestamp: clock.now(),
      },
      "table",
      {
        label: source.name,
        source: {
          sourceId: source.id,
          sourceName: source.name,
          kind: source.kind,
          finalText: result.finalText,
          chain: result.chain,
        },
      },
    );
  }
</script>

<div
  class="flex flex-col gap-3 rounded-xl border border-theme-border bg-theme-surface p-4"
  data-testid="table-roller"
>
  <div class="flex items-center justify-between gap-3">
    <h3
      class="text-[10px] font-bold font-header uppercase tracking-[0.2em] text-theme-muted"
    >
      Roll
    </h3>
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg border border-theme-primary/30 bg-theme-primary/10 px-3 py-1.5 text-[10px] font-bold font-header uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      onclick={roll}
      disabled={!hasEntries}
      data-testid="roll-table"
    >
      <span aria-hidden="true" class="icon-[lucide--dices] h-3.5 w-3.5"></span>
      {outcome ? "Roll again" : "Roll"}
    </button>
  </div>

  {#if !hasEntries}
    <p class="text-xs text-theme-muted/70 font-body italic">
      Add an entry and this table can be rolled.
    </p>
  {:else if outcome}
    <div class="flex items-start gap-4" in:fade={{ duration: 150 }}>
      <div
        class="flex min-w-[3.5rem] flex-col items-center justify-center border-r border-theme-border/30 py-1 pr-4"
      >
        <span
          class="text-3xl font-black font-header leading-none tabular-nums text-theme-primary"
          data-testid="roll-die-value"
        >
          {dieValue ?? "—"}
        </span>
        <span
          class="mt-1.5 text-[8px] font-bold uppercase tracking-tighter text-theme-muted"
        >
          d{dieSides}
        </span>
      </div>
      <p
        class="flex-1 whitespace-pre-wrap font-body text-sm leading-relaxed text-theme-text"
        data-testid="roll-result"
      >
        {outcome.finalText}
      </p>
    </div>

    <div class="flex flex-wrap gap-2 border-t border-theme-border/40 pt-3">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[9px] uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-40"
        onclick={addResultToChat}
        disabled={isAddingToChat}
        aria-busy={isAddingToChat}
        data-testid="add-roll-result-to-chat"
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--message-square-plus] h-3.5 w-3.5"
        ></span>
        {isAddingToChat ? "Adding…" : "Add to chat"}
      </button>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[9px] uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
        onclick={copyResult}
        data-testid="copy-roll-result"
      >
        <span aria-hidden="true" class="icon-[lucide--copy] h-3.5 w-3.5"></span>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>

    {#if isComposed}
      <div class="border-t border-theme-border/40 pt-3">
        <h4
          class="mb-2 font-header text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
        >
          Where this came from
        </h4>
        <ResolutionChain nodes={outcome.chain} onReroll={rerollFragment} />
      </div>
    {/if}

    {#each outcome.notices as notice}
      <p
        class="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-body text-xs text-amber-600 dark:text-amber-400"
        data-testid="roll-notice"
      >
        {notice.message}
      </p>
    {/each}
  {/if}
</div>

<style>
  @reference "../../../app.css";
</style>
