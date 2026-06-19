<script lang="ts">
  const DEFAULT_MAX_CUSTOM_LENGTH = 120;

  interface Choice {
    value: string;
    label: string;
  }

  interface Props {
    id: string;
    name?: string;
    label: string;
    value?: string;
    choices: Choice[];
    disabled?: boolean;
    className?: string;
    labelClass?: string;
    inputClass?: string;
    customLabel?: string;
    customPlaceholder?: string;
    ownOptionLabel?: string;
    maxCustomLength?: number;
    describedBy?: string;
    onvaluechange?: (value: string) => void;
  }

  const CUSTOM_VALUE = "__custom__";

  let {
    id,
    name = id,
    label,
    value = $bindable(""),
    choices,
    disabled = false,
    className = "flex flex-col gap-1.5",
    labelClass,
    inputClass,
    customLabel,
    customPlaceholder = "Enter your own option",
    ownOptionLabel = "Own option",
    maxCustomLength = DEFAULT_MAX_CUSTOM_LENGTH,
    describedBy,
    onvaluechange,
  }: Props = $props();

  const builtInValues = $derived(choices.map((choice) => choice.value));
  let customSelected = $state(false);
  let lastAcceptedCustomValue = $state("");
  const isCustom = $derived(
    customSelected || (value.length > 0 && !builtInValues.includes(value)),
  );

  const selectValue = $derived(
    isCustom ? CUSTOM_VALUE : builtInValues.includes(value) ? value : "",
  );
  const inputId = $derived(`${id}-custom`);
  const customFieldLabel = $derived(customLabel ?? `${label} (Own option)`);

  function handleCustomInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement | null;
    if (!input) return;
    const nextValue = input.value;
    if (nextValue.length > maxCustomLength) {
      value = lastAcceptedCustomValue;
      input.value = lastAcceptedCustomValue;
      return;
    }
    value = nextValue;
    lastAcceptedCustomValue = nextValue;
    onvaluechange?.(value);
  }

  function handleSelectChange(event: Event) {
    const nextValue = (event.currentTarget as HTMLSelectElement).value;
    if (nextValue === CUSTOM_VALUE) {
      customSelected = true;
      if (builtInValues.includes(value)) {
        value = "";
        onvaluechange?.(value);
      }
      return;
    }
    customSelected = false;
    value = nextValue;
    lastAcceptedCustomValue = nextValue;
    onvaluechange?.(value);
  }
</script>

<div class={className}>
  <label for={id} class={labelClass}>{label}</label>
  <select
    id={id}
    {name}
    value={selectValue}
    onchange={handleSelectChange}
    {disabled}
    aria-describedby={describedBy}
    class={inputClass}
  >
    {#each choices as choice (choice.value)}
      <option value={choice.value}>{choice.label}</option>
    {/each}
    <option value={CUSTOM_VALUE}>{ownOptionLabel}</option>
  </select>

  {#if isCustom}
    <div class="flex flex-col gap-1.5">
      <label for={inputId} class={labelClass}>{customFieldLabel}</label>
      <input
        id={inputId}
        type="text"
        bind:value
        oninput={handleCustomInput}
        {disabled}
        aria-describedby={describedBy}
        class={inputClass}
        placeholder={customPlaceholder}
        maxlength={maxCustomLength}
      />
    </div>
  {/if}
</div>
