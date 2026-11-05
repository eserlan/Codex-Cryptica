<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import { describeScenarioMutationError } from "#lib/stores/oracle/adventure-scenarios.js";
  import AdventureKnownSituations from "./AdventureKnownSituations.svelte";
  let { manager }: { manager: AdventureManager } = $props();
  let busy = $state(false);
  let error = $state<string | null>(null);
  const scenarios = $derived(
    manager.session?.scenarioCollection?.items.filter(
      (item) => item.knowledge === "heard",
    ) ?? [],
  );
  const focusedId = $derived(
    manager.session?.scenarioCollection?.focusedScenarioId ?? "",
  );

  async function run(action: () => Promise<unknown>) {
    if (busy || manager.readOnly || manager.session?.pendingRoll) return;
    busy = true;
    error = null;
    try {
      await action();
    } catch (cause) {
      error = describeScenarioMutationError(cause);
    } finally {
      busy = false;
    }
  }

  function setStatus(id: string, status: "resolved" | "abandoned") {
    return run(() => manager.setScenarioStatus(id, status));
  }
</script>

{#if scenarios.length > 0}
  <section
    class="space-y-2"
    aria-label="Known situations"
    data-testid="adventure-scenario-controls"
  >
    <AdventureKnownSituations {scenarios} />
    <div class="flex flex-wrap items-center gap-2">
      <label for="known-scenario-focus" class="sr-only">Focused situation</label
      >
      <select
        id="known-scenario-focus"
        aria-label="Focused situation"
        class="min-h-10 max-w-48 rounded-md border border-theme-border bg-theme-surface px-2 text-sm text-theme-text disabled:opacity-50"
        value={focusedId}
        disabled={busy || manager.readOnly || !!manager.session?.pendingRoll}
        onchange={(event) =>
          void run(() =>
            manager.focusScenario(event.currentTarget.value || null),
          )}
      >
        <option value="">No focus</option>
        {#each scenarios.filter((item) => item.status === "open") as item (item.id)}
          <option value={item.id}>{item.playerVisible.lead}</option>
        {/each}
      </select>
      {#if focusedId}
        <button
          type="button"
          class="min-h-10 rounded-md border border-theme-border px-2 text-xs text-theme-text disabled:opacity-50"
          disabled={busy || manager.readOnly || !!manager.session?.pendingRoll}
          onclick={() => void setStatus(focusedId, "resolved")}>Resolve</button
        >
        <button
          type="button"
          class="min-h-10 rounded-md border border-theme-border px-2 text-xs text-theme-text disabled:opacity-50"
          disabled={busy || manager.readOnly || !!manager.session?.pendingRoll}
          onclick={() => void setStatus(focusedId, "abandoned")}>Abandon</button
        >
      {/if}
      {#if error}<span role="alert" class="text-xs text-theme-danger"
          >{error}</span
        >{/if}
    </div>
  </section>
{/if}
