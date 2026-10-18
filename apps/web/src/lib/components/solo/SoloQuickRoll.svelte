<script lang="ts">
  import { diceEngine, diceParser } from "dice-engine";
  import { resolveQuickRoll } from "solo-session-engine";
  import { soloSessionStore } from "$lib/stores/solo-session-instance";
  import { diceHistory } from "$lib/stores/dice-history.svelte";

  let input = $state("");
  let result = $state<string | null>(null);
  let error = $state<string | null>(null);

  function submit() {
    error = null;
    const expression = resolveQuickRoll(
      input,
      soloSessionStore.session?.lastRoll ?? null,
    );
    if (!expression) return;

    try {
      const command = diceParser.parse(expression);
      const rolled = diceEngine.execute(command);
      void diceHistory.addResult(rolled, "modal", { label: "Quick roll" });
      soloSessionStore.recordRoll(expression);
      result = `${expression} → ${rolled.total}`;
      input = "";
    } catch {
      error = `"${expression}" is not a dice roll. Try d20 or 2d6+1.`;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }
</script>

<div class="flex min-w-0 items-center gap-2">
  <input
    type="text"
    class="min-w-0 w-28 rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text"
    placeholder="d20, 2d6+1"
    aria-label="Quick roll: dice expression"
    data-testid="solo-quick-roll-input"
    data-help-target="solo-quick-roll"
    bind:value={input}
    onkeydown={onKeydown}
  />
  {#if result}
    <span
      class="truncate text-sm font-bold text-theme-primary"
      data-testid="solo-quick-roll-result"
      aria-live="polite">{result}</span
    >
  {/if}
  {#if error}
    <span
      class="text-xs text-theme-danger"
      role="alert"
      data-testid="solo-quick-roll-error">{error}</span
    >
  {/if}
</div>
