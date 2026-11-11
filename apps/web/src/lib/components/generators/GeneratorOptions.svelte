<script lang="ts">
  import {
    getGenerator,
    type GeneratorId,
    type GeneratorOptionDefinition,
  } from "generator-engine";
  import SelectWithCustomOption from "#lib/components/forms/SelectWithCustomOption.svelte";
  import {
    getThemedChoices,
    isOptionVisible,
    stringOptionValue,
  } from "./generator-option-rules";

  let {
    generatorId,
    optionValues,
    onvaluechange,
    themeId = "workspace",
    disabled = false,
  }: {
    generatorId: GeneratorId;
    optionValues: Record<string, unknown>;
    onvaluechange: (id: string, value: unknown) => void;
    themeId?: string;
    disabled?: boolean;
  } = $props();
  const visibleOptions = $derived(
    getGenerator(generatorId).options.filter((option) =>
      isOptionVisible(option, optionValues),
    ),
  );
  const themedChoices = $derived(getThemedChoices(themeId, optionValues));

  function choicesForOption(option: GeneratorOptionDefinition) {
    const themed = themedChoices[`${generatorId}:${option.id}`];
    return themed
      ? themed.map((value) => ({ value, label: value }))
      : (option.choices ?? []);
  }
  function stringValue(id: string) {
    return stringOptionValue(optionValues, id);
  }
  function numberValue(id: string): number | undefined {
    const value = optionValues[id];
    return typeof value === "number" ? value : undefined;
  }
</script>

{#if visibleOptions.length > 0}
  <fieldset class="flex flex-col gap-3">
    <legend
      class="mb-1 text-micro font-bold uppercase tracking-wider text-chrome-muted"
    >
      Generator options
    </legend>
    {#each visibleOptions as option (option.id)}
      {@const inputId = `generator-option-${option.id}`}
      {#if option.control === "select" && option.choices}
        <SelectWithCustomOption
          id={inputId}
          name={option.id}
          label={option.label}
          value={stringValue(option.id)}
          onvaluechange={(nextValue) => onvaluechange(option.id, nextValue)}
          choices={choicesForOption(option)}
          {disabled}
          className="flex flex-col gap-1.5"
          labelClass="text-micro font-bold uppercase tracking-wider text-chrome-muted"
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
              onvaluechange(
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
            class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >
            {option.label}
          </label>
          <textarea
            id={inputId}
            rows={3}
            value={stringValue(option.id)}
            oninput={(event) =>
              onvaluechange(
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
            class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >
            {option.label}
          </label>
          <input
            id={inputId}
            type="number"
            min={option.min}
            max={option.max}
            step={option.step}
            value={numberValue(option.id)}
            oninput={(event) => {
              const rawValue = (event.currentTarget as HTMLInputElement).value;
              onvaluechange(option.id, rawValue === "" ? "" : Number(rawValue));
            }}
            {disabled}
            class="w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-sm leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
          />
        </div>
      {:else}
        <div class="flex flex-col gap-1">
          <label
            for={inputId}
            class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >
            {option.label}
          </label>
          <input
            id={inputId}
            type="text"
            value={stringValue(option.id)}
            oninput={(event) =>
              onvaluechange(
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
