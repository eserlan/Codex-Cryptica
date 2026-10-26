<script lang="ts">
  import {
    oneShotConfig,
    pickFrom,
  } from "#lib/services/seo/generator-config.js";
  import SelectWithCustomOption from "#lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(oneShotConfig.genres[0]),
    system = $bindable(oneShotConfig.systems[0]),
    durationHours = $bindable("3"),
    partySize = $bindable("4"),
    partyLevel = $bindable(""),
    emphasis = $bindable(oneShotConfig.emphases[0]),
    structure = $bindable(oneShotConfig.structures[1]),
    tone = $bindable(""),
    premise = $bindable(""),
    boundaries = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    genre: string;
    system: string;
    durationHours: string;
    partySize: string;
    partyLevel: string;
    emphasis: string;
    structure: string;
    tone: string;
    premise: string;
    boundaries: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-meta font-bold uppercase tracking-wider text-theme-text/80";
  const textClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";

  const hasSystem = $derived(system !== "System-neutral");
</script>

<SelectWithCustomOption
  id="one-shot-genre-select"
  label="Genre"
  bind:value={genre}
  choices={oneShotConfig.genres.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
/>

<div class="flex flex-col gap-1.5">
  <label for="one-shot-duration-select" class={labelClass}>Session length</label
  >
  <select
    id="one-shot-duration-select"
    bind:value={durationHours}
    class={selectClass}
  >
    {#each oneShotConfig.durations as hours (hours)}
      <option value={String(hours)}>{hours} hours</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="one-shot-party-size-select" class={labelClass}>Players</label>
  <select
    id="one-shot-party-size-select"
    bind:value={partySize}
    class={selectClass}
  >
    {#each oneShotConfig.partySizes as size (size)}
      <option value={String(size)}>{size} players</option>
    {/each}
  </select>
</div>

<SelectWithCustomOption
  id="one-shot-emphasis-select"
  label="Adventure emphasis"
  bind:value={emphasis}
  choices={oneShotConfig.emphases.map((e: string) => ({ value: e, label: e }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom emphasis"
/>

<details class="group rounded-lg border border-theme-border/60 px-3 py-2">
  <summary
    class="cursor-pointer text-meta font-bold uppercase tracking-wider text-theme-text/80"
  >
    Advanced options
  </summary>
  <div class="mt-3 flex flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <label for="one-shot-structure-select" class={labelClass}>Structure</label
      >
      <select
        id="one-shot-structure-select"
        bind:value={structure}
        class={selectClass}
      >
        {#each oneShotConfig.structures as option (option)}
          <option value={option}>{option}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="one-shot-system-select" class={labelClass}>System</label>
      <select
        id="one-shot-system-select"
        bind:value={system}
        class={selectClass}
      >
        {#each oneShotConfig.systems as option (option)}
          <option value={option}>{option}</option>
        {/each}
      </select>
      <p class="text-micro text-theme-muted leading-relaxed">
        The adventure never includes stat blocks, DCs or rules text. You add the
        mechanics for your system.
      </p>
    </div>

    {#if hasSystem}
      <div class="flex flex-col gap-1.5">
        <label for="one-shot-party-level" class={labelClass}
          >Level or tier</label
        >
        <input
          id="one-shot-party-level"
          type="text"
          bind:value={partyLevel}
          maxlength="40"
          placeholder="e.g. Level 3"
          class={textClass}
        />
      </div>
    {/if}

    <div class="flex flex-col gap-1.5">
      <label for="one-shot-tone" class={labelClass}>Tone</label>
      <input
        id="one-shot-tone"
        type="text"
        bind:value={tone}
        maxlength="80"
        placeholder="e.g. Tense and darkly funny"
        class={textClass}
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="one-shot-premise" class={labelClass}>Starting premise</label>
      <textarea
        id="one-shot-premise"
        bind:value={premise}
        maxlength="1000"
        rows="2"
        class="{textClass} resize-y"
      ></textarea>
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="one-shot-boundaries" class={labelClass}
        >Content boundaries</label
      >
      <textarea
        id="one-shot-boundaries"
        bind:value={boundaries}
        maxlength="500"
        rows="2"
        placeholder="Anything to leave out"
        class="{textClass} resize-y"
      ></textarea>
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="one-shot-campaign-context" class={labelClass}
        >Optional campaign context</label
      >
      <textarea
        id="one-shot-campaign-context"
        bind:value={campaignContext}
        maxlength="4000"
        rows="3"
        class="{textClass} min-h-20 resize-y"
      ></textarea>
    </div>
  </div>
</details>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      emphasis = pickFrom(oneShotConfig.emphases);
      structure = pickFrom(oneShotConfig.structures);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-micro font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Pick a random emphasis and structure and generate a draft"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>
