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
      req: Pick<GeneratorRunRequest, "generatorId" | "options" | "useAI">,
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

  const aiUnavailableReason = $derived(
    aiPolicy && (!aiPolicy.isEnabled || !aiPolicy.isAvailable)
      ? !aiPolicy.isEnabled
        ? "AI generation is disabled. Content will be generated locally."
        : "AI is currently unavailable. Content will be generated locally."
      : null,
  );

  const generators = listGenerators();

  let selectedId = $state<GeneratorId>(generators[0].id);
  $effect(() => {
    if (generatorId) selectedId = generatorId;
  });

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    generatorId = selectedId;
    onsubmit({ generatorId: selectedId, options: {}, useAI: false });
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
  {#if aiUnavailableReason}
    <p
      class="text-amber-400 rounded border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-xs"
      data-testid="ai-unavailable-notice"
    >
      {aiUnavailableReason}
    </p>
  {/if}

  <fieldset class="flex flex-col gap-2">
    <legend class="text-surface-300 mb-1 text-sm font-medium">Generator</legend>
    {#each generators as gen (gen.id)}
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="generator"
          value={gen.id}
          bind:group={selectedId}
          {disabled}
          class="accent-primary-500"
        />
        <span class="text-surface-100 text-sm">{gen.label}</span>
      </label>
    {/each}
  </fieldset>

  <button
    type="submit"
    {disabled}
    class="bg-primary-600 hover:bg-primary-500 disabled:bg-surface-600 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
  >
    Generate
  </button>
</form>
