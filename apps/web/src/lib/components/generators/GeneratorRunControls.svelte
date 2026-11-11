<script lang="ts">
  import type { AIPolicy } from "generator-engine";

  let {
    instructions = $bindable(""),
    useAI = $bindable(true),
    aiAvailable,
    aiPolicy,
    gameSystem = "",
    disabled = false,
  }: {
    instructions?: string;
    useAI?: boolean;
    aiAvailable: boolean;
    aiPolicy?: AIPolicy;
    gameSystem?: string;
    disabled?: boolean;
  } = $props();

  const aiUnavailableReason = $derived(
    aiPolicy && (!aiPolicy.isEnabled || !aiPolicy.isAvailable)
      ? !aiPolicy.isEnabled
        ? "AI generation is disabled. Content will be generated locally."
        : "AI generation requires an account. Content will be generated locally."
      : null,
  );
</script>

<div class="flex flex-col gap-1">
  <label
    for="gen-instructions"
    class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
  >
    Instructions <span class="normal-case font-normal">(optional)</span>
  </label>
  <textarea
    id="gen-instructions"
    bind:value={instructions}
    {disabled}
    rows={3}
    placeholder="e.g. Make them a spy working for the Thieves Guild, female, morally grey…"
    class="w-full resize-none rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition placeholder:text-chrome-muted/60 focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
  ></textarea>
</div>

{#if aiAvailable}
  <label class="flex cursor-pointer items-center gap-2">
    <input
      type="checkbox"
      bind:checked={useAI}
      {disabled}
      class="accent-chrome-accent"
      data-testid="use-ai-toggle"
    />
    <span class="text-sm text-chrome-text">Use AI generation</span>
  </label>
{:else if aiUnavailableReason}
  <div class="flex flex-col gap-2">
    <p
      class="rounded border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-400"
      data-testid="ai-unavailable-notice"
    >
      {aiUnavailableReason}
    </p>
    {#if gameSystem === "tales-of-the-valiant"}
      <p
        class="rounded border border-amber-800/30 bg-amber-950/20 px-3 py-2 text-micro leading-relaxed text-amber-300"
        data-testid="tov-offline-notice"
      >
        Tales of the Valiant mechanics require AI Lore generation. Content will
        be generated using neutral lore tables.
      </p>
    {/if}
  </div>
{/if}
