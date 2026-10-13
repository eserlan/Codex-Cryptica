import { describe, expect, it } from "vitest";
import type { StatSheet, StatSheetField, StockTradeRecord } from "schema";
import {
  SHAREABLE_SHEET_FIELD_IDS,
  WITHDRAWN_SHEET,
  hasStockLedger,
  projectCatalogueFields,
  projectShopSheetForPlayers,
  sanitizeSheetForGuests,
} from "./catalogue";
import { createDemoMerchantSheet } from "./merchant";
import { SheetCapabilityRegistry } from "./entity-sheet/capabilities";
import { projectEntitySheet } from "./entity-sheet/projection";
import { SHOP_MERCHANT_TEMPLATE } from "./merchant";

const gp = (units: number) => ({ units, currency: "gp", precision: 0 });

/** Every one of these appears only in places players must never see. */
const SECRETS = {
  gmNotes: "CANARY-GM-NOTES",
  funds: "CANARY-FUNDS",
  hiddenLine: "CANARY-HIDDEN-LINE",
  lineNote: "CANARY-LINE-NOTE",
  linkedId: "CANARY-LINKED-ENTITY-ID",
  rowId: "CANARY-ROW-ID",
  counterparty: "CANARY-COUNTERPARTY",
  extraColumn: "CANARY-EXTRA-COLUMN",
  unknownKey: "CANARY-UNKNOWN-KEY",
  owner: "CANARY-OWNER",
  unsharedReputation: "CANARY-REPUTATION",
};

const trade: StockTradeRecord = {
  tradeId: "t1",
  kind: "purchase",
  rowId: SECRETS.rowId,
  itemName: "Rope",
  quantity: 1,
  total: gp(2),
  accounting: "wallet",
  counterpartyId: SECRETS.counterparty,
  status: "complete",
  at: "2026-10-12T12:00:00.000Z",
};

function gmSheet(
  published: boolean | undefined,
  shared: string[] = [],
): StatSheet {
  const ledger = {
    id: "stock",
    label: "Stock",
    type: "item-table",
    stockLedger: true,
    columns: [
      { id: "name", label: "Item", type: "text" },
      { id: "cost", label: "Cost to the shop", type: "text" },
    ],
    tradeLog: [trade],
    ...(published === undefined
      ? {}
      : { playerCatalogue: { published, fields: shared } }),
    rows: [
      {
        rowId: SECRETS.rowId,
        name: "Hempen rope",
        cost: SECRETS.extraColumn,
        secretFlag: SECRETS.unknownKey,
        stock: {
          kind: "item",
          quantity: 5,
          price: gp(2),
          condition: "Good",
          availability: "available",
          note: SECRETS.lineNote,
        },
      },
      {
        rowId: "lamp",
        entityId: SECRETS.linkedId,
        stock: { kind: "item", quantity: 1, price: gp(5) },
      },
      {
        rowId: "ring",
        name: SECRETS.hiddenLine,
        stock: { kind: "item", quantity: 1, availability: "hidden" },
      },
    ],
  } as unknown as StatSheetField;

  return {
    templateId: "builtin-shop-merchant",
    presentationTemplateId: "some-gm-layout",
    fields: [
      { id: "owner", label: "Owner", type: "text", value: SECRETS.owner },
      {
        id: "speciality",
        label: "Speciality",
        type: "text",
        value: "Lamp oil",
      },
      {
        id: "reputation",
        label: "Reputation",
        type: "text",
        value: SECRETS.unsharedReputation,
      },
      { id: "funds", label: "Funds", type: "text", value: SECRETS.funds },
      {
        id: "services",
        label: "Services",
        type: "longtext",
        value: "Repairs",
      },
      ledger,
      {
        id: "gm_notes",
        label: "GM notes",
        type: "longtext",
        value: SECRETS.gmNotes,
      },
    ],
  };
}

const json = (value: unknown) => JSON.stringify(value);

