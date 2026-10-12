import { describe, expect, it } from "vitest";
import {
  StatSheetSchema,
  StatSheetTemplateSchema,
  type PresentationTemplate,
} from "schema";
import {
  SHOP_CATALOGUE_PRESENTATION_NAME,
  SHOP_GM_PRESENTATION_NAME,
  SHOP_MERCHANT_TEMPLATE,
  SHOP_MERCHANT_TEMPLATE_ID,
  SHOP_STOCK_FIELD_ID,
  createDemoMerchantSheet,
  getShopPresentationTemplates,
} from "./merchant";
import { getBuiltInPresentationTemplates } from "./presentation/built-ins";
import { parseTemplate } from "./presentation/parse";
import { validateAst } from "./presentation/validate";
import { resolveDisplayMode } from "./presentation/directives";
import { ensureRowIds, resolveStockDisplay } from "./stock";
import { SheetCapabilityRegistry } from "./entity-sheet/capabilities";

/** Collects every node of the given types from a validated AST. */
function collect(node: unknown, types: string[], out: any[] = []): any[] {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, types, out);
  } else if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record.type === "string" && types.includes(record.type)) {
      out.push(record);
    }
    for (const value of Object.values(record)) collect(value, types, out);
  }
  return out;
}

function validated(presentation: PresentationTemplate) {
  const parsed = parseTemplate(presentation.source, presentation.formatVersion);
  if (!parsed.ok) throw new Error("presentation did not parse");
  return validateAst(parsed.ast, SHOP_MERCHANT_TEMPLATE);
}

