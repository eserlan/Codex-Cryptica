<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  let { manager }: { manager: AdventureManager } = $props();
  let outcome = $state("");
  let recorded = $derived(
    Boolean(manager.session?.pendingRoll?.suppliedOutcome),
  );
  async function report() {
    if (outcome.trim())
      await manager.recordRollOutcome({ kind: "narrative", value: outcome });
  }
</script>

{#if manager.session?.pendingRoll}
  <section
    class="space-y-3 rounded-lg border border-theme-border p-4"
    aria-live="polite"
    aria-labelledby="roll-heading"
  >
    <h3 id="roll-heading" class="font-semibold text-theme-primary">
      A roll matters
    </h3>
    <p class="text-sm text-theme-primary">
      {manager.session.pendingRoll.uncertainty}
    </p>
    <p class="text-sm text-theme-secondary">
      <strong>At stake:</strong>
      {manager.session.pendingRoll.stakes}
    </p>
    {#if manager.session.pendingRoll.dice}<p
        class="text-sm text-theme-secondary"
      >
        Roll {manager.session.pendingRoll.dice.expression}; {manager.session.pendingRoll.dice.bands
          .map((band) => band.label)
          .join(" · ")}
      </p>{/if}
    {#if recorded}<p class="text-sm text-theme-secondary">
        Result recorded. Waiting for Oracle to resolve it; you cannot reroll.
      </p>
      <button
        class="min-h-12 rounded-md bg-theme-primary px-4 py-2 text-theme-on-primary"
        type="button"
        onclick={() => void manager.resolveRoll()}
        >Continue with recorded result</button
      >
    {:else}<label class="block text-sm text-theme-primary" for="roll-outcome"
        >Your outcome</label
      ><input
        id="roll-outcome"
        class="w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-primary"
        bind:value={outcome}
      />
      <div class="flex flex-wrap gap-2">
        <button
          class="min-h-12 rounded-md bg-theme-primary px-4 py-2 text-theme-on-primary"
          type="button"
          onclick={() => void report()}>Report outcome</button
        >{#if manager.session.pendingRoll.dice}<button
            class="min-h-12 rounded-md border border-theme-border px-4 py-2 text-theme-primary"
            type="button"
            onclick={() => void manager.rollCodexDice()}
            >Roll {manager.session.pendingRoll.dice.expression}</button
          >{/if}<button
          class="min-h-12 rounded-md border border-theme-border px-4 py-2 text-theme-primary"
          type="button"
          onclick={() => void manager.dismissRoll()}>Change approach</button
        >
      </div>{/if}
  </section>
{/if}
