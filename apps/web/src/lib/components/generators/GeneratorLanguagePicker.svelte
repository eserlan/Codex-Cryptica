<script lang="ts">
  import type { DetectedVaultLanguage } from "#lib/services/generators/generator-vault-context.js";

  let {
    primaryLanguageId = $bindable(""),
    supportsPrimaryLanguage,
    languages,
    suggestedLanguageId,
    disabled = false,
  }: {
    primaryLanguageId?: string;
    supportsPrimaryLanguage: boolean;
    languages: DetectedVaultLanguage[];
    suggestedLanguageId?: string;
    disabled?: boolean;
  } = $props();
  const suggestedLanguage = $derived(
    languages.find((language) => language.id === suggestedLanguageId),
  );
</script>

{#if supportsPrimaryLanguage && languages.length}
  <div class="flex flex-col gap-1.5">
    <label
      for="generator-primary-language"
      class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
    >
      Naming language
    </label>
    <select
      id="generator-primary-language"
      name="primaryLanguageId"
      bind:value={primaryLanguageId}
      aria-describedby="generator-primary-language-help"
      {disabled}
      class="min-h-12 w-full rounded border border-chrome-border bg-chrome-bg/50 px-3 py-2 text-base leading-relaxed text-chrome-text outline-none transition focus:border-chrome-accent focus:ring-1 focus:ring-chrome-accent disabled:opacity-50"
    >
      <option value="">No saved language</option>
      {#each languages as language (language.id)}
        <option value={language.id}>
          {language.title}{language.legacy ? " (legacy notes)" : ""}
        </option>
      {/each}
    </select>
    <p
      id="generator-primary-language-help"
      class="text-xs leading-relaxed text-chrome-muted"
    >
      {#if suggestedLanguage && !primaryLanguageId}
        Suggested from the source relationship: {suggestedLanguage.title}.
        Select it above to apply its rules.
      {:else if primaryLanguageId}
        Only this language supplies authoritative naming and terminology rules.
      {:else}
        No saved language rules will be applied.
      {/if}
    </p>
  </div>
{/if}