describe("Shop / Merchant template (#3962)", () => {
  it("is a valid, opt-in, built-in template with a stock ledger", () => {
    expect(
      StatSheetTemplateSchema.safeParse(SHOP_MERCHANT_TEMPLATE).success,
    ).toBe(true);
    expect(SHOP_MERCHANT_TEMPLATE.isBuiltIn).toBe(true);
    expect(SHOP_MERCHANT_TEMPLATE.capabilities).toEqual(["stock-table"]);

    const stock = SHOP_MERCHANT_TEMPLATE.fields.find(
      (field) => field.id === SHOP_STOCK_FIELD_ID,
    );
    expect(stock?.type).toBe("item-table");
    expect(stock?.stockLedger).toBe(true);
    expect(stock?.linkVaultItems).toBe(true);
  });

  it("has unique field ids and no system-specific fields", () => {
    const ids = SHOP_MERCHANT_TEMPLATE.fields.map((field) => field.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toEqual(expect.arrayContaining(["hp", "ac"]));
  });

  it("leaves the capability unknown, not broken, in a bare registry", () => {
    const resolved = new SheetCapabilityRegistry().resolve(
      SHOP_MERCHANT_TEMPLATE,
    );
    expect(resolved.active).toEqual([]);
    expect(resolved.unknown).toEqual(["stock-table"]);
  });
});

describe("Shop presentations", () => {
  const presentations = getShopPresentationTemplates();

  it("ships exactly the GM Stock Manager and Browse Catalogue layouts", () => {
    expect(presentations.map((p) => p.name)).toEqual([
      SHOP_GM_PRESENTATION_NAME,
      SHOP_CATALOGUE_PRESENTATION_NAME,
    ]);
    expect(
      presentations.every(
        (p) => p.isBuiltIn && p.schemaTemplateId === SHOP_MERCHANT_TEMPLATE_ID,
      ),
    ).toBe(true);
    expect(new Set(presentations.map((p) => p.id)).size).toBe(2);
  });

  it("is what the built-in lookup returns for the shop, and only for the shop", () => {
    expect(getBuiltInPresentationTemplates(SHOP_MERCHANT_TEMPLATE_ID)).toEqual(
      presentations,
    );
    const other = getBuiltInPresentationTemplates("some-other-schema");
    expect(other.length).toBeGreaterThan(2);
    expect(other.map((p) => p.name)).not.toContain(
      SHOP_CATALOGUE_PRESENTATION_NAME,
    );
  });

  it.each(presentations.map((p) => [p.name, p] as const))(
    "%s parses and every field reference resolves",
    (_name, presentation) => {
      const ast = validated(presentation);
      expect(collect(ast, ["missing-field"])).toEqual([]);
      expect(collect(ast, ["unknown-directive"])).toEqual([]);
    },
  );

  it("shows the stock table editable in the GM layout and read-only in the catalogue", () => {
    const [gm, catalogue] = presentations.map((p) =>
      collect(validated(p), ["field-reference"]).find(
        (ref) => ref.fieldId === SHOP_STOCK_FIELD_ID,
      ),
    );
    expect(gm?.displayMode).toBe("table");
    expect(catalogue?.displayMode).toBe("catalogue");
    expect(catalogue?.requestedDisplayMode).toBeUndefined();
  });

  it("keeps GM notes out of the catalogue layout", () => {
    const [gm, catalogue] = presentations;
    expect(gm.source).toContain("stat.gm_notes");
    expect(catalogue.source).not.toContain("gm_notes");
  });

  it("only offers the catalogue mode on item tables", () => {
    expect(resolveDisplayMode("item-table", "catalogue")).toEqual({
      mode: "catalogue",
      wasIncompatible: false,
    });
    expect(resolveDisplayMode("text", "catalogue")).toEqual({
      mode: "plain",
      wasIncompatible: true,
    });
  });
});

describe("Demo merchant", () => {
  it("is a valid stat sheet that already has stable, unique row ids", () => {
    const sheet = createDemoMerchantSheet();
    expect(StatSheetSchema.safeParse(sheet).success).toBe(true);
    expect(sheet.templateId).toBe(SHOP_MERCHANT_TEMPLATE_ID);

    const rows = sheet.fields.find((f) => f.id === SHOP_STOCK_FIELD_ID)!.rows!;
    expect(new Set(rows.map((row) => row.rowId)).size).toBe(rows.length);
    // Nothing to repair: the same array comes back, so no write is needed.
    expect(ensureRowIds(rows)).toBe(rows);
  });

  it("covers the stock cases a shop needs", () => {
    const rows = createDemoMerchantSheet().fields.find(
      (f) => f.id === SHOP_STOCK_FIELD_ID,
    )!.rows!;
    const stock = rows.map((row) => row.stock as Record<string, unknown>);
    expect(stock.some((s) => s.kind === "service")).toBe(true);
    expect(stock.some((s) => s.availability === "sold-out")).toBe(true);
    expect(stock.some((s) => s.availability === "hidden")).toBe(true);
    expect(rows.some((row) => typeof row.entityId === "string")).toBe(true);
    expect(rows.some((row) => row.entityId === undefined)).toBe(true);
  });

  it("falls back to the saved name when the linked item is missing", () => {
    const linked = createDemoMerchantSheet()
      .fields.find((f) => f.id === SHOP_STOCK_FIELD_ID)!
      .rows!.find((row) => typeof row.entityId === "string")!;
    const display = resolveStockDisplay(linked, undefined);
    expect(display.missing).toBe(true);
    expect(display.name).toBe("Hooded lantern");
  });

  it("is not changed by resolving either presentation", () => {
    const sheet = createDemoMerchantSheet();
    const before = JSON.stringify(sheet);
    for (const presentation of getShopPresentationTemplates()) {
      validated(presentation);
    }
    expect(JSON.stringify(sheet)).toBe(before);
  });

  it("never shares nested data with the built-in template", () => {
    const sheet = createDemoMerchantSheet();
    const stock = sheet.fields.find((f) => f.id === SHOP_STOCK_FIELD_ID)!;
    stock.columns!.push({ id: "extra", label: "Extra", type: "text" });
    const template = SHOP_MERCHANT_TEMPLATE.fields.find(
      (f) => f.id === SHOP_STOCK_FIELD_ID,
    )!;
    expect(template.columns).toHaveLength(1);
  });

  it("returns an independent copy each time", () => {
    const first = createDemoMerchantSheet();
    const second = createDemoMerchantSheet();
    first.fields[0].value = "Changed";
    expect(second.fields[0].value).not.toBe("Changed");
  });
});
