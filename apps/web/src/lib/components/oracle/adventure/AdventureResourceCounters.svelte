<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";

  let { manager }: { manager: AdventureManager } = $props();

  const NEW_COUNTER_ID = "__new__";

  let newLabel = $state("");
  let newValue = $state("0");
  let error = $state<string | null>(null);
  let busyId = $state<string | null>(null);

  async function addCounter() {
    if (busyId === NEW_COUNTER_ID) return;
    const label = newLabel.trim();
    const value = Number(newValue);
    if (!label || !Number.isFinite(value)) {
      error = "A label and a numeric starting value are required.";
      return;
    }
    error = null;
    busyId = NEW_COUNTER_ID;
    try {
      await manager.addResourceCounter(label, value);
      newLabel = "";
      newValue = "0";
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : "Unable to add that counter.";
    } finally {
      busyId = null;
    }
  }

  async function adjust(counterId: string, delta: number, current: number) {
    busyId = counterId;
    error = null;
    try {
      await manager.adjustResourceCounter(counterId, current + delta);
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : "Unable to adjust that counter.";
    } finally {
      busyId = null;
    }
  }

  async function remove(counterId: string) {
    busyId = counterId;
    try {
      await manager.removeResourceCounter(counterId);
    } finally {
      busyId = null;
    }
  }
</script>

{#if manager.session && !manager.readOnly}
  <section class="space-y-3 rounded-lg border border-theme-border p-4">
    <h3 class="font-semibold text-theme-primary">Resource trackers</h3>
    <p class="text-xs text-theme-secondary">
      Simple counters for your own bookkeeping — ammo, favor, a countdown. Codex
      Cryptica doesn't apply any rules to these values.
    </p>
    {#if manager.session.resourceCounters.length}
      <ul class="space-y-2">
        {#each manager.session.resourceCounters as counter (counter.id)}
          <li class="flex items-center justify-between gap-2 text-sm">
            <span class="text-theme-primary">{counter.label}</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="flex min-h-8 min-w-8 items-center justify-center rounded-md border border-theme-border text-theme-secondary disabled:opacity-50"
                disabled={busyId === counter.id}
                onclick={() => void adjust(counter.id, -1, counter.value)}
                aria-label="Decrease {counter.label}"
              >
                −
              </button>
              <span
                class="min-w-8 text-center text-theme-primary"
                data-testid="counter-value-{counter.id}">{counter.value}</span
              >
              <button
                type="button"
                class="flex min-h-8 min-w-8 items-center justify-center rounded-md border border-theme-border text-theme-secondary disabled:opacity-50"
                disabled={busyId === counter.id}
                onclick={() => void adjust(counter.id, 1, counter.value)}
                aria-label="Increase {counter.label}"
              >
                +
              </button>
              <button
                type="button"
                class="flex min-h-8 min-w-8 items-center justify-center rounded-md border border-theme-border text-theme-secondary transition hover:bg-theme-danger/10 hover:text-theme-danger disabled:opacity-50"
                disabled={busyId === counter.id}
                onclick={() => void remove(counter.id)}
                aria-label="Remove {counter.label}"
              >
                <span class="icon-[lucide--x] h-3.5 w-3.5" aria-hidden="true"
                ></span>
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="flex flex-wrap gap-2">
      <input
        type="text"
        bind:value={newLabel}
        placeholder="Label (e.g. Ammo)"
        aria-label="New resource counter label"
        class="min-h-10 flex-1 rounded-md border border-theme-border bg-theme-surface px-2 text-sm text-theme-primary"
      />
      <input
        type="number"
        bind:value={newValue}
        aria-label="New resource counter starting value"
        class="min-h-10 w-24 rounded-md border border-theme-border bg-theme-surface px-2 text-sm text-theme-primary"
      />
      <button
        type="button"
        class="min-h-10 rounded-md border border-theme-primary/50 px-3 text-sm text-theme-primary transition hover:bg-theme-primary/10 disabled:opacity-50"
        disabled={busyId === NEW_COUNTER_ID}
        onclick={() => void addCounter()}
      >
        Track it
      </button>
    </div>
    {#if error}<p class="text-sm text-theme-danger" role="alert">
        {error}
      </p>{/if}
  </section>
{/if}