describe("nothing is shared by default", () => {
  it.each([
    ["no catalogue settings at all", undefined],
    ["a catalogue that is switched off", false],
  ])("%s", (_name, published) => {
    const sheet = gmSheet(published);
    expect(projectCatalogueFields(sheet.fields)).toEqual([]);
    expect(projectShopSheetForPlayers(sheet)).toBeNull();
  });

  it("does not share a private shop's sheet with guests, and says so explicitly", () => {
    const result = sanitizeSheetForGuests(gmSheet(false));
    expect(result).toEqual(WITHDRAWN_SHEET);
    expect(json(result)).not.toContain("CANARY");
  });

  it("gives a withdrawn sheet that is a fresh object each time", () => {
    const first = sanitizeSheetForGuests(gmSheet(false));
    const second = sanitizeSheetForGuests(gmSheet(false));
    expect(first).not.toBe(second);
    expect(first).not.toBe(WITHDRAWN_SHEET);
  });
});

describe("a published catalogue", () => {
  const shared = ["speciality", "services"];
  const projected = () => projectShopSheetForPlayers(gmSheet(true, shared))!;

  it("contains none of the GM's private data anywhere", () => {
    const out = json(projected());
    for (const [name, secret] of Object.entries(SECRETS)) {
      expect(out, name).not.toContain(secret);
    }
  });

  it("shares only the business details the GM chose", () => {
    const ids = projected().fields.map((f) => f.id);
    expect(ids).toEqual(["speciality", "services", "stock"]);
  });

  it("shows public lines with price, quantity, condition and availability", () => {
    const stock = projected().fields.find((f) => f.id === "stock")!;
    expect(stock.rows).toEqual([
      {
        name: "Hempen rope",
        stock: {
          kind: "item",
          quantity: 5,
          price: gp(2),
          condition: "Good",
          availability: "available",
        },
      },
      { name: "Item", stock: { kind: "item", quantity: 1, price: gp(5) } },
    ]);
  });

  it("has no editable surface: no links, no row ids, one plain column", () => {
    const stock = projected().fields.find((f) => f.id === "stock")!;
    expect(stock.linkVaultItems).toBe(false);
    expect(stock.columns).toEqual([
      { id: "name", label: "Item", type: "text" },
    ]);
    expect(stock.tradeLog).toBeUndefined();
    expect(stock.playerCatalogue).toBeUndefined();
    expect(projected().presentationTemplateId).toBeNull();
  });

  it("never shares purchasing power or GM notes, even if the settings list them", () => {
    const sheet = gmSheet(true, ["funds", "gm_notes", "owner"]);
    const out = projectShopSheetForPlayers(sheet)!;
    const text = json(out);
    expect(text).not.toContain(SECRETS.funds);
    expect(text).not.toContain(SECRETS.gmNotes);
    // Owner is on the shareable list, so listing it does share it.
    expect(text).toContain(SECRETS.owner);
    expect(SHAREABLE_SHEET_FIELD_IDS).not.toContain("funds");
    expect(SHAREABLE_SHEET_FIELD_IDS).not.toContain("gm_notes");
  });

  it("shares no details at all when none are chosen", () => {
    const out = projectShopSheetForPlayers(gmSheet(true, []))!;
    expect(out.fields.map((f) => f.id)).toEqual(["stock"]);
  });

  it("skips a chosen detail that is empty or not text", () => {
    const sheet = gmSheet(true, ["speciality", "reputation"]);
    sheet.fields = sheet.fields.map((f) =>
      f.id === "speciality" ? { ...f, value: "   " } : f,
    );
    const out = projectShopSheetForPlayers(sheet)!;
    expect(out.fields.map((f) => f.id)).toEqual(["reputation", "stock"]);
    const numberField = gmSheet(true, ["speciality"]);
    numberField.fields = numberField.fields.map((f) =>
      f.id === "speciality" ? { ...f, type: "number", value: 4 } : f,
    );
    expect(
      projectShopSheetForPlayers(numberField)!.fields.map((f) => f.id),
    ).toEqual(["stock"]);
  });

  it("shares a published shop with no stock lines as an empty catalogue", () => {
    const sheet = gmSheet(true);
    sheet.fields = sheet.fields.map((f) =>
      f.id === "stock" ? { ...f, rows: [] } : f,
    );
    const stock = projectShopSheetForPlayers(sheet)!.fields[0];
    expect(stock.rows).toEqual([]);
  });

  it("drops a price that is not valid money", () => {
    const sheet = gmSheet(true);
    const ledger = sheet.fields.find((f) => f.id === "stock")!;
    ledger.rows = [
      {
        name: "Odd",
        stock: { price: { units: 1.5, currency: "gp", precision: 0 } },
      },
    ] as unknown as StatSheetField["rows"];
    const stock = projectShopSheetForPlayers(sheet)!.fields.find(
      (f) => f.id === "stock",
    )!;
    expect(stock.rows).toEqual([{ name: "Odd", stock: {} }]);
  });

  it("shares no references with the GM's sheet", () => {
    const source = gmSheet(true, shared);
    const before = json(source);
    const out = projectShopSheetForPlayers(source)!;
    (out.fields[0] as { value: string }).value = "tampered";
    const stock = out.fields.find((f) => f.id === "stock")!;
    (stock.rows![0] as { name: string }).name = "tampered";
    expect(json(source)).toBe(before);
  });
});

