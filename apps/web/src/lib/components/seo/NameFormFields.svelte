<script lang="ts">
  import {
    nameGeneratorConfig,
    factionConfig,
  } from "$lib/services/seo/generator-config";
  import { untrack } from "svelte";
  import { culturesForTheme } from "./quick-names";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    showTheme = false,
    culture = $bindable(nameGeneratorConfig.cultures[0]),
    gender = $bindable(nameGeneratorConfig.genders[0]),
    nameType = $bindable(nameGeneratorConfig.nameTypes[0]),
    context = $bindable(""),
    collapseAdvanced = false,
    fixedTheme,
  }: {
    theme?: string;
    showTheme?: boolean;
    /** Tuck presentation and campaign context behind "More options". */
    collapseAdvanced?: boolean;
    /** Limit cultures to one genre without showing the genre picker. */
    fixedTheme?: string;
    culture: string;
    gender: string;
    nameType: string;
    context: string;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-micro font-bold uppercase tracking-wider text-theme-text/80";

  const cultureTheme = $derived(fixedTheme ?? (showTheme ? theme : undefined));
  const activeCultures = $derived(culturesForTheme(cultureTheme));
  const builtInCultures = nameGeneratorConfig.cultures;
  // Context that arrives pre-filled stays visible rather than hidden.
  const advancedOpen = untrack(() => context.trim() !== "");

  $effect(() => {
    if (builtInCultures.includes(culture) && !activeCultures.includes(culture))
      culture = activeCultures[0];
  });
</script>

{#if showTheme}
  <SelectWithCustomOption
    id="name-theme-select"
    label="Choose a vibe"
    bind:value={theme}
    choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
    className="flex flex-col gap-1.5"
    {labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom vibe"
  />
{/if}

<SelectWithCustomOption
  id="culture-select"
  label="Culture / Style"
  bind:value={culture}
  choices={activeCultures.map((c: string) => ({ value: c, label: c }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom culture or style"
/>

<SelectWithCustomOption
  id="name-type-select"
  label="Name Type"
  bind:value={nameType}
  choices={nameGeneratorConfig.nameTypes.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom name type"
/>

{#snippet advancedFields()}
  <SelectWithCustomOption
    id="gender-select"
    label="Gender / Presentation"
    bind:value={gender}
    choices={nameGeneratorConfig.genders.map((g: string) => ({
      value: g,
      label: g,
    }))}
    className="flex flex-col gap-1.5"
    {labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom gender or presentation"
  />

  <div class="flex flex-col gap-1.5">
    <label for="name-context" class={labelClass}>Add campaign context</label>
    <textarea
      id="name-context"
      name="context"
      bind:value={context}
      maxlength="4000"
      rows="3"
      placeholder="e.g. &quot;Assyrian&quot;, &quot;a reclusive mage&quot;, &quot;harsh and guttural&quot;"
      aria-describedby="name-context-help"
      class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
    ></textarea>
    <p id="name-context-help" class="sr-only">
      Steer the results with a description, a real-world linguistic flavour such
      as Assyrian or Old Norse, or a vibe such as harsh and guttural.
    </p>
  </div>
{/snippet}

{#if collapseAdvanced}
  <details
    open={advancedOpen}
    class="group rounded-lg border border-theme-border/50 px-3 py-2"
  >
    <summary
      class="flex cursor-pointer list-none items-center justify-between gap-2 {labelClass}"
    >
      More options: presentation and campaign context
      <span
        class="icon-[lucide--chevron-down] h-4 w-4 transition-transform group-open:rotate-180"
        aria-hidden="true"
      ></span>
    </summary>
    <div class="mt-3 flex flex-col gap-4">
      {@render advancedFields()}
    </div>
  </details>
{:else}
  {@render advancedFields()}
{/if}
