<script lang="ts">
  import { fieldState } from "@codex/stat-sheet-engine";
  import type { StatBlockImportController } from "./stat-block-import-controller.svelte";
  import StatBlockFieldRow, {
    type FieldRowModel,
  } from "./StatBlockFieldRow.svelte";
  import StatBlockNotices from "./StatBlockNotices.svelte";
  import StatBlockSummary from "./StatBlockSummary.svelte";

  let { controller }: { controller: StatBlockImportController } = $props();

  const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
  const ABILITY_ROWS: FieldRowModel[] = ABILITIES.map((key) => ({
    path: `abilityScores.${key}`,
    label: key.toUpperCase(),
    kind: "number",
  }));

  const CREATURE_ROWS: FieldRowModel[] = [
    { path: "size", label: "Size", kind: "text" },
    { path: "creatureType", label: "Type", kind: "text" },
    { path: "alignment", label: "Alignment", kind: "text" },
    { path: "cr", label: "Challenge rating", kind: "text" },
    { path: "proficiencyBonus", label: "Proficiency bonus", kind: "number" },
    { path: "doom", label: "Doom", kind: "number" },
    { path: "ac", label: "Armour Class", kind: "number" },
    { path: "acDetails", label: "AC details", kind: "text" },
    { path: "hp", label: "Hit Points", kind: "number" },
    { path: "hitDice", label: "Hit dice", kind: "text" },
    { path: "speed", label: "Speed", kind: "text" },
    ...ABILITY_ROWS,
    { path: "saveProficiencies", label: "Saving throws", kind: "list" },
    { path: "skillProficiencies", label: "Skills", kind: "list" },
    { path: "damageResistances", label: "Resistances", kind: "list" },
    { path: "damageImmunities", label: "Immunities", kind: "list" },
    {
      path: "conditionImmunities",
      label: "Condition immunities",
      kind: "list",
    },
    { path: "senses", label: "Senses", kind: "text" },
    { path: "languages", label: "Languages", kind: "text" },
  ];

  const NPC_ROWS: FieldRowModel[] = [
    { path: "cr", label: "Challenge rating", kind: "text" },
    { path: "ac", label: "Armour Class", kind: "number" },
    { path: "hp", label: "Hit Points", kind: "number" },
    { path: "hitDice", label: "Hit dice", kind: "text" },
    { path: "speed", label: "Speed", kind: "text" },
    { path: "attackName", label: "Attack name", kind: "text" },
    { path: "attackFormula", label: "Attack roll", kind: "text" },
    { path: "damageFormula", label: "Damage roll", kind: "text" },
    { path: "damageType", label: "Damage type", kind: "text" },
    { path: "luck", label: "Luck", kind: "number" },
    ...ABILITY_ROWS,
    { path: "keySaves", label: "Key saves", kind: "list" },
    { path: "keySkills", label: "Key skills", kind: "list" },
  ];

  const rows = $derived(
    controller.result?.kind === "npc" ? NPC_ROWS : CREATURE_ROWS,
  );

  function commit(row: FieldRowModel, raw: string) {
    if (row.kind === "number") {
      const trimmed = raw.trim();
      controller.edit(row.path, trimmed === "" ? undefined : Number(trimmed));
    } else if (row.kind === "list") {
      controller.edit(
        row.path,
        raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else {
      controller.edit(row.path, raw);
    }
  }
</script>

{#if controller.result}
  {@const result = controller.result}
  <div class="flex flex-col gap-3" data-testid="stat-block-review">
    <div class="flex items-center gap-2" role="group" aria-label="Sheet type">
      <span
        class="text-micro font-bold uppercase tracking-widest text-theme-muted"
        >Sheet</span
      >
      {#each [["creature", "Monster", "stat-block-kind-creature"], ["npc", "Quick NPC", "stat-block-kind-npc"]] as [kind, label, testid] (kind)}
        <button
          type="button"
          class="rounded border px-2 py-1 text-micro font-bold uppercase tracking-wide {result.kind ===
          kind
            ? 'border-theme-primary text-theme-primary'
            : 'border-theme-border text-theme-muted'}"
          aria-pressed={result.kind === kind}
          onclick={() => controller.setKind(kind as "creature" | "npc")}
          data-testid={testid}
        >
          {label}
        </button>
      {/each}
    </div>

    <StatBlockNotices {controller} />

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {#each rows as row (row.path)}
        <StatBlockFieldRow
          {row}
          {result}
          state={fieldState(result, row.path)}
          onCommit={(raw) => commit(row, raw)}
        />
      {/each}
    </div>

    <StatBlockSummary {controller} />
  </div>
{/if}