describe("linked item names", () => {
  it("uses a line's own name before anything linked", () => {
    const sheet = gmSheet(true);
    const out = projectShopSheetForPlayers(sheet, {
      resolveName: () => "Linked title",
    })!;
    const rows = out.fields.find((f) => f.id === "stock")!.rows!;
    expect((rows[0] as { name: string }).name).toBe("Hempen rope");
    expect((rows[1] as { name: string }).name).toBe("Linked title");
  });

  it("reads only the title from a linked item, and never exposes its id", () => {
    const seen: string[] = [];
    const out = projectShopSheetForPlayers(gmSheet(true), {
      resolveName: (id) => {
        seen.push(id);
        return "Lantern";
      },
    })!;
    expect(seen).toEqual([SECRETS.linkedId]);
    expect(json(out)).not.toContain(SECRETS.linkedId);
  });

  it("falls back to a neutral name when the item is gone or has no title", () => {
    const out = projectShopSheetForPlayers(gmSheet(true), {
      resolveName: () => undefined,
    })!;
    const rows = out.fields.find((f) => f.id === "stock")!.rows!;
    expect((rows[1] as { name: string }).name).toBe("Item");
  });
});

describe("sanitizeSheetForGuests", () => {
  it("replaces a published shop with its player catalogue", () => {
    const out = sanitizeSheetForGuests(gmSheet(true, ["services"]))!;
    expect(out.fields.map((f) => f.id)).toEqual(["services", "stock"]);
    expect(json(out)).not.toContain("CANARY-GM-NOTES");
  });

  it("withdraws a shop that was published and then switched off", () => {
    const published = sanitizeSheetForGuests(gmSheet(true));
    expect(published!.fields.length).toBeGreaterThan(0);
    const withdrawn = sanitizeSheetForGuests(gmSheet(false));
    expect(withdrawn).toEqual({ templateId: null, fields: [] });
  });

  it("passes other sheets through without their trade history", () => {
    const sheet: StatSheet = {
      templateId: null,
      fields: [
        { id: "hp", label: "HP", type: "counter", value: 8 },
        {
          id: "w",
          key: "wallet_gp",
          label: "Gold",
          type: "number",
          value: 20,
          tradeLog: [trade],
        },
      ],
    };
    const out = sanitizeSheetForGuests(sheet)!;
    expect(out.fields[0]).toEqual(sheet.fields[0]);
    expect(out.fields[1]).toMatchObject({ id: "w", value: 20 });
    expect(out.fields[1]).not.toHaveProperty("tradeLog");
    // The GM's own sheet keeps its history.
    expect(sheet.fields[1].tradeLog).toHaveLength(1);
  });

  it("never sends market history or the GM's reasons to players (#3966)", () => {
    const sheet = gmSheet(true);
    const history = [
      {
        id: "m1",
        label: "CANARY-MARKET-LABEL",
        reason: "CANARY-MARKET-REASON",
        cause: { kind: "signal" as const, source: "CANARY-MARKET-SOURCE" },
        at: "2026-10-13T00:00:00.000Z",
        status: "applied" as const,
        rows: [
          {
            rowId: "r1",
            name: "CANARY-MARKET-ROW",
            price: { before: gp(1), after: gp(9) },
          },
        ],
      },
    ];
    sheet.fields = sheet.fields.map((f) =>
      f.stockLedger ? { ...f, marketHistory: history } : f,
    );
    const shop = JSON.stringify(sanitizeSheetForGuests(sheet));
    expect(shop).not.toContain("CANARY-MARKET");
    expect(shop).not.toContain("marketHistory");

    const other: StatSheet = {
      templateId: null,
      fields: [
        {
          id: "w",
          label: "Gold",
          type: "number",
          value: 1,
          marketHistory: history,
        },
      ],
    };
    expect(JSON.stringify(sanitizeSheetForGuests(other))).not.toContain(
      "CANARY-MARKET",
    );
  });

  it("leaves an absent sheet absent", () => {
    expect(sanitizeSheetForGuests(undefined)).toBeUndefined();
  });

  it("recognises a ledger by its shape, not by the template", () => {
    const sheet = gmSheet(true);
    sheet.templateId = "some-deleted-template";
    expect(hasStockLedger(sheet)).toBe(true);
    expect(json(sanitizeSheetForGuests(sheet))).not.toContain("CANARY");
    const bare = { templateId: null, fields: [] } as StatSheet;
    expect(hasStockLedger(bare)).toBe(false);
  });

  it("projects the demo merchant without its hidden ring or its note", () => {
    const demo = createDemoMerchantSheet();
    const ledger = demo.fields.find((f) => f.id === "stock")!;
    ledger.playerCatalogue = { published: true, fields: ["services"] };
    const out = json(sanitizeSheetForGuests(demo));
    expect(out).not.toContain("Signet ring");
    expect(out).not.toContain("Do not mention");
    expect(out).not.toContain("back room");
    expect(out).toContain("Hempen rope");
  });
});

