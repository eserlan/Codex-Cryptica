<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";

  let { manager }: { manager: AdventureManager } = $props();

  let presetLabel = $state("");
  let presetExpression = $state("");
  let presetError = $state<string | null>(null);
  let removingId = $state<string | null>(null);
  let addingPreset = $state(false);

  async function addPreset() {
    if (addingPreset) return;
    const label = presetLabel.trim();
    const expression = presetExpression.trim();
    if (!label || !expression) {
      presetError = "Both a label and a dice expression are required.";
      return;
    }
    presetError = null;
    addingPreset = true;
    try {
      await manager.addDicePreset(label, expression);
      presetLabel = "";
      presetExpression = "";
    } catch (cause) {
      presetError =
        cause instanceof Error ? cause.message : "Unable to save the preset.";
    } finally {
      addingPreset = false;
    }
  }

  async function removePreset(presetId: string) {
    removingId = presetId;
    try {
      await manager.removeDicePreset(presetId);
    } finally {
      removingId = null;
    }
  }
</script>

{#if manager.session && !manager.readOnly}
  <section class="space-y-3 rounded-lg border border-theme-border p-4">
    <h3 class="font-semibold text-theme-primary">Dice presets</h3>
    <p class="text-xs text-theme-secondary">
      A quick reference for expressions you reuse often — Oracle still decides
      when a roll is called for and states its own expression.
    </p>
    {#if manager.session.dicePresets.length}
      <ul class="space-y-1">
        {#each manager.session.dicePresets as preset (preset.id)}
          <li class="flex items-center justify-between gap-2 text-sm">
            <span class="text-theme-primary"
              >{preset.label}: <code>{preset.expression}</code></span
            >
            <button
              type="button"
              class="flex min-h-8 min-w-8 items-center justify-center rounded-md border border-theme-border text-theme-secondary transition hover:bg-theme-danger/10 hover:text-theme-danger disabled:opacity-50"
              disabled={removingId === preset.id}
              onclick={() => void removePreset(preset.id)}
              aria-label="Remove preset {preset.label}"
            >
              <span class="icon-[lucide--x] h-3.5 w-3.5" aria-hidden="true"
              ></span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="flex flex-wrap gap-2">
      <input
        type="text"
        bind:value={presetLabel}
        placeholder="Label (e.g. Advantage)"
        aria-label="New preset label"
        class="min-h-10 flex-1 rounded-md border border-theme-border bg-theme-surface px-2 text-sm text-theme-primary"
      />
      <input
        type="text"
        bind:value={presetExpression}
        placeholder="Expression (e.g. 2d20kh1)"
        aria-label="New preset dice expression"
        class="min-h-10 flex-1 rounded-md border border-theme-border bg-theme-surface px-2 text-sm text-theme-primary"
      />
      <button
        type="button"
        class="min-h-10 rounded-md border border-theme-primary/50 px-3 text-sm text-theme-primary transition hover:bg-theme-primary/10 disabled:opacity-50"
        disabled={addingPreset}
        onclick={() => void addPreset()}
      >
        Save preset
      </button>
    </div>
    {#if presetError}<p class="text-sm text-theme-danger" role="alert">
        {presetError}
      </p>{/if}

    {#if manager.rollHistory.length}
      <h4 class="mt-2 text-sm font-medium text-theme-primary">Roll history</h4>
      <ol class="space-y-1 text-sm text-theme-secondary">
        {#each manager.rollHistory as entry (entry.turn.id)}
          <li>
            {#if entry.resolvedRoll.expression}<code
                >{entry.resolvedRoll.expression}</code
              >:{/if}
            {entry.resolvedRoll.outcome.label ??
              entry.resolvedRoll.outcome.value}
          </li>
        {/each}
      </ol>
    {/if}
  </section>
{/if}
