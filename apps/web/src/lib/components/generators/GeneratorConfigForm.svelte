<script lang="ts">
  import { listGenerators } from "generator-engine";
  import type {
    AIPolicy,
    GeneratorId,
    GeneratorRunRequest,
  } from "generator-engine";

  interface Props {
    generatorId: GeneratorId | null;
    onsubmit: (
      req: Pick<
        GeneratorRunRequest,
        "generatorId" | "options" | "useAI" | "instructions"
      >,
    ) => void;
    disabled?: boolean;
    aiPolicy?: AIPolicy;
  }

  let {
    generatorId = $bindable(null),
    onsubmit,
    disabled = false,
    aiPolicy,
  }: Props = $props();

  const aiAvailable = $derived(
    !!(aiPolicy?.isEnabled && aiPolicy?.isAvailable),
  );

  const aiUnavailableReason = $derived(
    aiPolicy && (!aiPolicy.isEnabled || !aiPolicy.isAvailable)
      ? !aiPolicy.isEnabled
        ? "AI generation is disabled. Content will be generated locally."
        : "AI generation requires an account. Content will be generated locally."
      : null,
  );

  const generators = listGenerators();

  let selectedId = $state<GeneratorId>(generators[0].id);
  let useAI = $state(true);
  let instructions = $state("");
  $effect(() => {
    if (generatorId) selectedId = generatorId;
  });

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    generatorId = selectedId;
    onsubmit({
      generatorId: selectedId,
      options: {},
      useAI: aiAvailable && useAI,
      instructions: instructions.trim() || undefined,
    });
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
  <fieldset class="flex flex-col gap-2">
    <legend
      class="mb-1 text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
    >
      Generator
    </legend>
    {#each generators as gen (gen.id)}
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="generator"
          value={gen.id}
          bind:group={selectedId}
          {disabled}
          class="accent-chrome-accent"
        />
        <span class="text-sm text-chrome-text">{gen.label}</span>
      </label>
    {/each}
  </fieldset>

  <div class="flex flex-col gap-1">
    <label
      for="gen-instructions"
      class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
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
    <p
      class="rounded border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-400"
      data-testid="ai-unavailable-notice"
    >
      {aiUnavailableReason}
    </p>
  {/if}

  <div class="flex justify-end border-t border-chrome-border pt-4">
    <button
      type="submit"
      {disabled}
      class="px-5 py-2 bg-chrome-accent text-chrome-surface font-bold uppercase tracking-wider text-xs rounded-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
    >
      Generate
    </button>
  </div>
</form>
