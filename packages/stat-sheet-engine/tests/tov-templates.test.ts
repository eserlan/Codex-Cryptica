// fallow-ignore-file complexity
import { describe, expect, it } from "vitest";
import { StatSheetTemplateSchema } from "schema";
import {
  TOV_CHARACTER_TEMPLATE,
  TOV_NPC_TEMPLATE,
  TOV_MONSTER_TEMPLATE,
  TOV_CHARACTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE_ID,
  TOV_MONSTER_TEMPLATE_ID,
  TOV_TEMPLATES,
  getBuiltInPresentationTemplates,
  partitionTemplatesForCategory,
} from "../src";

describe("Tales of the Valiant Stat-Sheet Templates (#3944)", () => {
  it("provides stable IDs for ToV Character, NPC, and Monster templates", () => {
    expect(TOV_CHARACTER_TEMPLATE_ID).toBe("builtin-tov-character");
    expect(TOV_NPC_TEMPLATE_ID).toBe("builtin-tov-npc");
    expect(TOV_MONSTER_TEMPLATE_ID).toBe("builtin-tov-monster");

    expect(TOV_CHARACTER_TEMPLATE.id).toBe(TOV_CHARACTER_TEMPLATE_ID);
    expect(TOV_NPC_TEMPLATE.id).toBe(TOV_NPC_TEMPLATE_ID);
    expect(TOV_MONSTER_TEMPLATE.id).toBe(TOV_MONSTER_TEMPLATE_ID);
  });

  it("validates all ToV templates against StatSheetTemplateSchema", () => {
    for (const template of TOV_TEMPLATES) {
      const parsed = StatSheetTemplateSchema.safeParse(template);
      expect(
        parsed.success,
        `Template ${template.id} failed schema validation: ${JSON.stringify(parsed)}`,
      ).toBe(true);
      expect(template.isBuiltIn).toBe(true);
      expect(template.systemId).toBe("tales-of-the-valiant");
    }
  });

  it("ensures all field IDs within each template are unique", () => {
    for (const template of TOV_TEMPLATES) {
      const seen = new Set<string>();
      for (const field of template.fields) {
        expect(
          seen.has(field.id),
          `Duplicate field ID "${field.id}" found in ${template.id}`,
        ).toBe(false);
        seen.add(field.id);
      }
    }
  });

  it("ToV Character template models Lineage, Heritage, Talents, Luck pool, and BFRD mechanics", () => {
    const fieldMap = new Map(
      TOV_CHARACTER_TEMPLATE.fields.map((f) => [f.id, f]),
    );

    // Lineage & Heritage
    expect(fieldMap.get("lineage")?.type).toBe("text");
    expect(fieldMap.get("heritage")?.type).toBe("text");
    expect(fieldMap.get("background")?.type).toBe("text");
    expect(fieldMap.get("class")?.type).toBe("text");
    expect(fieldMap.get("level")?.type).toBe("number");

    // Vitals with Luck (1-5 pool)
    const hp = fieldMap.get("hp");
    expect(hp?.type).toBe("counter");
    expect(hp?.barField).toBe(true);

    const luck = fieldMap.get("luck");
    expect(luck?.type).toBe("counter");
    expect(luck?.min).toBe(0);
    expect(luck?.max).toBe(5);

    // Ability scores & modifier sources
    for (const stat of ["str", "dex", "con", "int", "wis", "cha"]) {
      expect(fieldMap.get(`${stat}_score`)?.type).toBe("number");
      const check = fieldMap.get(stat);
      expect(check?.type).toBe("dice");
      expect(check?.modifierSource).toBe(`${stat}_score`);
      const save = fieldMap.get(`${stat}_save`);
      expect(save?.type).toBe("dice");
      expect(save?.modifierSource).toBe(`${stat}_score`);
    }

    // Attacks item table
    const attacks = fieldMap.get("attacks");
    expect(attacks?.type).toBe("item-table");
    const colIds = attacks?.columns?.map((c) => c.id);
    expect(colIds).toContain("name");
    expect(colIds).toContain("attack");
    expect(colIds).toContain("damage");

    // Talents
    expect(fieldMap.get("talents")?.type).toBe("longtext");
    expect(fieldMap.get("features")?.type).toBe("longtext");
    expect(fieldMap.get("lineage_traits")?.type).toBe("longtext");
  });

  it("ToV Monster template models CR, Doom points, saves, senses, traits, and structured actions", () => {
    const fieldMap = new Map(TOV_MONSTER_TEMPLATE.fields.map((f) => [f.id, f]));

    expect(fieldMap.get("cr")?.type).toBe("text");
    expect(fieldMap.get("creature_type")?.type).toBe("text");

    const doom = fieldMap.get("doom");
    expect(doom?.type).toBe("counter");
    expect(doom?.min).toBe(0);
    expect(doom?.max).toBe(10);

    const actions = fieldMap.get("actions");
    expect(actions?.type).toBe("item-table");

    const bonus = fieldMap.get("bonus_actions");
    expect(bonus?.type).toBe("item-table");

    const reactions = fieldMap.get("reactions");
    expect(reactions?.type).toBe("item-table");

    const legendary = fieldMap.get("legendary_actions");
    expect(legendary?.type).toBe("item-table");
  });

  it("ToV NPC template models lightweight quick stats with Luck", () => {
    const fieldMap = new Map(TOV_NPC_TEMPLATE.fields.map((f) => [f.id, f]));

    expect(fieldMap.get("hp")?.type).toBe("counter");
    expect(fieldMap.get("ac")?.type).toBe("number");
    expect(fieldMap.get("luck")?.type).toBe("counter");
    expect(fieldMap.get("atk")?.type).toBe("dice");
    expect(fieldMap.get("damage")?.type).toBe("dice");
  });

  describe("partitionTemplatesForCategory systemId prioritization", () => {
    it("prioritizes ToV Character template when systemId is tales-of-the-valiant", () => {
      const templates = [
        {
          id: "builtin-dnd-character",
          category: "character",
          systemId: undefined,
        },
        TOV_CHARACTER_TEMPLATE,
        {
          id: "builtin-pathfinder-character",
          category: "character",
          systemId: undefined,
        },
      ];

      const partitioned = partitionTemplatesForCategory(
        templates,
        "character",
        "tales-of-the-valiant",
      );

      expect(partitioned.suggested[0]?.id).toBe(TOV_CHARACTER_TEMPLATE_ID);
    });

    it("keeps generic default order when systemId is undefined or neutral", () => {
      const templates = [
        {
          id: "builtin-dnd-character",
          category: "character",
          systemId: undefined,
        },
        TOV_CHARACTER_TEMPLATE,
      ];

      const partitioned = partitionTemplatesForCategory(
        templates,
        "character",
        undefined,
      );

      expect(partitioned.suggested[0]?.id).toBe("builtin-dnd-character");
      expect(partitioned.suggested[1]?.id).toBe(TOV_CHARACTER_TEMPLATE_ID);
    });
  });

  describe("Built-in Presentation Templates", () => {
    it("provides dedicated ToV Character Sheet presentation template for ToV character schema", () => {
      const presentations = getBuiltInPresentationTemplates(
        TOV_CHARACTER_TEMPLATE_ID,
      );
      expect(presentations.length).toBeGreaterThan(0);
      expect(presentations[0]?.id).toBe(
        `builtin-presentation-tov-character-sheet-${TOV_CHARACTER_TEMPLATE_ID}`,
      );
      expect(presentations[0]?.name).toBe("ToV Character Sheet");
      expect(presentations[0]?.source).toContain("Luck Points");
      expect(presentations[0]?.source).toContain("Lineage");
    });
  });
});
