<script lang="ts">
  import { formatWorldElapsedMinutes } from "@codex/adventure-engine";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import { describeScenarioMutationError } from "#lib/stores/oracle/adventure-scenarios.js";
  import {
    adventureReviewJson,
    adventureReviewMarkdown,
    copyDiagnosticSnapshot,
    readDiagnosticBaseline,
  } from "#lib/services/adventure/adventure-review-capture.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

  let {
    manager,
    onAction,
  }: {
    manager: AdventureManager;
    onAction?: () => void;
  } = $props();
  let busyId = $state<string | null>(null);
  let error = $state<string | null>(null);
  let advanceMinutes = $state(60);
  let copyBusy = $state(false);
  let baselineRefresh = $state(0);

  function diagnosticStorage(): Storage | null {
    return typeof window !== "undefined" ? window.localStorage : null;
  }

  const hasBaseline = $derived.by(() => {
    void baselineRefresh;
    const session = manager.session;
    if (!session) return false;
    const baseline = readDiagnosticBaseline(session.id, diagnosticStorage());
    return (
      baseline !== null &&
      session.turns.length >= baseline.turnCount &&
      session.revision >= baseline.revision
    );
  });

  const scenarios = $derived(
    manager.session?.scenarioCollection?.items.filter(
      (item) => item.knowledge === "heard",
    ) ?? [],
  );
  const locked = $derived(
    manager.readOnly ||
      manager.phase === "generating" ||
      !!manager.session?.pendingRoll ||
      busyId !== null,
  );

  const STATUS_LABEL = {
    open: "Open",
    resolved: "Resolved",
    abandoned: "Left behind",
  } as const;

  async function change(id: string, status: "open" | "resolved" | "abandoned") {
    if (locked) return;
    busyId = id;
    error = null;
    try {
      await manager.setScenarioStatus(id, status);
    } catch (cause) {
      error = describeScenarioMutationError(cause);
    } finally {
      busyId = null;
    }
  }

  async function advanceTime() {
    if (locked) return;
    busyId = "world-clock";
    error = null;
    try {
      await manager.advanceWorldTime(
        advanceMinutes,
        "Player advanced world time",
      );
    } catch (cause) {
      error = describeScenarioMutationError(cause);
    } finally {
      busyId = null;
    }
  }

  async function lookForRumours() {
    if (locked) return;
    error = null;
    try {
      await manager.submitAction("Ask around for local rumours and news.");
      if (manager.phase === "generating") {
        onAction?.();
      }
    } catch (cause) {
      error = describeScenarioMutationError(cause);
    }
  }

  async function copySession(
    format: "markdown" | "json" | "diagnostic" | "diagnostic-full",
  ) {
    const session = manager.session;
    if (!session || copyBusy) return;
    copyBusy = true;
    error = null;
    try {
      let text: string;
      let label: string;
      if (format === "markdown") {
        text = adventureReviewMarkdown(session);
        label = "Markdown";
      } else if (format === "diagnostic" || format === "diagnostic-full") {
        const result = copyDiagnosticSnapshot(session, diagnosticStorage(), {
          forceFull: format === "diagnostic-full",
        });
        baselineRefresh += 1;
        text = result.text;
        label = result.isDelta
          ? `delta JSON for AI (turns ${result.fromTurnCount}–${result.toTurnCount})`
          : "compact JSON for AI";
      } else {
        text = adventureReviewJson(session);
        label = "JSON";
      }
      await navigator.clipboard.writeText(text);
      notificationStore.notify(
        `GM-only adventure ${label} copied to clipboard.`,
        "success",
      );
    } catch {
      error =
        "Could not copy the session. Check clipboard permissions and retry.";
    } finally {
      copyBusy = false;
    }
  }

  const buttonClass =
    "min-h-10 rounded-md border border-theme-border px-3 text-sm text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:opacity-50";
</script>

