import { describe, expect, it } from "vitest";
import {
  StatSheetFieldSchema,
  StatSheetFieldTypeSchema,
  StatSheetSchema,
  StatSheetTemplateFieldSchema,
} from "./stat-sheet";

describe("StatSheetFieldTypeSchema", () => {
  it("accepts 'dice-pool' as a valid field type", () => {
    expect(StatSheetFieldTypeSchema.safeParse("dice-pool").success).toBe(true);
  });

  it("still accepts all standard field types", () => {
    const types = [
      "counter",
      "number",
      "text",
      "longtext",
      "heading",
      "dice",
      "item-table",
      "dice-pool",
    ];
    for (const type of types) {
      expect(StatSheetFieldTypeSchema.safeParse(type).success).toBe(true);
    }
  });

  it("rejects unknown field types", () => {
    expect(StatSheetFieldTypeSchema.safeParse("unknown-type").success).toBe(
      false,
    );
  });
});

describe("StatSheetFieldSchema with dice-pool", () => {
  it("validates a complete dice-pool field", () => {
    const field = {
      id: "pool-action",
      key: "action_pool",
      label: "Action Pool",
      type: "dice-pool",
      value: 3,
      formula: "d6",
      min: 0,
      max: 10,
      step: 1,
      startValue: 3,
      allowDieChange: true,
    };

    const parsed = StatSheetFieldSchema.safeParse(field);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe("dice-pool");
      expect(parsed.data.value).toBe(3);
      expect(parsed.data.formula).toBe("d6");
      expect(parsed.data.allowDieChange).toBe(true);
    }
  });

  it("validates a dice-pool on a template without runtime entity properties", () => {
    const templateField = {
      id: "pool-action",
      label: "Action Pool",
      type: "dice-pool",
      formula: "d6",
      min: 1,
      max: 12,
      step: 1,
      startValue: 2,
      allowDieChange: false,
    };

    const parsed = StatSheetTemplateFieldSchema.safeParse(templateField);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe("dice-pool");
      expect(parsed.data.allowDieChange).toBe(false);
    }
  });

  it("validates within a full StatSheet object", () => {
    const sheet = {
      templateId: "fitd-character",
      fields: [
        {
          id: "sk-prowl",
          label: "Prowl",
          type: "dice-pool",
          value: 2,
          formula: "d6",
        },
      ],
    };

    const parsed = StatSheetSchema.safeParse(sheet);
    expect(parsed.success).toBe(true);
  });

  it("fails when dice-pool field is missing required fields like id or label", () => {
    const invalid = {
      type: "dice-pool",
      value: 3,
    };
    expect(StatSheetFieldSchema.safeParse(invalid).success).toBe(false);
  });
});
