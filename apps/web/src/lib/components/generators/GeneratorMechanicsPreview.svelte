<script lang="ts">
  import type { GeneratorMechanicsBundle } from "generator-engine";

  type QuickNpcData = Extract<
    GeneratorMechanicsBundle,
    { kind: "tov-quick-npc" }
  >["data"];
  type CreatureData = Extract<
    GeneratorMechanicsBundle,
    { kind: "tov-creature" }
  >["data"];

  interface Props {
    mechanics: GeneratorMechanicsBundle;
  }

  let { mechanics }: Props = $props();

  const isHomebrew = $derived(
    mechanics.isHomebrew ||
      (mechanics.kind === "tov-quick-npc" && mechanics.data.isHomebrew) ||
      (mechanics.kind === "tov-character" && mechanics.data.isHomebrew) ||
      (mechanics.kind === "tov-creature" &&
        (mechanics.data.isHomebrew ||
          mechanics.data.traits?.some((t) => t.isHomebrew) ||
          mechanics.data.actions?.some((a) => a.isHomebrew))) ||
      (mechanics.kind === "tov-magic-item" && mechanics.data.isHomebrew) ||
      (mechanics.kind === "tov-encounter" &&
        (mechanics.data.isHomebrew ||
          mechanics.data.suggestedCreatures?.some((c) => c.isHomebrew))),
  );

  function formatMod(mod: number): string {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  function calcMod(score: number): number {
    return Math.floor((score - 10) / 2);
  }
</script>

<div
  class="flex flex-col gap-3 rounded-lg border border-chrome-border bg-chrome-bg/40 p-3.5 text-xs text-chrome-text"
  data-testid="generator-mechanics-preview"
>
  <!-- Header: System badge & Homebrew indicator -->
  <div
    class="flex flex-wrap items-center justify-between gap-2 border-b border-chrome-border/60 pb-2"
  >
    <div class="flex items-center gap-2">
      <span
        aria-hidden="true"
        class="icon-[lucide--shield-check] h-4 w-4 text-chrome-accent"
      ></span>
      <span
        class="font-bold uppercase tracking-wider text-chrome-accent text-micro"
      >
        Tales of the Valiant (BFRD)
      </span>
      {#if mechanics.kind === "tov-quick-npc"}
        <span
          class="rounded bg-chrome-bg/80 px-2 py-0.5 text-micro font-medium text-chrome-muted"
        >
          Quick NPC
        </span>
      {:else if mechanics.kind === "tov-character"}
        <span
          class="rounded bg-chrome-bg/80 px-2 py-0.5 text-micro font-medium text-chrome-muted"
        >
          Leveled Character
        </span>
      {:else if mechanics.kind === "tov-creature"}
        <span
          class="rounded bg-chrome-bg/80 px-2 py-0.5 text-micro font-medium text-chrome-muted"
        >
          Creature / Monster
        </span>
      {:else if mechanics.kind === "tov-magic-item"}
        <span
          class="rounded bg-chrome-bg/80 px-2 py-0.5 text-micro font-medium text-chrome-muted"
        >
          Magic Item
        </span>
      {:else if mechanics.kind === "tov-encounter"}
        <span
          class="rounded bg-chrome-bg/80 px-2 py-0.5 text-micro font-medium text-chrome-muted"
        >
          Encounter Guidance
        </span>
      {/if}
    </div>

    {#if isHomebrew}
      <span
        class="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-micro font-bold uppercase tracking-wider text-amber-300"
        data-testid="homebrew-gm-review-badge"
      >
        <span aria-hidden="true" class="icon-[lucide--alert-triangle] h-3 w-3"
        ></span>
        GM Review
      </span>
    {/if}
  </div>

  {#snippet quickNpcPreview(data: QuickNpcData)}
    <!-- Combat Vitals -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >CR</span
        >
        <span class="text-sm font-bold text-chrome-text">{data.cr}</span>
      </div>
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >AC</span
        >
        <span class="text-sm font-bold text-chrome-text">{data.ac}</span>
      </div>
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >HP</span
        >
        <span class="text-sm font-bold text-chrome-text">{data.hp}</span>
        <span class="text-micro text-chrome-muted">({data.hitDice})</span>
      </div>
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >Speed</span
        >
        <span class="text-sm font-bold text-chrome-text">{data.speed}</span>
      </div>
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >Luck</span
        >
        <span class="text-sm font-bold text-chrome-text">{data.luck ?? 0}</span>
      </div>
    </div>

    <!-- Primary Attack -->
    <div
      class="flex flex-wrap items-center gap-2 rounded border border-chrome-border/40 bg-chrome-bg/50 px-3 py-2"
    >
      <span
        class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
        >Attack:</span
      >
      <span class="font-bold text-chrome-text">{data.attackName}</span>
      <span
        class="inline-flex items-center gap-1 rounded bg-chrome-accent/10 px-2 py-0.5 text-xs font-mono font-medium text-chrome-accent"
      >
        <span aria-hidden="true" class="icon-[lucide--dices] h-3 w-3"></span>
        {data.attackFormula}
      </span>
      <span class="text-chrome-muted">Hit:</span>
      <span
        class="inline-flex items-center gap-1 rounded bg-chrome-bg/80 px-2 py-0.5 text-xs font-mono text-chrome-text"
      >
        {data.damageFormula}
        {data.damageType}
      </span>
    </div>

    <!-- Ability Scores -->
    {#if data.abilityScores}
      <div class="grid grid-cols-6 gap-1 text-center font-mono text-xs">
        {#each Object.entries(data.abilityScores) as [stat, score]}
          <div
            class="rounded border border-chrome-border/30 bg-chrome-bg/40 py-1"
          >
            <span
              class="block text-micro font-bold uppercase text-chrome-muted font-sans"
              >{stat}</span
            >
            <span class="font-bold">{score}</span>
            <span class="text-micro text-chrome-muted"
              >({formatMod(calcMod(score))})</span
            >
          </div>
        {/each}
      </div>
    {/if}

    <!-- Saves & Skills -->
    {#if data.keySaves?.length || data.keySkills?.length}
      <div class="flex flex-col gap-1 text-xs">
        {#if data.keySaves?.length}
          <div>
            <strong class="text-chrome-muted">Saves:</strong>
            {data.keySaves.join(", ")}
          </div>
        {/if}
        {#if data.keySkills?.length}
          <div>
            <strong class="text-chrome-muted">Skills:</strong>
            {data.keySkills.join(", ")}
          </div>
        {/if}
      </div>
    {/if}
  {/snippet}
  {#if mechanics.kind === "tov-quick-npc"}
    {@render quickNpcPreview(mechanics.data)}
  {/if}

  {#snippet characterPreview()}
    {#if mechanics.kind === "tov-character"}
      {@const data = mechanics.data}
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="rounded bg-chrome-bg/60 px-2 py-1">
          <strong>Lineage:</strong>
          {data.lineage}
        </span>
        <span class="rounded bg-chrome-bg/60 px-2 py-1">
          <strong>Heritage:</strong>
          {data.heritage}
        </span>
        <span class="rounded bg-chrome-bg/60 px-2 py-1">
          <strong>Class:</strong>
          {data.className}
          {data.subclass ? `(${data.subclass})` : ""} Lvl {data.level}
        </span>
        <span class="rounded bg-chrome-bg/60 px-2 py-1">
          <strong>PB:</strong> +{data.proficiencyBonus}
        </span>
        <span class="rounded bg-chrome-bg/60 px-2 py-1">
          <strong>Luck:</strong>
          {data.luck ?? 0}
        </span>
      </div>

      <div class="grid grid-cols-4 gap-2 text-center">
        <div
          class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5"
        >
          <span
            class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
            >AC</span
          >
          <span class="text-sm font-bold text-chrome-text">{data.ac}</span>
        </div>
        <div
          class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5"
        >
          <span
            class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
            >HP</span
          >
          <span class="text-sm font-bold text-chrome-text">{data.hp}</span>
          <span class="text-micro text-chrome-muted">({data.hitDice})</span>
        </div>
        <div
          class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5"
        >
          <span
            class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
            >Speed</span
          >
          <span class="text-sm font-bold text-chrome-text">{data.speed}</span>
        </div>
        <div
          class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5"
        >
          <span
            class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
            >Background</span
          >
          <span class="text-xs font-bold text-chrome-text truncate"
            >{data.background}</span
          >
        </div>
      </div>

      <!-- Attacks -->
      {#if data.attacks?.length}
        <div class="flex flex-col gap-1.5">
          <span
            class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
            >Attacks & Weapons</span
          >
          <div class="flex flex-col gap-1">
            {#each data.attacks as atk}
              <div
                class="flex items-center justify-between rounded border border-chrome-border/30 bg-chrome-bg/30 px-2.5 py-1.5"
              >
                <span class="font-bold text-chrome-text">{atk.name}</span>
                <div class="flex items-center gap-2">
                  <span
                    class="rounded bg-chrome-accent/10 px-2 py-0.5 font-mono text-chrome-accent"
                    >{atk.attackFormula}</span
                  >
                  <span class="font-mono text-chrome-text"
                    >{atk.damageFormula} {atk.type ?? ""}</span
                  >
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  {/snippet}
  {@render characterPreview()}

  {#snippet creaturePreview(data: CreatureData)}
    <!-- Creature Vitals & Identity -->
    <div class="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >CR</span
        >
        <span class="text-sm font-bold text-chrome-text">{data.cr}</span>
      </div>
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >Type</span
        >
        <span class="text-xs font-bold text-chrome-text"
          >{data.size} {data.creatureType}</span
        >
      </div>
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >AC</span
        >
        <span class="text-sm font-bold text-chrome-text">{data.ac}</span>
        {#if data.acDetails}
          <span class="text-micro text-chrome-muted block truncate"
            >({data.acDetails})</span
          >
        {/if}
      </div>
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >HP</span
        >
        <span class="text-sm font-bold text-chrome-text">{data.hp}</span>
        <span class="text-micro text-chrome-muted">({data.hitDice})</span>
      </div>
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >PB</span
        >
        <span class="text-sm font-bold text-chrome-text"
          >+{data.proficiencyBonus}</span
        >
      </div>
      <div class="rounded border border-chrome-border/40 bg-chrome-bg/60 p-1.5">
        <span
          class="block text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >Doom</span
        >
        <span class="text-sm font-bold text-chrome-text">{data.doom ?? 0}</span>
      </div>
    </div>

    <!-- Actions Table -->
    {#if data.actions?.length}
      <div class="flex flex-col gap-1.5">
        <span
          class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
          >Actions</span
        >
        <div class="flex flex-col gap-1.5">
          {#each data.actions as action}
            <div
              class="rounded border border-chrome-border/40 bg-chrome-bg/30 p-2"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-1 mb-1"
              >
                <span class="font-bold text-chrome-text">{action.name}</span>
                <div class="flex items-center gap-1.5 font-mono text-xs">
                  {#if action.attackFormula}
                    <span
                      class="rounded bg-chrome-accent/10 px-1.5 py-0.5 text-chrome-accent"
                      >{action.attackFormula}</span
                    >
                  {/if}
                  {#if action.damageFormula}
                    <span
                      class="rounded bg-chrome-bg/80 px-1.5 py-0.5 text-chrome-text"
                      >{action.damageFormula}</span
                    >
                  {/if}
                  {#if action.isHomebrew}
                    <span class="text-micro text-amber-300 font-sans font-bold"
                      >[Homebrew]</span
                    >
                  {/if}
                </div>
              </div>
              <p class="text-chrome-muted text-xs leading-relaxed">
                {action.description}
              </p>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/snippet}
  {#if mechanics.kind === "tov-creature"}
    {@render creaturePreview(mechanics.data)}
  {/if}

  {#snippet magicItemPreview()}
    {#if mechanics.kind === "tov-magic-item"}
      {@const data = mechanics.data}
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span
          class="rounded border border-chrome-border/40 bg-chrome-bg/60 px-2 py-1"
        >
          <strong>Rarity:</strong>
          {data.rarity}
        </span>
        <span
          class="rounded border border-chrome-border/40 bg-chrome-bg/60 px-2 py-1"
        >
          <strong>Category:</strong>
          {data.category}
        </span>
        <span
          class="rounded border border-chrome-border/40 bg-chrome-bg/60 px-2 py-1"
        >
          <strong>Attunement:</strong>
          {data.attunement
            ? data.attunementRequirement
              ? `Yes (${data.attunementRequirement})`
              : "Yes"
            : "No"}
        </span>
        <span
          class="rounded border border-chrome-border/40 bg-chrome-bg/60 px-2 py-1"
        >
          <strong>Activation:</strong>
          {data.activationAction}
        </span>
        {#if data.charges}
          <span
            class="rounded border border-chrome-border/40 bg-chrome-bg/60 px-2 py-1"
          >
            <strong>Charges:</strong>
            {data.charges}
            {data.rechargeRate ? `(${data.rechargeRate})` : ""}
          </span>
        {/if}
        {#if data.savingThrowDc}
          <span
            class="rounded border border-chrome-border/40 bg-chrome-bg/60 px-2 py-1"
          >
            <strong>Save DC:</strong>
            {data.savingThrowDc}
          </span>
        {/if}
      </div>
      {#if data.rulesText}
        <div
          class="rounded border border-chrome-border/40 bg-chrome-bg/30 p-2 text-xs leading-relaxed text-chrome-text"
        >
          {data.rulesText}
        </div>
      {/if}
    {/if}
  {/snippet}
  {@render magicItemPreview()}

  {#snippet encounterPreview()}
    {#if mechanics.kind === "tov-encounter"}
      {@const data = mechanics.data}
      <div class="flex flex-col gap-2.5">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span
            class="rounded border border-chrome-border/40 bg-chrome-bg/60 px-2 py-1"
          >
            <strong>Difficulty:</strong>
            {data.qualitativeDifficulty}
          </span>
          <span
            class="rounded border border-chrome-border/40 bg-chrome-bg/60 px-2 py-1"
          >
            <strong>Recommended CR:</strong>
            {data.recommendedCrRange}
          </span>
        </div>

        {#if data.suggestedCreatures?.length}
          <div class="flex flex-col gap-1">
            <span
              class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
            >
              Suggested Adversaries & Participants
            </span>
            <div class="flex flex-col gap-1">
              {#each data.suggestedCreatures as creature, idx (creature.name + idx)}
                <div
                  class="flex items-center justify-between rounded border border-chrome-border/30 bg-chrome-bg/30 px-2.5 py-1.5 text-xs"
                >
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-chrome-text">
                      {creature.count}x {creature.name}
                    </span>
                    <span
                      class="rounded bg-chrome-bg/80 px-1.5 py-0.5 text-micro font-bold text-chrome-accent"
                    >
                      CR {creature.cr}
                    </span>
                    <span class="text-micro text-chrome-muted">
                      ({creature.role})
                    </span>
                  </div>
                  {#if creature.isHomebrew}
                    <span
                      class="rounded bg-amber-500/10 px-1.5 py-0.5 text-micro font-semibold text-amber-300"
                    >
                      Homebrew
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if data.tacticalAdvice}
          <div class="flex flex-col gap-1">
            <span
              class="text-micro font-bold uppercase tracking-wider text-chrome-muted"
            >
              Tactical & Pacing Guidance
            </span>
            <div
              class="rounded border border-chrome-border/40 bg-chrome-bg/30 p-2 text-xs leading-relaxed text-chrome-text"
            >
              {data.tacticalAdvice}
            </div>
          </div>
        {/if}

        {#if data.doomNotes}
          <div class="flex flex-col gap-1">
            <span
              class="text-micro font-bold uppercase tracking-wider text-amber-400"
            >
              Doom Actions & Usage (Boss / High Threat)
            </span>
            <div
              class="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs leading-relaxed text-amber-200"
            >
              {data.doomNotes}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {/snippet}
  {@render encounterPreview()}
</div>
