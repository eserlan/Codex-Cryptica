import type { StatBlockIR, StatBlockImportResult } from "./types";
import {
  TOV_CHARACTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE_ID,
  TOV_MONSTER_TEMPLATE_ID,
} from "../rules-sources/tov-templates";
import {
  mapToDnd5eMonster,
  mapToDndCharacter,
  mapToPathfinderCharacter,
} from "./mapper-d20";
import { mapToMythrasCharacter, mapToMythrasNpc } from "./mapper-mythras";
import { mapToVampireCharacter } from "./mapper-vampire";
import { mapToTovCharacter } from "./mapper-tov-character";
import { mapToTovNpc, mapToTovMonster } from "./mapper-tov-creatures";
import {
  synthesizeTemplateFromIr,
  mapToSynthesizedTemplate,
} from "./mapper-synthesized";

export function mapIrToStatSheet(
  ir: StatBlockIR,
  options: { targetTemplateId?: string } = {},
): StatBlockImportResult {
  const targetId = options.targetTemplateId || selectDefaultTemplateId(ir);

  switch (targetId) {
    case "builtin-dnd5e-monster":
      return { ir, fields: mapToDnd5eMonster(ir), targetTemplateId: targetId };
    case "builtin-dnd-character":
      return { ir, fields: mapToDndCharacter(ir), targetTemplateId: targetId };
    case "builtin-pathfinder-character":
      return {
        ir,
        fields: mapToPathfinderCharacter(ir),
        targetTemplateId: targetId,
      };
    case "builtin-mythras-character":
      return {
        ir,
        fields: mapToMythrasCharacter(ir),
        targetTemplateId: targetId,
      };
    case "builtin-mythras-npc":
      return { ir, fields: mapToMythrasNpc(ir), targetTemplateId: targetId };
    case "builtin-vampire-character":
      return {
        ir,
        fields: mapToVampireCharacter(ir),
        targetTemplateId: targetId,
      };
    case TOV_CHARACTER_TEMPLATE_ID:
      return { ir, fields: mapToTovCharacter(ir), targetTemplateId: targetId };
    case TOV_NPC_TEMPLATE_ID:
      return { ir, fields: mapToTovNpc(ir), targetTemplateId: targetId };
    case TOV_MONSTER_TEMPLATE_ID:
      return { ir, fields: mapToTovMonster(ir), targetTemplateId: targetId };
    default: {
      const synthesized = synthesizeTemplateFromIr(ir);
      return {
        ir,
        fields: mapToSynthesizedTemplate(ir, synthesized),
        targetTemplateId: synthesized.id,
        synthesizedTemplate: synthesized,
      };
    }
  }
}
const DEFAULT_TEMPLATE_BY_SYSTEM: Record<string, Record<string, string>> = {
  "tales-of-the-valiant": {
    character: TOV_CHARACTER_TEMPLATE_ID,
    npc: TOV_NPC_TEMPLATE_ID,
    creature: TOV_MONSTER_TEMPLATE_ID,
  },
  dnd5e: {
    character: "builtin-dnd-character",
    npc: "builtin-dnd5e-monster",
    creature: "builtin-dnd5e-monster",
  },
  pf2e: {
    character: "builtin-pathfinder-character",
    npc: "builtin-pathfinder-character",
    creature: "builtin-pathfinder-character",
  },
  mythras: {
    character: "builtin-mythras-character",
    npc: "builtin-mythras-npc",
    creature: "builtin-mythras-npc",
  },
  vtm: {
    character: "builtin-vampire-character",
    npc: "builtin-vampire-character",
    creature: "builtin-vampire-character",
  },
};

function selectDefaultTemplateId(ir: StatBlockIR): string {
  return (
    DEFAULT_TEMPLATE_BY_SYSTEM[ir.system]?.[ir.identity.category] ??
    `custom-${ir.system}-template`
  );
}

// fallow-ignore-next-line complexity
