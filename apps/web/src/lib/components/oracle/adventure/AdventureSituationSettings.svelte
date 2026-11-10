<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import { describeScenarioMutationError } from "#lib/stores/oracle/adventure-scenarios.js";

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
      <p class="text-xs text-theme-text">
        Advances the local world clock once. Nothing progresses while the app is
        closed; Oracle can consider elapsed time on your next action.
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
