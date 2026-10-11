import { describe, expect, it } from "vitest";
import {
  PresentationTemplateSchema,
  StatSheetSchema,
  StatSheetTemplateSchema,
  type StatSheetField,
  type StatSheetTemplate,
} from "schema";
import {
  legacyCharacterStatSheet,
  legacyMythrasTemplate,
  legacyPresentationTemplate,
  locationShopStatSheet,
} from "../__fixtures__/legacy-sheets";
import {
  SheetCapabilityError,
  SheetCapabilityRegistry,
  type SheetCapabilityDefinition,
} from "./capabilities";
import { projectEntitySheet, SheetProjectionError } from "./projection";
import { partitionTemplatesForCategory } from "./template-discovery";
import { projectTemplatePackage } from "../template-package";
import { exportPresentationTemplate } from "../presentation/package";
import { parseTemplate } from "../presentation/parse";
import { isTemplateUsable, validateAst } from "../presentation/validate";
import { resolveStatSheetSchema } from "../presentation/schema-for-entity";

const stockTable: SheetCapabilityDefinition = {
  id: "stock-table",
  label: "Stock table",
  categories: ["location", "faction"],
  actions: [
    { id: "restock", label: "Restock", mutates: true },
    { id: "price-check", label: "Price check", mutates: false },
  ],
};

const hideGmNotes: SheetCapabilityDefinition = {
  id: "gm-notes",
  label: "GM notes",
  project: (fields, context) =>
    context.audience === "gm"
      ? fields
      : fields.filter((field) => field.id !== "owner"),
};

function shopTemplate(capabilities?: string[]): StatSheetTemplate {
  return StatSheetTemplateSchema.parse({
    id: "vault-shop",
    name: "Shop",
    category: "location",
    fields: locationShopStatSheet.fields.map(
      ({ value: _value, rows: _rows, ...field }) => field,
    ),
    ...(capabilities ? { capabilities } : {}),
  });
}

describe("legacy sheet compatibility", () => {
  it("loads pre-capability templates, sheets and presentations unchanged", () => {
    const template = StatSheetTemplateSchema.parse(legacyMythrasTemplate);
    expect(template).toEqual(legacyMythrasTemplate);
    expect(template).not.toHaveProperty("capabilities");

    expect(StatSheetSchema.parse(legacyCharacterStatSheet)).toEqual(
      legacyCharacterStatSheet,
    );
    expect(
      PresentationTemplateSchema.parse(legacyPresentationTemplate),
    ).toEqual(legacyPresentationTemplate);
  });

  it("exports a legacy presentation template without data loss", () => {
    const exported = exportPresentationTemplate(
      PresentationTemplateSchema.parse(legacyPresentationTemplate),
    );
    expect(exported.source).toBe(legacyPresentationTemplate.source);
    expect(exported.schemaTemplateId).toBe(
      legacyPresentationTemplate.schemaTemplateId,
    );
  });

  it("projects a legacy sheet to an exact copy without touching the source", () => {
    const sheet = structuredClone(legacyCharacterStatSheet) as {
      templateId: string;
      fields: StatSheetField[];
    };
    const before = structuredClone(sheet);
    const projection = projectEntitySheet(
      sheet,
      StatSheetTemplateSchema.parse(legacyMythrasTemplate),
      "player",
      new SheetCapabilityRegistry(),
    );

    expect(projection.fields).toEqual(before.fields);
    expect(projection.capabilities).toEqual([]);
    expect(sheet).toEqual(before);
    expect(projection.fields[0]).not.toBe(sheet.fields[0]);
  });
});

describe("template capabilities", () => {
  it("keeps declared capability ids, including ones this client does not know", () => {
    const template = shopTemplate(["stock-table", "future.trade"]);
    expect(template.capabilities).toEqual(["stock-table", "future.trade"]);

    const registry = new SheetCapabilityRegistry();
    registry.register(stockTable);
    const resolved = registry.resolve(template);
    expect(resolved.active.map((c) => c.id)).toEqual(["stock-table"]);
    expect(resolved.unknown).toEqual(["future.trade"]);
  });

  it("rejects capability ids that are not plain identifiers", () => {
    for (const bad of ["Stock", "stock table", "<script>", "a..b", ""]) {
      expect(
        StatSheetTemplateSchema.safeParse({
          id: "t",
          name: "T",
          capabilities: [bad],
        }).success,
      ).toBe(false);
    }
  });

  it("leaves capabilities out of public marketplace packages", () => {
    const pkg = projectTemplatePackage(shopTemplate(["stock-table"]), {
      category: "location",
    });
    expect(pkg.template).not.toHaveProperty("capabilities");
    expect(pkg.template.fields.map((f) => f.id)).toEqual([
      "owner",
      "reputation",
      "stock",
    ]);
  });
});

describe("SheetCapabilityRegistry", () => {
  it("lists actions with qualified ids and confirmation for mutating ones", () => {
    const registry = new SheetCapabilityRegistry();
    registry.register(stockTable);

    expect(
      registry
        .actionsFor(shopTemplate(["stock-table"]))
        .map((a) => [a.qualifiedId, a.requiresConfirmation]),
    ).toEqual([
      ["stock-table:restock", true],
      ["stock-table:price-check", false],
    ]);
    expect(registry.actionsFor(shopTemplate())).toEqual([]);
  });

  it("refuses duplicate capabilities, invalid ids and duplicate actions", () => {
    const registry = new SheetCapabilityRegistry();
    registry.register(stockTable);

    expect(() => registry.register(stockTable)).toThrow(SheetCapabilityError);
    expect(() => registry.register({ id: "Not Valid", label: "Bad" })).toThrow(
      SheetCapabilityError,
    );
    expect(() =>
      registry.register({
        id: "twice",
        label: "Twice",
        actions: [
          { id: "go", label: "Go", mutates: false },
          { id: "go", label: "Go again", mutates: false },
        ],
      }),
    ).toThrow(SheetCapabilityError);
    expect(registry.has("twice")).toBe(false);
  });
});