{#if manager.session}
  <section
    class="space-y-3 rounded-lg border border-theme-border p-4"
    aria-labelledby="adventure-situations-heading"
    data-testid="adventure-situation-settings"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3
          id="adventure-situations-heading"
          class="font-semibold text-theme-text"
        >
          Situations & Rumours
        </h3>
        <p class="text-sm text-theme-text">
          Track discovered situations, or ask around for local rumours.
        </p>
      </div>
      <button
        type="button"
        class={buttonClass}
        disabled={locked}
        onclick={() => void lookForRumours()}
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--ear] mr-1.5 inline-block h-4 w-4 align-text-bottom"
        ></span>
        Look for local rumours
      </button>
    </div>

    <div class="space-y-2 border-t border-theme-border pt-3">
      <h4 class="text-sm font-semibold text-theme-text">
        Advance fictional time
      </h4>
      {#if manager.session.worldTime?.elapsedMinutes}
        <p class="text-xs text-theme-text" data-testid="adventure-elapsed-time">
          Elapsed fictional time: <span class="font-medium"
            >{formatWorldElapsedMinutes(
              manager.session.worldTime.elapsedMinutes,
            )}</span
          >
        </p>
      {/if}
      <p class="text-xs text-theme-text">
        Advances the local world clock deterministically offline. Off-screen
        scenario pressures advance automatically without AI; qualitative NPC
        reactions are woven in by Oracle on your next action.
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-sm text-theme-text" for="adventure-time-step"
          >Duration</label
        >
        <select
          id="adventure-time-step"
          class={buttonClass}
          bind:value={advanceMinutes}
          disabled={locked}
        >
          <option value={60}>One hour</option>
          <option value={480}>Eight hours</option>
          <option value={1440}>One day</option>
          <option value={10080}>One week</option>
        </select>
        <button
          type="button"
          class={buttonClass}
          disabled={locked}
          onclick={() => void advanceTime()}
        >
          Advance time
        </button>
      </div>
    </div>

    <div
      class="space-y-2 border-t border-theme-border pt-3"
      data-testid="adventure-review-copy"
    >
      <h4 class="text-sm font-semibold text-theme-text">
        Copy play session for review
      </h4>
      <p class="text-xs text-theme-text">
        GM-only: both copies include the complete committed play history, hidden
        scenario truths and private world state. Keep them away from players.
        Copying stays on this device until you paste it elsewhere.
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class={buttonClass}
          disabled={copyBusy}
          onclick={() => void copySession("markdown")}>Copy Markdown</button
        >
        <button
          type="button"
          class={buttonClass}
          disabled={copyBusy}
          onclick={() => void copySession("json")}>Copy JSON</button
        >
        <button
          type="button"
          class={buttonClass}
          disabled={copyBusy}
          title={hasBaseline
            ? "Delta since the last AI copy (only new turns and changed state)."
            : "Current state plus the latest 20 turns in full; older turns condensed. Sized to fit an AI chat."}
          onclick={() => void copySession("diagnostic")}
          >Copy JSON for AI</button
        >
        {#if hasBaseline}
          <button
            type="button"
            class={buttonClass}
            disabled={copyBusy}
            title="Copy the full compact JSON snapshot and reset the delta baseline."
            onclick={() => void copySession("diagnostic-full")}
            >Copy full JSON for AI</button
          >
        {/if}
      </div>
    </div>

    {#if scenarios.length > 0}
      <ul class="space-y-2">
        {#each scenarios as item (item.id)}
          <li
            class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-theme-border p-2"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-theme-text">
                {item.playerVisible.lead}
              </p>
              <p class="text-xs text-theme-text">{STATUS_LABEL[item.status]}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              {#if item.status === "open"}
                <button
                  type="button"
                  class={buttonClass}
                  disabled={locked}
                  onclick={() => void change(item.id, "resolved")}
                  >Mark as concluded</button
                >
                <button
                  type="button"
                  class={buttonClass}
                  disabled={locked}
                  onclick={() => void change(item.id, "abandoned")}
                  >Leave it behind</button
                >
              {:else}
                <button
                  type="button"
                  class={buttonClass}
                  disabled={locked}
                  onclick={() => void change(item.id, "open")}>Reopen</button
                >
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
    {#if error}
      <p role="alert" class="text-sm text-theme-danger">{error}</p>
    {/if}
  </section>
{/if}
