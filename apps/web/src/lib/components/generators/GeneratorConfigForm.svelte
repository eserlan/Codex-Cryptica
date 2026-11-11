<script lang="ts">
  import { listGenerators } from "generator-engine";
  import type { AIPolicy, GeneratorRunRequest } from "generator-engine";
  import type { GeneratorId } from "generator-engine";
  import GeneratorPicker from "./GeneratorPicker.svelte";
  import GeneratorOptions from "./GeneratorOptions.svelte";
  import GeneratorLanguagePicker from "./GeneratorLanguagePicker.svelte";
  import GeneratorRunControls from "./GeneratorRunControls.svelte";
  import {
    getNextOptionValues,
    getThemedChoices,
    reconcileOptionValues,
    stringOptionValue,
    updateOptionValues,
  } from "./generator-option-rules";
  import type { DetectedVaultLanguage } from "#lib/services/generators/generator-vault-context.js";
  import {
    GeneratorFavoritesStore,
    generatorFavoritesStore,
  } from "#lib/stores/ui/generator-favorites.svelte.js";
  import { systemProfileStore } from "#lib/stores/system-profile.svelte.js";

  interface Props {
    generatorId: GeneratorId | null;
    onsubmit: (
      req: Pick<
        GeneratorRunRequest,
        | "generatorId"
        | "options"
        | "useAI"
        | "instructions"
        | "primaryLanguageId"
      >,
    ) => void;
    disabled?: boolean;
    aiPolicy?: AIPolicy;
    categoryLabels?: Array<{ id: string; label: string }>;
    themeId?: string;
    languages?: DetectedVaultLanguage[];
    suggestedLanguageId?: string;
    favoritesStore?: GeneratorFavoritesStore;
  }

  let {
    generatorId = $bindable(null),
    onsubmit,
    disabled = false,
    aiPolicy,
    categoryLabels = [],
    themeId = "workspace",
    languages = [],
    suggestedLanguageId,
    favoritesStore = generatorFavoritesStore,
  }: Props = $props();

  const aiAvailable = $derived(
    !!(aiPolicy?.isEnabled && aiPolicy?.isAvailable),
  );

  let selectedId = $state<GeneratorId>(listGenerators()[0].id);
  let useAI = $state(true);
  let instructions = $state("");
  let primaryLanguageId = $state("");
  let optionValues = $state<Record<string, unknown>>({});
  let lastOptionsGeneratorId = $state<GeneratorId | null>(null);

  const supportsPrimaryLanguage = $derived(
    ["npc", "faction", "settlement", "ship"].includes(selectedId),
  );
  $effect(() => {
    if (generatorId) selectedId = generatorId;
  });

  $effect(() => {
    if (lastOptionsGeneratorId === selectedId) return;
    lastOptionsGeneratorId = selectedId;
    const isTovVault =
      systemProfileStore.vaultSystemId === "tales-of-the-valiant" ||
      systemProfileStore.isTalesOfTheValiant;
    optionValues = getNextOptionValues(selectedId, optionValues, isTovVault);
  });

  $effect(() => {
    optionValues = reconcileOptionValues(
      selectedId,
      optionValues,
      getThemedChoices(themeId, optionValues),
    );
  });

  function updateOptionValue(optionId: string, value: unknown) {
    optionValues = updateOptionValues(
      selectedId,
      optionValues,
      optionId,
      value,
      themeId,
    );
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    generatorId = selectedId;
    onsubmit({
      generatorId: selectedId,
      options: optionValues,
      useAI: aiAvailable && useAI,
      instructions: instructions.trim() || undefined,
      primaryLanguageId:
        supportsPrimaryLanguage && primaryLanguageId
          ? primaryLanguageId
          : undefined,
    });
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
  <GeneratorPicker
    bind:selectedId
    {generatorId}
    {favoritesStore}
    {categoryLabels}
    {themeId}
    {disabled}
  />

  <GeneratorOptions
    generatorId={selectedId}
    {optionValues}
    {themeId}
    {disabled}
    onvaluechange={updateOptionValue}
  />

  <GeneratorLanguagePicker
    bind:primaryLanguageId
    {supportsPrimaryLanguage}
    {languages}
    {suggestedLanguageId}
    {disabled}
  />

  <GeneratorRunControls
    bind:instructions
    bind:useAI
    {aiAvailable}
    {aiPolicy}
    gameSystem={stringOptionValue(optionValues, "gameSystem")}
    {disabled}
  />

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
