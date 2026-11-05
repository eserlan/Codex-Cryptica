<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import { describeScenarioMutationError } from "#lib/stores/oracle/adventure-scenarios.js";

  let { manager }: { manager: AdventureManager } = $props();
  let busyId = $state<string | null>(null);
  let error = $state<string | null>(null);

  const scenarios = $derived(
    manager.session?.scenarioCollection?.items.filter(
      (item) => item.knowledge === "heard",
    ) ?? [],
  );
  const locked = $derived(
    manager.readOnly || !!manager.session?.pendingRoll || busyId !== null,
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

  const buttonClass =
    "min-h-10 rounded-md border border-theme-border px-3 text-sm text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:opacity-50";
</script>

{#if scenarios.length > 0}
  <section
    class="space-y-3 rounded-lg border border-theme-border p-4"
    aria-labelledby="adventure-situations-heading"
    data-testid="adventure-situation-settings"
  >
    <div>
      <h3
        id="adventure-situations-heading"
        class="font-semibold text-theme-primary"
      >
        Situations
      </h3>
      <p class="text-sm text-theme-text">
        Decide when a lead is finished or left behind. You can reopen either
        choice.
      </p>
    </div>
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
    {#if error}
      <p role="alert" class="text-sm text-theme-danger">{error}</p>
    {/if}
  </section>
{/if}
