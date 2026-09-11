<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  let { manager }: { manager: AdventureManager } = $props();
  let outcome = $state("");
  let recorded = $derived(
    Boolean(manager.session?.pendingRoll?.suppliedOutcome),
  );
  let outcomeBands = $derived(manager.session?.pendingRoll?.dice?.bands ?? []);
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
      <div class="space-y-2">
        <div class="flex items-center gap-1.5 text-sm text-theme-secondary">
          <span>Roll {manager.session.pendingRoll.dice.expression}</span>
          <span class="group relative inline-flex">
            <button
              type="button"
              class="inline-flex h-6 w-6 items-center justify-center text-theme-secondary transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
              aria-describedby="adventure-roll-outcome-bands"
              aria-label="Roll outcome bands"
            >
              <span aria-hidden="true" class="icon-[lucide--info] h-4 w-4"
              ></span>
            </button>
            <span
              id="adventure-roll-outcome-bands"
              class="invisible pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] translate-y-1 rounded-md border border-theme-primary/30 bg-theme-surface px-3 py-2.5 text-sm text-theme-secondary opacity-0 shadow-lg transition duration-150 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100"
              role="tooltip"
              data-testid="adventure-roll-outcome-bands"
            >
              <span
                class="block text-xs font-semibold uppercase tracking-wide text-theme-primary"
              >
                Outcome bands
              </span>
              <ul
                class="mt-1.5 list-disc space-y-1.5 pl-4 marker:text-theme-primary"
              >
                {#each outcomeBands as band (`${band.minimum ?? "?"}-${band.maximum ?? "?"}-${band.label}`)}
                  <li class="pl-0.5 leading-relaxed">
                    <span class="font-semibold text-theme-primary"
                      >{band.minimum ?? "?"}–{band.maximum ?? "?"}</span
                    >
                    <span class="text-theme-secondary">{band.label}</span>
                  </li>
                {/each}
              </ul>
            </span>
          </span>
        </div>
      </div>
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
