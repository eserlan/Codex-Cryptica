<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  let { manager }: { manager: AdventureManager } = $props();
  let outcome = $state("");
  let recorded = $derived(
    Boolean(manager.session?.pendingRoll?.suppliedOutcome),
  );
  let bandSummary = $derived(
    manager.session?.pendingRoll?.dice?.bands
      .map(
        (band) =>
          `${band.minimum ?? "?"}–${band.maximum ?? "?"}: ${band.label}`,
      )
      .join(" · ") ?? "",
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
    {#if manager.session.pendingRoll.setupNarration}
      <p class="whitespace-pre-wrap text-sm text-theme-primary">
        {manager.session.pendingRoll.setupNarration}
      </p>
    {/if}
    <p class="text-sm text-theme-primary">
      {manager.session.pendingRoll.uncertainty}
    </p>
    <p class="text-sm text-theme-secondary">
      <strong>At stake:</strong>
      {manager.session.pendingRoll.stakes}
    </p>
    {#if manager.errorMessage}
      <p class="text-sm text-theme-danger" role="alert">
        {manager.errorMessage}
      </p>
    {/if}
    {#if manager.session.pendingRoll.dice}
      <p class="flex items-center gap-1 text-sm text-theme-secondary">
        Roll {manager.session.pendingRoll.dice.expression}
        <span
          class="icon-[lucide--info] h-4 w-4 text-theme-secondary"
          aria-label="Roll outcome bands: {bandSummary}"
          title={bandSummary}
        ></span>
      </p>
    {/if}
    <!-- Both branches below stay mounted and are hidden with a class rather
         than an {#if}/{:else} swap. The buttons here are the ones the user
         just clicked when `recorded` flips true (report/roll outcome), and
         removing a focused element from the DOM mid-click silently exits
         native fullscreen in Chrome — see AdventureFocusPlay.svelte's
         Fullscreen toggle. -->
    <div class={recorded ? "" : "hidden"}>
      {#if manager.errorMessage}
        <button
          class="min-h-12 rounded-md bg-theme-primary px-4 py-2 text-theme-on-primary"
          type="button"
          onclick={() => void manager.resolveRoll()}>Retry resolution</button
        >
      {:else}
        <p class="text-sm text-theme-secondary">
          Result recorded. Oracle is resolving it.
        </p>
      {/if}
    </div>
    <div class={recorded ? "hidden" : "space-y-2"}>
      <label class="block text-sm text-theme-primary" for="roll-outcome"
        >Your outcome</label
      >
      <input
        id="roll-outcome"
        class="w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-primary"
        bind:value={outcome}
        disabled={recorded}
      />
      <div class="flex flex-wrap gap-2">
        <button
          class="min-h-12 rounded-md bg-theme-primary px-4 py-2 text-theme-on-primary"
          type="button"
          disabled={recorded}
          onclick={() => void report()}>Report outcome</button
        >{#if manager.session.pendingRoll.dice}<button
            class="min-h-12 rounded-md border border-theme-border px-4 py-2 text-theme-primary"
            type="button"
            disabled={recorded}
            onclick={() => void manager.rollCodexDice()}
            >Roll {manager.session.pendingRoll.dice.expression}</button
          >{/if}<button
          class="min-h-12 rounded-md border border-theme-border px-4 py-2 text-theme-primary"
          type="button"
          disabled={recorded}
          onclick={() => void manager.dismissRoll()}>Change approach</button
        >
      </div>
    </div>
  </section>
{/if}