describe("capability projection for players", () => {
  it("is what the stock-table capability hands a player audience", async () => {
    const { STOCK_TABLE_PROJECTOR } = await import("./catalogue-capability");
    const registry = new SheetCapabilityRegistry();
    registry.register({
      id: "stock-table",
      label: "Stock table",
      project: STOCK_TABLE_PROJECTOR,
    });
    const sheet = gmSheet(true, ["services"]);
    const player = projectEntitySheet(
      sheet,
      SHOP_MERCHANT_TEMPLATE,
      "player",
      registry,
    );
    expect(player.fields.map((f) => f.id)).toEqual(["services", "stock"]);
    expect(json(player.fields)).not.toContain("CANARY");

    const gm = projectEntitySheet(
      sheet,
      SHOP_MERCHANT_TEMPLATE,
      "gm",
      registry,
    );
    expect(json(gm.fields)).toContain(SECRETS.gmNotes);
  });

  it("gives a player nothing from an unpublished shop", async () => {
    const { STOCK_TABLE_PROJECTOR } = await import("./catalogue-capability");
    const registry = new SheetCapabilityRegistry();
    registry.register({
      id: "stock-table",
      label: "Stock table",
      project: STOCK_TABLE_PROJECTOR,
    });
    const player = projectEntitySheet(
      gmSheet(false),
      SHOP_MERCHANT_TEMPLATE,
      "player",
      registry,
    );
    expect(player.fields).toEqual([]);
  });
});
