<script lang="ts">
  import { languageConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(languageConfig.genres[0]),
    tone = $bindable(""),
    role = $bindable(""),
    structure = $bindable(""),
    campaignContext = $bindable(""),
    genreLocked = false,
    genreLockedNote = undefined,
    onSurprise = undefined,
  }: {
    genre: string;
    tone: string;
    role: string;
    structure: string;
    campaignContext: string;
    /** Freeze the genre select (e.g. when arriving from a theme hub). */
    genreLocked?: boolean;
    genreLockedNote?: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<div class="flex flex-col gap-1.5">
  <SelectWithCustomOption
    id="language-genre-select"
    label="Genre"
    bind:value={genre}
    choices={languageConfig.genres.map((g: string) => ({ value: g, label: g }))}
    className="flex flex-col gap-1.5"
    {labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom genre"
    disabled={genreLocked}
  />
  {#if genreLocked && genreLockedNote}
    <p class="text-[10px] text-theme-text/60 leading-relaxed">
      {genreLockedNote}
    </p>
  {/if}
</div>

<SelectWithCustomOption
  id="language-tone-select"
  label="Tone & Sounds"
  bind:value={tone}
  choices={languageConfig.tones.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom sounds (e.g. guttural)"
/>

<SelectWithCustomOption
  id="language-role-select"
  label="Linguistic Role"
  bind:value={role}
  choices={languageConfig.roles.map((r: string) => ({ value: r, label: r }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom role"
/>

<SelectWithCustomOption
  id="language-structure-select"
  label="Name Structure"
  bind:value={structure}
  choices={languageConfig.structures.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom structure"
/>

<div class="flex flex-col gap-1.5">
  <label for="language-context" class={labelClass}
    >World context (optional)</label
  >
  <textarea
    id="language-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="language-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="language-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Describe who speaks this language or the region/culture it originates from.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      if (!genreLocked) genre = pickFrom(languageConfig.genres);
      tone = pickFrom(languageConfig.tones);
      role = pickFrom(languageConfig.roles);
      structure = pickFrom(languageConfig.structures);
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>
