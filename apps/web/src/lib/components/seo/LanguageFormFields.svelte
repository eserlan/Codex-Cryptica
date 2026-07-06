<script lang="ts">
  import { languageConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(languageConfig.genres[0]),
    tone = $bindable(""),
    role = $bindable(""),
    structure = $bindable(""),
    campaignContext = $bindable(""),
    preserveGenreOnSurprise = false,
    onSurprise = undefined,
  }: {
    genre: string;
    tone: string;
    role: string;
    structure: string;
    campaignContext: string;
    /**
     * Keep the current genre when Surprise Me randomizes the other fields
     * (e.g. when the genre was seeded from a theme hub). The select itself
     * stays editable.
     */
    preserveGenreOnSurprise?: boolean;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full min-h-12 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
  const helpClass =
    "text-sm text-theme-text/70 leading-6 md:text-[13px] md:leading-relaxed -mt-0.5 text-wrap-pretty";

  // Jargon-y select values get a one-line, live-updating example so users
  // don't have to guess what e.g. "Suffix-heavy" sounds like in practice.
  // Custom (user-typed) values intentionally have no entry here.
  const TONE_HELP: Record<string, string> = {
    "Harsh & Consonant-heavy":
      "Clustered consonants, few soft vowels — e.g. Krathdur, Voxgrim.",
    "Lyrical & Vowel-rich":
      "Flowing, vowel-forward and musical — e.g. Aeliana, Ioreth.",
    "Ancient & Formal": "Weighty and archaic-sounding — e.g. Phaeros, Thalor.",
    "Clipped & Technical": "Short, precise syllables — e.g. Tek-9, Din-4, Bok.",
    "Shadowy & Whispered": "Soft, hushed sounds — e.g. Shael, Fhess, Lhurin.",
  };

  const ROLE_HELP: Record<string, string> = {
    "Common Speech": "Everyday language spoken by most people in this world.",
    "Sacred / Ritual Tongue":
      "Used only in ceremonies, prayer, or by clergy — not everyday speech.",
    "Imperial Standard":
      "The official language of a ruling power, spoken across its territory.",
    "Thieves' Cant":
      "A coded slang used by outlaws, spies, or a criminal underworld.",
    "Dead Language":
      "No longer spoken day-to-day — survives in old texts, names, or lore.",
  };

  const STRUCTURE_HELP: Record<string, string> = {
    "Compound Words":
      "Two whole words fused together — e.g. Ironhold, Stormcaller.",
    "Suffix-heavy":
      "A root plus a meaningful ending — e.g. Thal → Thalien, Thalwen.",
    "Prefix-heavy":
      "A meaningful lead-in plus a root — e.g. Kor-Vash, Kor-Dun.",
    "Short & Monosyllabic": "Clipped, single-syllable names — e.g. Vex, Dru.",
  };
</script>

<div class="flex flex-col gap-1.5">
  <label for="language-genre-select" class={labelClass}>Genre</label>
  <select id="language-genre-select" bind:value={genre} class={selectClass}>
    {#each languageConfig.genres as g (g)}
      <option value={g}>{g}</option>
    {/each}
  </select>
</div>

<SelectWithCustomOption
  id="language-tone-select"
  label="Tone & Sounds"
  bind:value={tone}
  choices={languageConfig.tones.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  describedBy={TONE_HELP[tone] ? "language-tone-help" : undefined}
  customPlaceholder="Enter custom sounds (e.g. guttural)"
/>
{#if TONE_HELP[tone]}
  <p id="language-tone-help" class={helpClass}>{TONE_HELP[tone]}</p>
{/if}

<SelectWithCustomOption
  id="language-role-select"
  label="Linguistic Role"
  bind:value={role}
  choices={languageConfig.roles.map((r: string) => ({ value: r, label: r }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  describedBy={ROLE_HELP[role] ? "language-role-help" : undefined}
  customPlaceholder="Enter custom role"
/>
{#if ROLE_HELP[role]}
  <p id="language-role-help" class={helpClass}>{ROLE_HELP[role]}</p>
{/if}

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
  describedBy={STRUCTURE_HELP[structure]
    ? "language-structure-help"
    : undefined}
  customPlaceholder="Enter custom structure"
/>
{#if STRUCTURE_HELP[structure]}
  <p id="language-structure-help" class={helpClass}>
    {STRUCTURE_HELP[structure]}
  </p>
{/if}

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
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm leading-6 text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="language-context-help"
    class="text-sm text-theme-text/70 leading-6 md:text-[13px] md:leading-relaxed text-wrap-pretty"
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
      if (!preserveGenreOnSurprise) genre = pickFrom(languageConfig.genres);
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