describe("projectEntitySheet", () => {
  it("applies capability projectors for the audience and freezes the result", () => {
    const registry = new SheetCapabilityRegistry();
    registry.register(hideGmNotes);
    const template = shopTemplate(["gm-notes"]);

    const gm = projectEntitySheet(
      locationShopStatSheet,
      template,
      "gm",
      registry,
    );
    const player = projectEntitySheet(
      locationShopStatSheet,
      template,
      "player",
      registry,
    );

    expect(gm.fields.map((f) => f.id)).toEqual([
      "owner",
      "reputation",
      "stock",
    ]);
    expect(player.fields.map((f) => f.id)).toEqual(["reputation", "stock"]);
    expect(Object.isFrozen(player.fields)).toBe(true);
    expect(Object.isFrozen(player.fields[1].rows?.[0])).toBe(true);
    expect(() => {
      (player.fields as StatSheetField[]).push(gm.fields[0]);
    }).toThrow(TypeError);
  });

  it("fails closed when a projector throws", () => {
    const registry = new SheetCapabilityRegistry();
    registry.register({
      id: "broken",
      label: "Broken",
      project: () => {
        throw new Error("boom");
      },
    });

    expect(() =>
      projectEntitySheet(
        locationShopStatSheet,
        shopTemplate(["broken"]),
        "player",
        registry,
      ),
    ).toThrow(SheetProjectionError);
  });

  it("fails closed when a projector returns something other than a field list", () => {
    const registry = new SheetCapabilityRegistry();
    registry.register({
      id: "wrong-shape",
      label: "Wrong shape",
      project: () => ({ fields: [] }) as unknown as StatSheetField[],
    });

    expect(() =>
      projectEntitySheet(
        locationShopStatSheet,
        shopTemplate(["wrong-shape"]),
        "player",
        registry,
      ),
    ).toThrow(SheetProjectionError);
  });

  it("copies fields held in a reactive proxy", () => {
    const proxied = new Proxy(structuredClone(locationShopStatSheet), {});
    const fields = new Proxy(proxied.fields, {});
    const projection = projectEntitySheet(
      { templateId: null, fields },
      null,
      "gm",
      new SheetCapabilityRegistry(),
    );
    expect(projection.fields).toEqual(locationShopStatSheet.fields);
  });

  it("cannot reach the source sheet through a projector that mutates its input", () => {
    const registry = new SheetCapabilityRegistry();
    registry.register({
      id: "sneaky",
      label: "Sneaky",
      project: (fields) => {
        fields[0].value = "changed";
        return fields;
      },
    });
    const sheet = structuredClone(locationShopStatSheet);

    projectEntitySheet(sheet, shopTemplate(["sneaky"]), "gm", registry);
    expect(sheet.fields[0].value).toBe("Mira Vell");
  });
});

describe("partitionTemplatesForCategory", () => {
  const templates = [
    { id: "dnd", category: "character" },
    { id: "npc", category: "npc" },
    { id: "settlement", category: "location" },
    { id: "guild", category: "organization" },
    { id: "plain" },
  ];

  it("suggests exact matches first, then related categories", () => {
    const { suggested, other } = partitionTemplatesForCategory(
      templates,
      "Character",
    );
    expect(suggested.map((t) => t.id)).toEqual(["dnd", "npc"]);
    expect(other.map((t) => t.id)).toEqual(["settlement", "guild", "plain"]);
  });

  it("maps vault categories onto directory categories", () => {
    expect(
      partitionTemplatesForCategory(templates, "faction").suggested.map(
        (t) => t.id,
      ),
    ).toEqual(["guild"]);
  });

  it("suggests nothing for an unknown or missing category but hides nothing", () => {
    for (const category of ["spaceship", undefined, ""]) {
      const { suggested, other } = partitionTemplatesForCategory(
        templates,
        category,
      );
      expect(suggested).toEqual([]);
      expect(other).toHaveLength(templates.length);
    }
  });
});

describe("custom sheet on a Location", () => {
  it("resolves a schema a saved presentation can render against", () => {
    const template = shopTemplate();
    const schema = resolveStatSheetSchema(
      { ...locationShopStatSheet, templateId: template.id },
      template,
      "entity-local-stat-sheet:shop-1",
    );
    expect(schema?.id).toBe("vault-shop");

    const presentation = PresentationTemplateSchema.parse({
      id: "vault-presentation-catalogue",
      vaultId: "vault-1",
      schemaTemplateId: "vault-shop",
      name: "Catalogue",
      source: ":::card\n{{stat.owner}}\n{{stat.stock}}\n:::\n",
      formatVersion: 1,
      createdAt: "2026-10-11T00:00:00.000Z",
      updatedAt: "2026-10-11T00:00:00.000Z",
    });
    expect(isTemplateUsable(presentation, schema ?? undefined)).toBe(true);

    const parsed = parseTemplate(presentation.source, 1);
    if (!parsed.ok) throw new Error("expected parse to succeed");
    const ast = JSON.stringify(validateAst(parsed.ast, schema!));
    expect(ast).not.toContain("missing-field");
  });
});
