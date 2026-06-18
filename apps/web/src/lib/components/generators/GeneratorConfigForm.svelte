<script lang="ts">
  import {
    getGenerator,
    listGenerators,
  } from "generator-engine";
  import type {
    AIPolicy,
    GeneratorId,
    GeneratorRunRequest,
  } from "generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

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
    categoryLabels?: Array<{ id: string; label: string }>;
  }

  let {
    generatorId = $bindable(null),
    onsubmit,
    disabled = false,
    aiPolicy,
    categoryLabels = [],
  }: Props = $props();

  function resolveLabel(gen: { label: string; entityType: string }): string {
    const match = categoryLabels.find((c) => c.id === gen.entityType);
    return match?.label ?? gen.label;
  }

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
  let optionValues = $state<Record<string, unknown>>({});
  let lastOptionsGeneratorId = $state<GeneratorId | null>(null);
  const selectedGenerator = $derived(getGenerator(selectedId));
  $effect(() => {
    if (generatorId) selectedId = generatorId;
  });
  $effect(() => {
    if (lastOptionsGeneratorId === selectedId) return;
    lastOptionsGeneratorId = selectedId;
    const definition = getGenerator(selectedId);
    const previousValues = optionValues;
    optionValues = Object.fromEntries(
      definition.options.map((option: { id: string; defaultValue?: unknown }) => [
        option.id,
        typeof previousValues[option.id] !== "undefined"
          ? previousValues[option.id]
          : (definition.defaults[option.id] ?? option.defaultValue ?? ""),
      ]),
    );
  });

  function updateOptionValue(optionId: string, value: unknown) {
    optionValues = {
      ...optionValues,
      [optionId]: value,
    };
  }

  function stringValue(optionId: string): string {
    const value = optionValues[optionId];
    return typeof value === "string" ? value : "";
  }

  function numberValue(optionId: string): number | undefined {
    const value = optionValues[optionId];
    return typeof value === "number" ? value : undefined;
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    generatorId = selectedId;
    onsubmit({
      generatorId: selectedId,
      options: optionValues,
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
        <span class="text-sm text-chrome-text">{resolveLabel(gen)}</span>
      </label>
    {/each}
  </fieldset>

  {#if selectedGenerator.options.length > 0}
    <fieldset class="flex flex-col gap-3">
      <legend
        class="mb-1 text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
      >
        Generator options
      </legend>
      {#each selectedGenerator.options as option (option.id)}
        {@const inputId = `generator-option-${option.id}`}
        {#if option.control === "select" && option.choices}
          <SelectWithCustomOption
            id={inputId}
            name={option.id}
            label={option.label}
            value={stringValue(option.id)}
            onvaluechange={(nextValue) =>
              updateOptionValue(option.id, nextValue)}
            choices={option.choices}
            disabled={disabled}
            className="flex flex-col gap-1.5"
            labelClass="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
            inputClass="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
            customPlaceholder={`Enter a custom ${option.label.toLowerCase()}`}
          />
        {:else if option.control === "checkbox"}
          <label class="flex cursor-pointer items-center gap-2">
            <input
              id={inputId}
              type="checkbox"
              checked={Boolean(optionValues[option.id])}
              onchange={(event) =>
                updateOptionValue(
                  option.id,
                  (event.currentTarget as HTMLInputElement).checked,
                )}
              {disabled}
              class="accent-chrome-accent"
            />
            <span class="text-sm text-chrome-text">{option.label}</span>
          </label>
        {:else if option.control === "textarea"}
          <div class="flex flex-col gap-1">
            <label
              for={inputId}
              class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
            >
              {option.label}
            </label>
            <textarea
              id={inputId}
              rows={3}
              value={stringValue(option.id)}
              oninput={(event) =>
                updateOptionValue(
                  option.id,
                  (event.currentTarget as HTMLTextAreaElement).value,
                )}
              {disabled}
              class="w-full resize-y rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
            ></textarea>
          </div>
        {:else if option.control === "number"}
          <div class="flex flex-col gap-1">
            <label
              for={inputId}
              class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
            >
              {option.label}
            </label>
            <input
              id={inputId}
              type="number"
              value={numberValue(option.id)}
              oninput={(event) => {
                const rawValue = (event.currentTarget as HTMLInputElement).value;
                updateOptionValue(
                  option.id,
                  rawValue === "" ? "" : Number(rawValue),
                );
              }}
              {disabled}
              class="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
            />
          </div>
        {:else}
          <div class="flex flex-col gap-1">
            <label
              for={inputId}
              class="text-[10px] font-bold uppercase tracking-wider text-chrome-muted"
            >
              {option.label}
            </label>
            <input
              id={inputId}
              type="text"
              value={stringValue(option.id)}
              oninput={(event) =>
                updateOptionValue(
                  option.id,
                  (event.currentTarget as HTMLInputElement).value,
                )}
              {disabled}
              class="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
            />
          </div>
        {/if}
      {/each}
    </fieldset>
  {/if}

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
