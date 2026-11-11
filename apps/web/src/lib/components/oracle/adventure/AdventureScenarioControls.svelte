<script lang="ts">
  import type { ScenarioItem } from "@codex/adventure-engine";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import { describeScenarioMutationError } from "#lib/stores/oracle/adventure-scenarios.js";
  import { soloThreads } from "#lib/stores/solo-session-instance.js";
  import { vault } from "#lib/stores/vault.svelte.js";
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

  const entitiesById = $derived.by(() => {
    const map: Record<string, { id: string; title: string }> = {};
    for (const entity of vault.allEntities ?? []) {
      if (entity.visibility !== "hidden") {
        map[entity.id] = { id: entity.id, title: entity.title };
      }
    }
    return map;
  });

  const threads = $derived.by(() => {
    return soloThreads.threads.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
    }));
  });

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

  function saveToSoloThreads(item: ScenarioItem) {
    const title = item.playerVisible.lead.trim();
    if (!title || !soloThreads.editable) return;
    const existing = soloThreads.threads.find(
      (t) => t.title.trim().toLowerCase() === title.toLowerCase(),
    );
    if (existing) return;
    const created = soloThreads.add({
      title,
      kind: "lead",
      note: item.playerVisible.rumour,
    });
    if (created.ok) {
      for (const anchorId of item.anchorRefs) {
        if (entitiesById[anchorId]) {
          soloThreads.link(created.thread.id, anchorId);
        }
      }
    }
  }
</script>

{#if scenarios.length > 0}
  <section
    class="space-y-2"
    aria-label="Known situations"
    data-testid="adventure-scenario-controls"
  >
    <AdventureKnownSituations
      {scenarios}
      {focusedId}
      {entitiesById}
      {threads}
      canCreateThread={soloThreads.editable}
      disabled={busy ||
        manager.readOnly ||
        !!manager.session?.pendingRoll ||
        manager.phase === "generating"}
      onFollow={(scenarioId) =>
        void run(() => manager.focusScenario(scenarioId))}
      onRecordTheory={(scenarioId, text) =>
        run(() => manager.recordScenarioTheory(scenarioId, text))}
      onSaveThread={saveToSoloThreads}
    />
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs font-medium text-theme-text" aria-hidden="true"
        >Focus</span
      >
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
      {#if error}<span role="alert" class="text-xs text-theme-danger"
          >{error}</span
        >{/if}
    </div>
  </section>
{/if}
