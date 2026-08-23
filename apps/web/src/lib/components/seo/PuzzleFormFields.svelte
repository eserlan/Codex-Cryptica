<script lang="ts">
  import { puzzleConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(puzzleConfig.genres[0]),
    purpose = $bindable(puzzleConfig.purposes[0]),
    difficulty = $bindable(puzzleConfig.difficulties[0]),
    style = $bindable(puzzleConfig.styles[0]),
    partyLevel = $bindable(""),
    playerCount = $bindable(""),
    capabilities = $bindable(""),
    spotlight = $bindable(puzzleConfig.spotlights[0]),
    failureStyle = $bindable(puzzleConfig.failureStyles[0]),
    system = $bindable(puzzleConfig.systems[0]),
    downstreamConsequence = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    genre: string;
    purpose: string;
    difficulty: string;
    style: string;
    partyLevel: string;
    playerCount: string;
    capabilities: string;
    spotlight: string;
    failureStyle: string;
    system: string;
    downstreamConsequence: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";
  const choices = (values: readonly string[]) =>
    values.map((value) => ({ value, label: value }));
</script>

<SelectWithCustomOption
  id="puzzle-genre"
  label="Genre"
  bind:value={genre}
  choices={choices(puzzleConfig.genres)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
/>
<SelectWithCustomOption
  id="puzzle-purpose"
  label="Puzzle purpose"
  bind:value={purpose}
  choices={choices(puzzleConfig.purposes)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom purpose"
/>
<SelectWithCustomOption
  id="puzzle-difficulty"
  label="Difficulty"
  bind:value={difficulty}
  choices={choices(puzzleConfig.difficulties)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom difficulty"
/>
<SelectWithCustomOption
  id="puzzle-style"
  label="Puzzle style"
  bind:value={style}
  choices={choices(puzzleConfig.styles)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom style"
/>
<SelectWithCustomOption
  id="puzzle-spotlight"
  label="Desired spotlight"
  bind:value={spotlight}
  choices={choices(puzzleConfig.spotlights)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom spotlight"
/>
<SelectWithCustomOption
  id="puzzle-failure"
  label="Failure style"
  bind:value={failureStyle}
  choices={choices(puzzleConfig.failureStyles)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom failure style"
/>
<SelectWithCustomOption
  id="puzzle-system"
  label="System tailoring"
  bind:value={system}
  choices={choices(puzzleConfig.systems)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom system"
/>

<div class="grid gap-3 sm:grid-cols-2">
  <div class="flex flex-col gap-1.5">
    <label for="puzzle-party-level" class={labelClass}
      >Party level or competence</label
    ><input
      id="puzzle-party-level"
      name="party_level"
      bind:value={partyLevel}
      class={selectClass}
    />
  </div>
  <div class="flex flex-col gap-1.5">
    <label for="puzzle-player-count" class={labelClass}>Number of players</label
    ><input
      id="puzzle-player-count"
      name="player_count"
      bind:value={playerCount}
      inputmode="numeric"
      class={selectClass}
    />
  </div>
</div>

<div class="flex flex-col gap-1.5">
  <label for="puzzle-capabilities" class={labelClass}
    >PC capabilities to make matter</label
  ><textarea
    id="puzzle-capabilities"
    name="capabilities"
    bind:value={capabilities}
    maxlength="4000"
    rows="3"
    aria-describedby="puzzle-capabilities-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="puzzle-capabilities-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add concepts, abilities, spells, or skills. They create opportunities, never
    requirements.
  </p>
</div>
<div class="flex flex-col gap-1.5">
  <label for="puzzle-consequence" class={labelClass}
    >Optional downstream consequence</label
  ><textarea
    id="puzzle-consequence"
    name="downstream_consequence"
    bind:value={downstreamConsequence}
    maxlength="4000"
    rows="3"
    aria-describedby="puzzle-consequence-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="puzzle-consequence-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    For example: the boss loses a shield or reinforcements never arrive.
  </p>
</div>
<div class="flex flex-col gap-1.5">
  <label for="puzzle-context" class={labelClass}
    >Optional campaign context</label
  ><textarea
    id="puzzle-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="puzzle-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="puzzle-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a location, villain, or situation to ground this encounter.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      purpose = pickFrom(puzzleConfig.purposes);
      difficulty = pickFrom(puzzleConfig.difficulties);
      style = pickFrom(puzzleConfig.styles);
      spotlight = pickFrom(puzzleConfig.spotlights);
      failureStyle = pickFrom(puzzleConfig.failureStyles);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize puzzle options and generate a draft"
    ><span class="icon-[lucide--dices] w-3.5 h-3.5"></span> Surprise Me</button
  >
</div>
